import React, { useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
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

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Lazy-init AudioContext on user interaction
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  // Expose spin action via imperative ref
  useImperativeHandle(ref, () => ({
    spin: () => startSpin(),
    isSpinning: () => isSpinningRef.current
  }));

  const numSegments = participants.length;

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

      // Segment Typography
      ctx.save();
      const textRadius = wheelRadius * 0.62;
      ctx.translate(
        Math.cos(angle + arc / 2) * textRadius,
        Math.sin(angle + arc / 2) * textRadius
      );
      ctx.rotate(angle + arc / 2 + Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Drop shadow for legibility
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetY = 1.5;
      ctx.fillStyle = '#FFFFFF';

      const fontSize = numSegments > 36 ? 9 : numSegments > 24 ? 10 : numSegments > 16 ? 11 : numSegments > 10 ? 12 : 13.5;
      ctx.font = `600 ${fontSize}px "Inter", system-ui, -apple-system, sans-serif`;

      let displayName = participants[i]?.name || '';
      const maxChars = numSegments > 24 ? 10 : numSegments > 16 ? 14 : 18;
      if (displayName.length > maxChars) displayName = displayName.slice(0, maxChars - 1) + '…';

      ctx.fillText(displayName, 0, 0);

      // Subtle inner rim dot
      ctx.shadowColor = 'transparent';
      ctx.beginPath();
      ctx.arc(0, -textRadius * 0.45, 2, 0, 2 * Math.PI);
      ctx.fillStyle = theme.accent;
      ctx.fill();

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
    const maxPegs = Math.min(numSegments, 32);
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
  }, [numSegments, participants, soundEnabled]);

  // =========================================================================
  // 8. AMBIENT AUTOMATIC SLOW CONTINUOUS IDLE ROTATION
  // =========================================================================
  useEffect(() => {
    let lastTime = performance.now();

    const idleLoop = (now) => {
      const delta = now - lastTime;
      lastTime = now;

      // Only spin automatically when not actively spinning, not paused by dialog, and has participants
      if (!isSpinningRef.current && !isPausedRef.current && numSegments > 0) {
        // Hypnotic luxury turn: ~0.00042 rad/ms (~24s per full rotation)
        const idleSpeed = 0.00042;
        currentRotationRef.current = (currentRotationRef.current + idleSpeed * delta) % (2 * Math.PI);
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
  }, [drawWheel, numSegments]);

  // Initial draw
  useEffect(() => {
    drawWheel(currentRotationRef.current);
  }, [drawWheel]);

  // =========================================================================
  // 9. HIGH-PRECISION USER SPIN DECELERATION PHYSICS
  // =========================================================================
  const startSpin = () => {
    if (isSpinningRef.current || numSegments === 0) return;
    if (numSegments === 1) {
      if (onSpinStart) onSpinStart();
      isSpinningRef.current = false;
      if (onSpinEnd) {
        onSpinEnd(participants[0]);
      }
      return;
    }
    initAudio();
    isSpinningRef.current = true;
    if (onSpinStart) onSpinStart();

    // 1. Choose winning index mathematically before animation
    const winningIndex = Math.floor(Math.random() * numSegments);
    const winner = participants[winningIndex];

    // 2. Calculate exact target angle (Pointer is at top: -PI / 2)
    const arc = (2 * Math.PI) / numSegments;
    const targetSegmentCenter = winningIndex * arc + arc / 2;
    // Add subtle jitter inside segment wedge so it doesn't land on dead center every time
    const jitter = (Math.random() - 0.5) * (arc * 0.55);
    const targetAngleAtPointer = -Math.PI / 2 - targetSegmentCenter + jitter;

    // Normalizing rotations (6-9 full high-speed spins)
    const minFullRotations = 6 + Math.floor(Math.random() * 3);
    const normalizedCurrent = currentRotationRef.current % (2 * Math.PI);
    let delta = (targetAngleAtPointer - normalizedCurrent) % (2 * Math.PI);
    if (delta < 0) delta += 2 * Math.PI;

    const totalRotation = minFullRotations * 2 * Math.PI + delta;
    const startAngle = currentRotationRef.current;
    const finalAngle = startAngle + totalRotation;

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
        if (onSpinEnd) {
          onSpinEnd(winner);
        }
      }
    };

    animFrameIdRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width: 440, height: 440 }}
        className="max-w-full h-auto drop-shadow-[0_20px_45px_rgba(0,0,0,0.65)] select-none cursor-pointer active:scale-[0.99] transition-transform"
        onClick={() => startSpin()}
        title="Click wheel to spin"
      />
    </div>
  );
});

export default WheelCanvas;
