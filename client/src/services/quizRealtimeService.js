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
  }

  /**
   * Initialize a room channel for either Host or Participant
   */
  joinRoom(pin, role = 'participant', participantData = null) {
    this.leaveRoom();
    this.currentPin = pin;

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
            broadcast: { ack: true },
            presence: { key: participantData?.id || (role === 'host' ? 'host' : `player_${Date.now()}`) }
          }
        });

        // Listen for all broadcast events
        this.activeChannel
          .on('broadcast', { event: '*' }, (payload) => {
            const eventName = payload.event;
            const data = payload.payload;
            this._notifyListeners(eventName, data);
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED' && participantData) {
              await this.activeChannel.track({
                id: participantData.id,
                name: participantData.name,
                role,
                joinedAt: Date.now()
              });
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
    // Dispatch to local listeners
    this._notifyListeners(eventType, payload);

    // Send via local BroadcastChannel
    if (this.localBroadcast) {
      try {
        this.localBroadcast.postMessage({ type: eventType, payload });
      } catch (_) {}
    }

    // Send via Supabase channel
    if (this.activeChannel) {
      try {
        this.activeChannel.send({
          type: 'broadcast',
          event: eventType,
          payload
        });
      } catch (err) {
        console.warn('Failed to broadcast via Supabase:', err);
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
  leaveRoom() {
    if (this.activeChannel && supabase) {
      try {
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
    this.listeners.clear();
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

