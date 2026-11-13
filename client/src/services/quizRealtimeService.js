import { supabase } from '../lib/supabase';

// In-memory / localStorage cache key for live quiz sessions
const SESSION_CACHE_KEY = 'eventora_live_quiz_session';

/**
 * Generate a random 6-digit room PIN
 */
export function generateRoomPin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Quiz Realtime Service
 * Handles instant synchronization between the Host and connected Participant devices.
 * Uses Supabase Broadcast Channels (WebSockets) with native BroadcastChannel fallback.
 */
class QuizRealtimeService {
  constructor() {
    this.activeChannel = null;
    this.currentPin = null;
    this.localBroadcast = null;
    this.listeners = new Map();
    this.seenMids = new Set();
    this.isSubscribed = false;
    this.sendQueue = [];
  }

  /**
   * Initialize a room channel for either Host or Participant
   */
  joinRoom(pin, role = 'participant', participantData = null) {
    if (this.currentPin === pin && this.activeChannel) {
      return true;
    }

    this.leaveRoom();
    this.currentPin = pin;
    this.isSubscribed = false;
    this.sendQueue = [];

    const channelName = `quiz_room_${pin}`;

    // 1. Native BroadcastChannel for local/multi-tab fallback
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.localBroadcast = new BroadcastChannel(channelName);
        this.localBroadcast.onmessage = (event) => {
          if (event?.data?.type) {
            this._notifyListeners(event.data.type, event.data.payload);
          }
        };
      }
    } catch (_) {}

    // 2. Supabase Realtime Channel
    if (supabase) {
      try {
        this.activeChannel = supabase.channel(channelName, {
          config: {
            broadcast: { ack: false, self: false },
            presence: { key: participantData?.id || (role === 'host' ? 'host' : `player_${Date.now()}`) }
          }
        });

        const handleIncoming = (evName, msg) => {
          const data = msg?.payload !== undefined ? msg.payload : msg;
          this._notifyListeners(evName, data);
        };

        // Listen for wildcard broadcast events (single listener to prevent duplicate firings)
        this.activeChannel.on('broadcast', { event: '*' }, (payload) => {
          const eventName = payload?.event || payload?.type;
          if (eventName) {
            handleIncoming(eventName, payload);
          }
        });

        // Listen for Supabase presence leave (client disconnected / tab closed)
        this.activeChannel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
          (leftPresences || []).forEach((p) => {
            if (p?.id) {
              this._notifyListeners('PLAYER_LEFT', { id: p.id, name: p.name });
            }
          });
        });

        // Listen for Supabase presence join
        this.activeChannel.on('presence', { event: 'join' }, ({ newPresences }) => {
          (newPresences || []).forEach((p) => {
            if (p?.id && p?.role === 'participant') {
              this._notifyListeners('PLAYER_JOINED', { id: p.id, name: p.name });
            }
          });
        });

        this.activeChannel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            this.isSubscribed = true;
            if (participantData) {
              try {
                await this.activeChannel.track({
                  id: participantData.id,
                  name: participantData.name,
                  role,
                  joinedAt: Date.now()
                });
              } catch (_) {}
            }
            // Flush any broadcasts queued while establishing WebSocket connection
            if (this.sendQueue.length > 0) {
              const pending = [...this.sendQueue];
              this.sendQueue = [];
              pending.forEach(({ eventType, fullPayload }) => {
                try {
                  this.activeChannel.send({
                    type: 'broadcast',
                    event: eventType,
                    payload: fullPayload
                  }).catch((err) => {
                    console.warn('Failed to broadcast queued message via Supabase:', err);
                  });
                } catch (_) {}
              });
            }
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            this.isSubscribed = false;
          }
        });
      } catch (err) {
        console.warn('Supabase Realtime not available, using local channel:', err);
      }
    }

    return true;
  }

  /**
   * Broadcast an event to everyone in the room
   */
  broadcast(eventType, payload) {
    // Attach unique message id for strict deduplication
    const mid = payload?._mid || `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const fullPayload = { ...(payload || {}), _mid: mid };

    // Dispatch to local listeners
    this._notifyListeners(eventType, fullPayload);

    // Send via local BroadcastChannel
    if (this.localBroadcast) {
      try {
        this.localBroadcast.postMessage({ type: eventType, payload: fullPayload });
      } catch (_) {}
    }

    // Send via Supabase channel over pure WebSocket
    if (this.activeChannel) {
      if (this.isSubscribed) {
        try {
          this.activeChannel.send({
            type: 'broadcast',
            event: eventType,
            payload: fullPayload
          }).catch((err) => {
            console.warn('Failed to broadcast via Supabase:', err);
          });
        } catch (err) {
          console.warn('Failed to broadcast via Supabase:', err);
        }
      } else {
        // WebSocket handshake is still connecting; queue message so it sends over pure WebSocket with no REST fallback warning
        this.sendQueue.push({ eventType, fullPayload });
      }
    }
  }

  /**
   * Subscribe to specific room events (e.g. 'STATE_UPDATE', 'SUBMIT_ANSWER', 'PLAYER_JOINED')
   */
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);

    return () => {
      const set = this.listeners.get(eventType);
      if (set) {
        set.delete(callback);
      }
    };
  }

  _notifyListeners(eventType, payload) {
    // Deduplicate identical messages arriving via both local BroadcastChannel & Supabase WebSocket
    if (payload?._mid) {
      if (this.seenMids.has(payload._mid)) {
        return; // Drop duplicate message!
      }
      this.seenMids.add(payload._mid);
      if (this.seenMids.size > 400) {
        const oldest = this.seenMids.values().next().value;
        this.seenMids.delete(oldest);
      }
    }

    const set = this.listeners.get(eventType);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(payload);
        } catch (e) {
          console.error(`Error in listener for ${eventType}:`, e);
        }
      });
    }
    // Also trigger wildcard '*'
    const wildcard = this.listeners.get('*');
    if (wildcard) {
      wildcard.forEach((cb) => {
        try {
          cb(eventType, payload);
        } catch (_) {}
      });
    }
  }

  /**
   * Clean up and leave room
   */
  leaveRoom(participantData = null) {
    if (participantData?.id) {
      try {
        this.broadcast('PLAYER_LEFT', { id: participantData.id, name: participantData.name });
      } catch (_) {}
    }
    if (this.activeChannel && supabase) {
      try {
        this.activeChannel.untrack().catch(() => {});
        supabase.removeChannel(this.activeChannel);
      } catch (_) {}
      this.activeChannel = null;
    }
    if (this.localBroadcast) {
      try {
        this.localBroadcast.close();
      } catch (_) {}
      this.localBroadcast = null;
    }
    this.currentPin = null;
    this.isSubscribed = false;
    this.sendQueue = [];
    this.listeners.clear();
    this.seenMids.clear();
  }

  /**
   * Session caching to recover state if refreshed
   */
  saveSessionState(pin, state) {
    try {
      localStorage.setItem(`${SESSION_CACHE_KEY}_${pin}`, JSON.stringify(state));
    } catch (_) {}
  }

  loadSessionState(pin) {
    try {
      const raw = localStorage.getItem(`${SESSION_CACHE_KEY}_${pin}`);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  clearSessionState(pin) {
    try {
      localStorage.removeItem(`${SESSION_CACHE_KEY}_${pin}`);
    } catch (_) {}
  }
}

export const quizRealtimeService = new QuizRealtimeService();

