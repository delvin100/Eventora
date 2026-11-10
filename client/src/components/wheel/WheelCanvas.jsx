import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { playTickSound } from './audio/wheelAudio';

// Luxury satin segment color palettes with highlights & shadows for realistic 3D depth
const SEGMENT_THEMES = [
  { primary: '#5E52FF', light: '#7F75FF', dark: '#382EC7', accent: '#A59EFF' }, // Electric Royal Violet
  { primary: '#059669', light: '#10B981', dark: '#047857', accent: '#6EE7B7' }, // Emerald Jade
  { primary: '#EA580C', light: '#F97316', dark: '#C2410C', accent: '#FDBA74' }, // Sunset Coral
  { primary: '#D946EF', light: '#E879F9', dark: '#A21CAF', accent: '#F5D0FE' }, // Neon Orchid
  { primary: '#2563EB', light: '#3B82F6', dark: '#1D4ED8', accent: '#93C5FD' }, // Sapphire Blue
  { primary: '#7C3AED', light: '#8B5CF6', dark: '#5B21B6', accent: '#C4B5FD' }, // Deep Amethyst
  { primary: '#0D9488', light: '#14B8A6', dark: '#0F766E', accent: '#5EEAD4' }, // Cyber Mint
  { primary: '#D97706', light: '#F59E0B', dark: '#B45309', accent: '#FDE68A' }, // Warm Amber
  { primary: '#E11D48', light: '#F43F5E', dark: '#9F1239', accent: '#FDA4AF' }, // Rose Crimson
  { primary: '#0891B2', light: '#06B6D4', dark: '#155E75', accent: '#67E8F9' }, // Cyan Teal
  { primary: '#4F46E5', light: '#6366F1', dark: '#3730A3', accent: '#A5B4FC' }, // Indigo
  { primary: '#16A34A', light: '#22C55E', dark: '#166534', accent: '#86EFAC' }, // Forest Green
];

// Web Audio API synthesized mechanical ticker click
function playMechanicalClick(audioCtxRef) {
  try {
    const ctx = audioCtxRef.current;
    if (!ctx || ctx.state !== 'running') {
      playTickSound();
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.022);

    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.022);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.025);
  } catch {
    playTickSound();
  }
}

// Helper to intelligently format long names or 2/3-word names across two lines
// so that all parts (first, middle, last name) are completely visible without cutoffs or ellipses
function splitNameForWheel(name) {
  if (!name) return [''];
  const trimmed = name.trim();
  if (trimmed.length <= 13) return [trimmed];

  const words = trimmed.split(/\s+/);
  if (words.length === 1) {
    return [trimmed];
  }
  if (words.length === 2) {
    if (trimmed.length <= 14) return [trimmed];
    return [words[0], words[1]];
  }

  // 3 or more words: e.g. ["Pradeep", "Kumar", "Sharma"]
  const opt1L1 = words.slice(0, 2).join(' ');
  const opt1L2 = words.slice(2).join(' ');
  const opt2L1 = words[0];
  const opt2L2 = words.slice(1).join(' ');

  const max1 = Math.max(opt1L1.length, opt1L2.length);
  const max2 = Math.max(opt2L1.length, opt2L2.length);
  return max1 <= max2 ? [opt1L1, opt1L2] : [opt2L1, opt2L2];
}

// Infinite Continuous Conveyor: maps continuous rotation to seamless infinite participant loop
function getParticipantForWedge(i, currentRotation, totalCount, visibleCount) {
  if (totalCount <= visibleCount) {
    return i % totalCount;
  }
  const arc = (2 * Math.PI) / visibleCount;
  const wedgeCenter = i * arc + arc / 2;
  const lap = Math.floor((currentRotation + wedgeCenter - Math.PI / 2) / (2 * Math.PI));
  const pIndex = (((-i + lap * visibleCount) % totalCount) + totalCount) % totalCount;
  return pIndex;
}

// Resolves which participant is currently under the top needle pointer (-PI / 2)
function getParticipantAtPointer(currentRotation, totalCount, visibleCount) {
  const arc = (2 * Math.PI) / visibleCount;
  const pointerAngle = -Math.PI / 2;
  const angleAtPointer = (((pointerAngle - (currentRotation % (2 * Math.PI))) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const currentWedge = Math.floor(angleAtPointer / arc) % visibleCount;
  return getParticipantForWedge(currentWedge, currentRotation, totalCount, visibleCount);
}

// Fisher-Yates array shuffle helper to ensure names on wheel are randomized and never in static order
function shuffleArray(items) {
  if (!Array.isArray(items) || items.length <= 1) return items ? [...items] : [];
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const WheelCanvas = forwardRef(function WheelCanvas(
  {
    participants = [],
    duration = 5,
    soundEnabled = true,
    isPaused = false,
    onSpinStart,
    onSpinEnd,
    className = ''
  },
  ref
) {
  const canvasRef = useRef(null);
  const currentRotationRef = useRef(0);
  const isSpinningRef = useRef(false);
  const isPausedRef = useRef(isPaused);
  const animFrameIdRef = useRef(null);
  const idleFrameIdRef = useRef(null);
  const lastPegIndexRef = useRef(-1);
  const flapperDeflectionRef = useRef(0); // Physical spring angle of the stopper
  const audioCtxRef = useRef(null);

  // Maintain randomized/shuffled pool so names are never in predictable alphabetical/input order
  const [shuffledParticipants, setShuffledParticipants] = useState(() => shuffleArray(participants));

  useEffect(() => {
    setShuffledParticipants(shuffleArray(participants));
  }, [participants]);

  const pool = shuffledParticipants.length === participants.length ? shuffledParticipants : participants;

  const MAX_VISIBLE = 12; // Cap visible wheel segments to 12 wide, clear slices
  const isRolling = pool.length > MAX_VISIBLE;
  const numSegments = isRolling ? MAX_VISIBLE : pool.length;

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Lazy-init AudioContext on user interaction
  const initAudio = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          audioCtxRef.current = new AudioCtx();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
    } catch {
      // AudioContext could fail gracefully
    }
  };

  // Expose spin action via imperative ref
  useImperativeHandle(ref, () => ({
    spin: () => startSpin(),
    reshuffle: () => setShuffledParticipants(shuffleArray(participants)),
    isSpinning: () => isSpinningRef.current
  }));

  const drawWheel = useCallback((rotation) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const dpr = window.devicePixelRatio || 1;
    const size = 460;

    if (canvas.width !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const centerX = size / 2;
    const centerY = size / 2;
    const outerBezelRadius = size / 2 - 14;
    const pegTrackRadius = outerBezelRadius - 15;
    const wheelRadius = pegTrackRadius - 8;

    // Handle empty state
    if (numSegments === 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerBezelRadius, 0, 2 * Math.PI);
      ctx.fillStyle = '#141622';
      ctx.fill();
      ctx.strokeStyle = '#2B3042';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 15px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No eligible participants', centerX, centerY);
      ctx.restore();
      return;
    }

    const arc = (2 * Math.PI) / numSegments;

    // =========================================================================
    // 1. RECESSED SHADOW & AMBIENT PEDESTAL GLOW
    // =========================================================================
    const ambientGlow = ctx.createRadialGradient(
      centerX, centerY, wheelRadius * 0.7,
      centerX, centerY, outerBezelRadius + 14
    );
    ambientGlow.addColorStop(0, 'rgba(99, 91, 255, 0)');
    ambientGlow.addColorStop(0.85, 'rgba(99, 91, 255, 0.18)');
    ambientGlow.addColorStop(1, 'rgba(0, 0, 0, 0.55)');

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerBezelRadius + 8, 0, 2 * Math.PI);
    ctx.fillStyle = ambientGlow;
    ctx.fill();

    // =========================================================================
    // 2. LUXURY HEAVY METALLIC BEZEL (Gunmetal / Brushed Steel with Bevels)
    // =========================================================================
    const bezelGrad = ctx.createRadialGradient(
      centerX - 60, centerY - 60, 40,
      centerX, centerY, outerBezelRadius
    );
    bezelGrad.addColorStop(0, '#3D4459');
    bezelGrad.addColorStop(0.4, '#1F2332');
    bezelGrad.addColorStop(0.7, '#141622');
    bezelGrad.addColorStop(1, '#2B3042');

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerBezelRadius, 0, 2 * Math.PI);
    ctx.fillStyle = bezelGrad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 12;
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Specular Rim Highlight (Top-left light reflection)
    const rimHighlight = ctx.createLinearGradient(
      centerX - outerBezelRadius, centerY - outerBezelRadius,
      centerX + outerBezelRadius, centerY + outerBezelRadius
    );
    rimHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    rimHighlight.addColorStop(0.25, 'rgba(255, 255, 255, 0.05)');
    rimHighlight.addColorStop(0.6, 'rgba(0, 0, 0, 0.6)');
    rimHighlight.addColorStop(1, 'rgba(255, 255, 255, 0.2)');

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerBezelRadius, 0, 2 * Math.PI);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = rimHighlight;
    ctx.stroke();

    // Peg Track Groove (Dark inset metallic groove where pins sit)
    ctx.beginPath();
    ctx.arc(centerX, centerY, pegTrackRadius + 3.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#0F1118';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.stroke();

    // Inner Bezel Gold/Violet Micro-Trim
    ctx.beginPath();
    ctx.arc(centerX, centerY, wheelRadius + 1.5, 0, 2 * Math.PI);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(168, 140, 255, 0.55)';
    ctx.stroke();

    // =========================================================================
    // 3. ROTATING WHEEL BODY (3D Satin Segments + Convex Depth)
    // =========================================================================
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);

    // Render segments
    for (let i = 0; i < numSegments; i++) {
      const angle = i * arc;
      const theme = SEGMENT_THEMES[i % SEGMENT_THEMES.length];

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, wheelRadius, angle, angle + arc);
      ctx.lineTo(0, 0);

      // Realistic 3D radial depth gradient
      const segGrad = ctx.createRadialGradient(
        0, 0, wheelRadius * 0.15,
        Math.cos(angle + arc / 2) * (wheelRadius * 0.55),
        Math.sin(angle + arc / 2) * (wheelRadius * 0.55),
        wheelRadius
      );
      segGrad.addColorStop(0, theme.dark);
      segGrad.addColorStop(0.35, theme.primary);
      segGrad.addColorStop(0.75, theme.light);
      segGrad.addColorStop(1, theme.dark);

      ctx.fillStyle = segGrad;
      ctx.fill();

      // 3D engraved divider lines (Highlight + Shadow = Inset metal ridge)
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * wheelRadius, Math.sin(angle) * wheelRadius);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.stroke();

      // Divider drop shadow
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle + 0.015) * wheelRadius, Math.sin(angle + 0.015) * wheelRadius);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.stroke();

      const midAngle = angle + arc / 2;

      // Subtle inner rim dot (present on every segment, centered on spoke)
      ctx.save();
      ctx.beginPath();
      const dotRadius = wheelRadius * 0.30;
      ctx.arc(
        Math.cos(midAngle) * dotRadius,
        Math.sin(midAngle) * dotRadius,
        2.8, 0, 2 * Math.PI
      );
      ctx.fillStyle = theme.accent;
      ctx.fill();
      ctx.restore();

      // Segment Typography (Radial along the slice centerline, always upright)
      ctx.save();
      ctx.rotate(midAngle);

      // Radial placement: centered in the spacious portion of the wedge
      const textRadius = wheelRadius * 0.60;
      ctx.translate(textRadius, 0);

      // Prevent upside-down text on the left/western hemisphere of the wheel
      const screenAngle = ((rotation + midAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      if (screenAngle > Math.PI / 2 && screenAngle < (3 * Math.PI) / 2) {
        ctx.rotate(Math.PI);
      }

      // Drop shadow for legibility
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 1;
      ctx.fillStyle = '#FFFFFF';

      const pIndex = isRolling
        ? getParticipantForWedge(i, rotation, pool.length, MAX_VISIBLE)
        : i;
      const p = pool[pIndex];
      const displayName = p?.name?.trim() || '';

      // Auto-format long or 2/3-word names across 2 lines to ensure 100% visibility of all words
      const lines = splitNameForWheel(displayName);
      const isTwoLine = lines.length > 1;

      const longestLine = lines.reduce((max, l) => Math.max(max, l.length), 0);
      let fontSize = isTwoLine ? 10.5 : (numSegments <= 6 ? 14 : numSegments <= 8 ? 13 : numSegments <= 12 ? 12 : 11);
      if (longestLine > 16) fontSize = isTwoLine ? 9 : 10;
      else if (longestLine > 13 && !isTwoLine) fontSize = 11;

      ctx.font = `bold ${fontSize}px "Inter", system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (isTwoLine) {
        const lineSpacing = fontSize + 2.5;
        ctx.fillText(lines[0], 0, -lineSpacing / 2);
        ctx.fillText(lines[1], 0, lineSpacing / 2);
      } else {
        ctx.fillText(lines[0], 0, 0);
      }

      ctx.restore();
    }

    // Outer wheel rim lip
    ctx.beginPath();
    ctx.arc(0, 0, wheelRadius, 0, 2 * Math.PI);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.stroke();

    // =========================================================================
    // 4. METALLIC 3D STOPPER PEGS (Pins located at spoke boundaries)
    // =========================================================================
    const maxPegs = numSegments;
    for (let i = 0; i < maxPegs; i++) {
      const pegAngle = (i * (2 * Math.PI)) / maxPegs;
      const px = Math.cos(pegAngle) * pegTrackRadius;
      const py = Math.sin(pegAngle) * pegTrackRadius;

      // Peg cast shadow
      ctx.beginPath();
      ctx.arc(px + 1.2, py + 1.5, 4, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fill();

      // Peg 3D Chrome Cylinder
      ctx.beginPath();
      ctx.arc(px, py, 3.6, 0, 2 * Math.PI);
      const pegGrad = ctx.createRadialGradient(px - 1.2, py - 1.2, 0.5, px, py, 3.6);
      pegGrad.addColorStop(0, '#FFFFFF');
      pegGrad.addColorStop(0.35, '#E2E8F0');
      pegGrad.addColorStop(0.75, '#64748B');
      pegGrad.addColorStop(1, '#1E293B');
      ctx.fillStyle = pegGrad;
      ctx.fill();

      // Chrome rim
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      // Shiny specular point
      ctx.beginPath();
      ctx.arc(px - 1, py - 1, 1, 0, 2 * Math.PI);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    }

    // =========================================================================
    // 5. LUXURY SPINDLE / BEARING CENTER HUB (5-Tier)
    // =========================================================================
    // Tier 1: Heavy machined outer collar
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, 2 * Math.PI);
    const hubOuter = ctx.createLinearGradient(-36, -36, 36, 36);
    hubOuter.addColorStop(0, '#3E455B');
    hubOuter.addColorStop(0.35, '#1A1D2B');
    hubOuter.addColorStop(0.7, '#11131E');
    hubOuter.addColorStop(1, '#2D3346');
    ctx.fillStyle = hubOuter;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.lineWidth = 1.8;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.stroke();

    // Tier 2: Inset matte groove with electric purple hair-line
    ctx.beginPath();
    ctx.arc(0, 0, 27, 0, 2 * Math.PI);
    ctx.fillStyle = '#0D0F17';
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#635BFF';
    ctx.shadowColor = '#635BFF';
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowColor = 'transparent';

    // Tier 3: Machined inner disc
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, 2 * Math.PI);
    const innerDisc = ctx.createRadialGradient(-3, -3, 1, 0, 0, 20);
    innerDisc.addColorStop(0, '#2D3244');
    innerDisc.addColorStop(0.5, '#181A25');
    innerDisc.addColorStop(1, '#11131C');
    ctx.fillStyle = innerDisc;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.stroke();

    // Tier 4: Glowing Purple Jewel Core
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, 2 * Math.PI);
    const coreGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, 12);
    coreGrad.addColorStop(0, '#817AFE');
    coreGrad.addColorStop(0.6, '#635BFF');
    coreGrad.addColorStop(1, '#4338CA');
    ctx.fillStyle = coreGrad;
    ctx.fill();

    // Tier 5: Precision 4-Point Star Emblem at center
    ctx.beginPath();
    const starOuter = 7;
    const starInner = 2.2;
    for (let s = 0; s < 8; s++) {
      const sAngle = (s * Math.PI) / 4;
      const sRadius = s % 2 === 0 ? starOuter : starInner;
      const sx = Math.cos(sAngle) * sRadius;
      const sy = Math.sin(sAngle) * sRadius;
      if (s === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowBlur = 5;
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.restore(); // Restore wheel rotation context

    // =========================================================================
    // 6. CRYSTAL ACRYLIC / GLASS SURFACE SHEEN REFLECTION
    // =========================================================================
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, wheelRadius, 0, 2 * Math.PI);
    ctx.clip();

    const glassGlare = ctx.createLinearGradient(
      centerX, centerY - wheelRadius,
      centerX, centerY + wheelRadius * 0.2
    );
    glassGlare.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
    glassGlare.addColorStop(0.45, 'rgba(255, 255, 255, 0.04)');
    glassGlare.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.beginPath();
    ctx.ellipse(
      centerX, centerY - wheelRadius * 0.35,
      wheelRadius * 0.9, wheelRadius * 0.55,
      0, 0, 2 * Math.PI
    );
    ctx.fillStyle = glassGlare;
    ctx.fill();
    ctx.restore();

    // =========================================================================
    // 7. REALISTIC MECHANICAL FLAPPER / NEEDLE WITH SPRING DEFLECTION
    // =========================================================================
    const pointerAngle = -Math.PI / 2;
    const normalizedRot = (rotation % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const pegSpacing = (2 * Math.PI) / numSegments;
    const currentPegRaw = (pointerAngle - normalizedRot) / pegSpacing;
    const currentPeg = Math.floor(currentPegRaw);

    if (currentPeg !== lastPegIndexRef.current) {
      lastPegIndexRef.current = currentPeg;
      flapperDeflectionRef.current = 0.28; // Spring deflection
      if (soundEnabled && isSpinningRef.current) {
        playMechanicalClick(audioCtxRef);
      }
    }

    // Spring physics decay
    flapperDeflectionRef.current *= 0.82;

    ctx.save();
    const flapperPivotY = centerY - outerBezelRadius + 6;
    ctx.translate(centerX, flapperPivotY);
    ctx.rotate(flapperDeflectionRef.current);

    // Flapper drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;

    // Sleek Ruby-Metallic Flapper Needle
    ctx.beginPath();
    ctx.moveTo(-12, -18);
    ctx.lineTo(12, -18);
    ctx.lineTo(0, 26);
    ctx.closePath();

    const flapperGrad = ctx.createLinearGradient(0, -18, 0, 26);
    flapperGrad.addColorStop(0, '#FF4D4D');
    flapperGrad.addColorStop(0.5, '#EF4444');
    flapperGrad.addColorStop(0.85, '#B91C1C');
    flapperGrad.addColorStop(1, '#7F1D1D');
    ctx.fillStyle = flapperGrad;
    ctx.fill();

    // Chrome Beveled Border on Flapper
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    // Top mounting bolt / chrome rivet
    ctx.beginPath();
    ctx.arc(0, -9, 4.5, 0, 2 * Math.PI);
    const rivetGrad = ctx.createRadialGradient(-1, -10, 0.5, 0, -9, 4.5);
    rivetGrad.addColorStop(0, '#FFFFFF');
    rivetGrad.addColorStop(0.7, '#94A3B8');
    rivetGrad.addColorStop(1, '#334155');
    ctx.fillStyle = rivetGrad;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }, [numSegments, isRolling, pool, soundEnabled]);

  // =========================================================================
  // 8. AMBIENT AUTOMATIC SLOW CONTINUOUS IDLE ROTATION
  // =========================================================================
  useEffect(() => {
    let lastTime = performance.now();

    const idleLoop = (now) => {
      const delta = now - lastTime;
      lastTime = now;

      // Only spin automatically when not actively spinning, not paused by dialog, and has participants
      if (!isSpinningRef.current && !isPausedRef.current && pool.length > 0) {
        // Hypnotic luxury continuous turn: ~0.00045 rad/ms
        const idleSpeed = 0.00045;
        currentRotationRef.current += idleSpeed * delta;
        // Keep within safe numerical bounds while preserving conveyor continuity
        if (currentRotationRef.current > 100000) {
          const fullConveyorCycle = (pool.length || 1) * 2 * Math.PI;
          currentRotationRef.current %= fullConveyorCycle;
        }

        drawWheel(currentRotationRef.current);
      }

      idleFrameIdRef.current = requestAnimationFrame(idleLoop);
    };

    idleFrameIdRef.current = requestAnimationFrame(idleLoop);

    return () => {
      if (idleFrameIdRef.current) {
        cancelAnimationFrame(idleFrameIdRef.current);
      }
    };
  }, [drawWheel, pool.length]);

  // Initial draw
  useEffect(() => {
    drawWheel(currentRotationRef.current);
  }, [drawWheel]);

  // =========================================================================
  // 9. HIGH-PRECISION USER SPIN DECELERATION PHYSICS (INFINITE CONVEYOR WHEEL)
  // =========================================================================
  const startSpin = () => {
    if (isSpinningRef.current || pool.length === 0) return;
    const totalCount = pool.length;

    if (totalCount === 1) {
      if (onSpinStart) onSpinStart();
      isSpinningRef.current = false;
      if (onSpinEnd) {
        onSpinEnd(pool[0]);
      }
      return;
    }
    initAudio();
    isSpinningRef.current = true;
    if (onSpinStart) onSpinStart();

    // 1. Fairly pick winning index across entire pool (100% equal mathematical probability)
    const winningOverallIndex = Math.floor(Math.random() * totalCount);
    const winner = pool[winningOverallIndex];

    const isRollingMode = totalCount > MAX_VISIBLE;
    const visibleCount = isRollingMode ? MAX_VISIBLE : totalCount;
    const arc = (2 * Math.PI) / visibleCount;
    const startAngle = currentRotationRef.current;
    let finalAngle;

    if (!isRollingMode) {
      // Standard static wheel mode (<= 12 participants)
      const targetSegmentCenter = winningOverallIndex * arc + arc / 2;
      const jitter = (Math.random() - 0.5) * (arc * 0.45);
      const targetAngleAtPointer = -Math.PI / 2 - targetSegmentCenter + jitter;

      const minFullRotations = 6 + Math.floor(Math.random() * 3);
      const normalizedCurrent = startAngle % (2 * Math.PI);
      let delta = (targetAngleAtPointer - normalizedCurrent) % (2 * Math.PI);
      if (delta < 0) delta += 2 * Math.PI;

      const totalRotation = minFullRotations * 2 * Math.PI + delta;
      finalAngle = startAngle + totalRotation;
    } else {
      // Infinite Continuous Conveyor mode (> 12 participants):
      // Calculate current participant under top needle pointer
      const currentP = getParticipantAtPointer(startAngle, totalCount, visibleCount);
      const stepsToWinner = (((winningOverallIndex - currentP) % totalCount) + totalCount) % totalCount;

      // Add minimum full rotations so the wheel spins excitingly fast
      const minSpins = 6 + Math.floor(Math.random() * 3);
      const minSteps = minSpins * visibleCount;
      const poolRounds = Math.max(1, Math.ceil(minSteps / totalCount));
      const totalSteps = poolRounds * totalCount + stepsToWinner;

      finalAngle = startAngle + totalSteps * arc;
    }

    const spinDurationMs = (duration || 5) * 1000;
    const startTime = performance.now();

    const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / spinDurationMs, 1);

      // Realistic physics ease-out with high initial impulse: 1 - (1 - progress)^3.2
      const ease = 1 - Math.pow(1 - progress, 3.2);
      const currentAngle = startAngle + (finalAngle - startAngle) * ease;
      currentRotationRef.current = currentAngle;

      drawWheel(currentAngle);

      if (progress < 1) {
        animFrameIdRef.current = requestAnimationFrame(animate);
      } else {
        isSpinningRef.current = false;
        drawWheel(finalAngle);
        if (onSpinEnd) {
          onSpinEnd(winner);
        }
        // Reshuffle pool for next spin so slices are always randomized in different order
        setShuffledParticipants(shuffleArray(participants));
      }
    };

    animFrameIdRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className={`relative flex items-center justify-center w-full ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width: 'min(100%, 440px)', height: 'auto', aspectRatio: '1 / 1' }}
        className="max-w-full drop-shadow-[0_20px_45px_rgba(0,0,0,0.65)] select-none cursor-pointer active:scale-[0.99] transition-transform"
        onClick={() => startSpin()}
        title="Click wheel to spin"
      />
    </div>
  );
});

export default WheelCanvas;
