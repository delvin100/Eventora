import React, { useRef, useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { RotateCw } from 'lucide-react';

const SAMPLE_NAMES = [
  'Emma Watson', 'Liam Davis', 'Sophia Chen', 'Noah Miller',
  'Olivia Jones', 'Ethan Taylor', 'Ava Patel', 'Lucas Garcia'
];

// Luxury satin segment color palettes with highlights & shadows for realistic 3D depth
const SEGMENT_THEMES = [
  { primary: '#5E52FF', light: '#7F75FF', dark: '#382EC7', accent: '#A59EFF' }, // Electric Royal Violet
  { primary: '#059669', light: '#10B981', dark: '#047857', accent: '#6EE7B7' }, // Emerald Jade
  { primary: '#EA580C', light: '#F97316', dark: '#C2410C', accent: '#FDBA74' }, // Sunset Coral
  { primary: '#D946EF', light: '#E879F9', dark: '#A21CAF', accent: '#F5D0FE' }, // Neon Orchid
  { primary: '#2563EB', light: '#3B82F6', dark: '#1D4ED8', accent: '#93C5FD' }, // Sapphire Blue
  { primary: '#7C3AED', light: '#8B5CF6', dark: '#5B21B6', accent: '#C4B5FD' }, // Deep Amethyst
  { primary: '#0D9488', light: '#14B8A6', dark: '#0F766E', accent: '#5EEAD4' }, // Cyber Mint
  { primary: '#D97706', light: '#F59E0B', dark: '#B45309', accent: '#FDE68A' }  // Warm Amber
];

// Web Audio API synthesized mechanical ticker click
function playMechanicalClick(audioCtxRef) {
  try {
    const ctx = audioCtxRef.current;
    if (!ctx || ctx.state !== 'running') return;

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
    // Ignore audio errors on un-interacted contexts
  }
}

export default function MiniWheelPreview() {
  const canvasRef = useRef(null);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [hasSpun, setHasSpun] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const rotationRef = useRef(0);
  const animationFrameRef = useRef(null);
  const isSpinningRef = useRef(false);
  const hasSpunRef = useRef(false);
  const audioCtxRef = useRef(null);
  const lastPegIndexRef = useRef(-1);
  const flapperDeflectionRef = useRef(0); // Physical spring angle of the stopper

  useEffect(() => {
    isSpinningRef.current = spinning;
  }, [spinning]);

  // Lazy-init AudioContext on first user interaction
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

  // Main Canvas Render Loop
  const drawWheel = useCallback((rotation) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const dpr = window.devicePixelRatio || 1;
    const size = 400;

    if (canvas.width !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const centerX = size / 2;
    const centerY = size / 2;
    const outerBezelRadius = size / 2 - 12;
    const pegTrackRadius = outerBezelRadius - 13;
    const wheelRadius = pegTrackRadius - 7;
    const numSegments = SAMPLE_NAMES.length;
    const arc = (2 * Math.PI) / numSegments;

    // =========================================================================
    // 1. RECESSED SHADOW & AMBIENT PEDESTAL GLOW
    // =========================================================================
    const ambientGlow = ctx.createRadialGradient(centerX, centerY, wheelRadius * 0.7, centerX, centerY, outerBezelRadius + 14);
    ambientGlow.addColorStop(0, 'rgba(99, 91, 255, 0)');
    ambientGlow.addColorStop(0.85, 'rgba(99, 91, 255, 0.16)');
    ambientGlow.addColorStop(1, 'rgba(0, 0, 0, 0.5)');

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerBezelRadius + 8, 0, 2 * Math.PI);
    ctx.fillStyle = ambientGlow;
    ctx.fill();

    // =========================================================================
    // 2. LUXURY HEAVY METALLIC BEZEL (Gunmetal / Brushed Steel with Bevels)
    // =========================================================================
    // Outer Chamfer
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
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 12;
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Specular Rim Highlight (Top-left light source reflection)
    const rimHighlight = ctx.createLinearGradient(centerX - outerBezelRadius, centerY - outerBezelRadius, centerX + outerBezelRadius, centerY + outerBezelRadius);
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
    ctx.arc(centerX, centerY, pegTrackRadius + 3, 0, 2 * Math.PI);
    ctx.fillStyle = '#0F1118';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.stroke();

    // Inner Bezel Gold/Bronze Micro-Trim
    ctx.beginPath();
    ctx.arc(centerX, centerY, wheelRadius + 1.5, 0, 2 * Math.PI);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(168, 140, 255, 0.5)';
    ctx.stroke();

    // =========================================================================
    // 3. ROTATING WHEEL BODY (3D Satin Segments + Convex Depth)
    // =========================================================================
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);

    // Render 8 segments
    for (let i = 0; i < numSegments; i++) {
      const angle = i * arc;
      const theme = SEGMENT_THEMES[i % SEGMENT_THEMES.length];

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, wheelRadius, angle, angle + arc);
      ctx.lineTo(0, 0);

      // Realistic 3D radial depth gradient: lighter in middle, darker near edges & center
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

      // Realistic 3D engraved divider lines (Highlight + Shadow = Inset metal ridge)
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * wheelRadius, Math.sin(angle) * wheelRadius);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.stroke();

      // Divider drop shadow for depth
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle + 0.015) * wheelRadius, Math.sin(angle + 0.015) * wheelRadius);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.stroke();

      const midAngle = angle + arc / 2;

      // Subtle inner rim dot (consistently positioned towards center hub)
      ctx.save();
      ctx.beginPath();
      const dotRadius = wheelRadius * 0.34;
      ctx.arc(
        Math.cos(midAngle) * dotRadius,
        Math.sin(midAngle) * dotRadius,
        2.2, 0, 2 * Math.PI
      );
      ctx.fillStyle = theme.accent;
      ctx.fill();
      ctx.restore();

      // Segment Typography (Clean, modern, crisp, always correctly visible & upright)
      ctx.save();
      const textRadius = wheelRadius * 0.64;
      ctx.translate(
        Math.cos(midAngle) * textRadius,
        Math.sin(midAngle) * textRadius
      );

      // Base tangent angle (aligned along the slice's natural arc curve)
      let tangentAngle = midAngle + Math.PI / 2;

      // Determine world angle on screen (accounting for current wheel rotation)
      // If the tangent direction faces leftward (into western hemisphere, PI/2 to 3*PI/2),
      // text would be inverted/upside-down for the viewer. Flip by 180° so it's always upright & readable.
      const screenAngle = ((rotation + tangentAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      if (screenAngle > Math.PI / 2 && screenAngle < (3 * Math.PI) / 2) {
        tangentAngle += Math.PI;
      }

      ctx.rotate(tangentAngle);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Drop shadow for maximum contrast and readability
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetY = 1.5;
      ctx.fillStyle = '#FFFFFF';

      // Ensure text fits comfortably within wedge without touching segment dividers
      let fontSize = 12.5;
      ctx.font = `700 ${fontSize}px "Inter", system-ui, -apple-system, sans-serif`;
      const textWidth = ctx.measureText(SAMPLE_NAMES[i]).width;
      const maxAllowedWidth = arc * textRadius * 0.84;
      if (textWidth > maxAllowedWidth) {
        fontSize = Math.max(10, Math.floor(fontSize * (maxAllowedWidth / textWidth) * 10) / 10);
        ctx.font = `700 ${fontSize}px "Inter", system-ui, -apple-system, sans-serif`;
      }

      ctx.fillText(SAMPLE_NAMES[i], 0, 0);
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
    for (let i = 0; i < numSegments; i++) {
      const pegAngle = i * arc;
      const px = Math.cos(pegAngle) * pegTrackRadius;
      const py = Math.sin(pegAngle) * pegTrackRadius;

      // Peg cast shadow
      ctx.beginPath();
      ctx.arc(px + 1.2, py + 1.5, 3.8, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fill();

      // Peg 3D Chrome Cylinder
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, 2 * Math.PI);
      const pegGrad = ctx.createRadialGradient(px - 1.2, py - 1.2, 0.5, px, py, 3.5);
      pegGrad.addColorStop(0, '#FFFFFF');
      pegGrad.addColorStop(0.35, '#E2E8F0');
      pegGrad.addColorStop(0.75, '#64748B');
      pegGrad.addColorStop(1, '#1E293B');
      ctx.fillStyle = pegGrad;
      ctx.fill();

      // Chrome rim on peg
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      // Shiny specular point
      ctx.beginPath();
      ctx.arc(px - 1, py - 1, 0.9, 0, 2 * Math.PI);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    }

    // =========================================================================
    // 5. LUXURY SPINDLE / BEARING CENTER HUB
    // =========================================================================
    // Tier 1: Heavy machined outer collar
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, 2 * Math.PI);
    const hubOuter = ctx.createLinearGradient(-32, -32, 32, 32);
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
    ctx.arc(0, 0, 24, 0, 2 * Math.PI);
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
    ctx.arc(0, 0, 18, 0, 2 * Math.PI);
    const innerDisc = ctx.createRadialGradient(-3, -3, 1, 0, 0, 18);
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
    ctx.arc(0, 0, 11, 0, 2 * Math.PI);
    const coreGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, 11);
    coreGrad.addColorStop(0, '#817AFE');
    coreGrad.addColorStop(0.6, '#635BFF');
    coreGrad.addColorStop(1, '#4338CA');
    ctx.fillStyle = coreGrad;
    ctx.fill();

    // Tier 5: Precision 4-Point Star Emblem at center
    ctx.beginPath();
    const starOuter = 6;
    const starInner = 2;
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
    ctx.shadowBlur = 4;
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

    // Top-down elliptical curved glass reflection
    const glassGlare = ctx.createLinearGradient(centerX, centerY - wheelRadius, centerX, centerY + wheelRadius * 0.2);
    glassGlare.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
    glassGlare.addColorStop(0.45, 'rgba(255, 255, 255, 0.04)');
    glassGlare.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.beginPath();
    ctx.ellipse(centerX, centerY - wheelRadius * 0.35, wheelRadius * 0.9, wheelRadius * 0.55, 0, 0, 2 * Math.PI);
    ctx.fillStyle = glassGlare;
    ctx.fill();
    ctx.restore();

    // =========================================================================
    // 7. REALISTIC MECHANICAL FLAPPER / NEEDLE WITH SPRING DEFLECTION
    // =========================================================================
    // Check if a peg passes the top pointer (-PI/2) and deflect flapper
    const pointerAngle = -Math.PI / 2;
    const normalizedRot = (rotation % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const pegSpacing = (2 * Math.PI) / numSegments;
    const currentPegRaw = (pointerAngle - normalizedRot) / pegSpacing;
    const currentPeg = Math.floor(currentPegRaw);

    // Trigger audio click and flapper kick when a peg hits the stopper
    if (currentPeg !== lastPegIndexRef.current) {
      lastPegIndexRef.current = currentPeg;
      flapperDeflectionRef.current = 0.28; // Deflect 16 degrees in rotation direction
      if (soundEnabled) {
        playMechanicalClick(audioCtxRef);
      }
    }

    // Spring physics decay for flapper bounce
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
    ctx.moveTo(-11, -16);
    ctx.lineTo(11, -16);
    ctx.lineTo(0, 24); // Sharp tactile tip pointing down into the peg groove
    ctx.closePath();

    const flapperGrad = ctx.createLinearGradient(0, -16, 0, 24);
    flapperGrad.addColorStop(0, '#FF4D4D');
    flapperGrad.addColorStop(0.5, '#EF4444');
    flapperGrad.addColorStop(0.85, '#B91C1C');
    flapperGrad.addColorStop(1, '#7F1D1D');
    ctx.fillStyle = flapperGrad;
    ctx.fill();

    // Chrome Beveled Border on Flapper
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    // Top mounting bolt / chrome rivet
    ctx.beginPath();
    ctx.arc(0, -8, 4, 0, 2 * Math.PI);
    const rivetGrad = ctx.createRadialGradient(-1, -9, 0.5, 0, -8, 4);
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
  }, [soundEnabled]);

  // Ambient slow continuous idle rotation
  useEffect(() => {
    let lastTime = performance.now();

    const idleLoop = (now) => {
      const delta = now - lastTime;
      lastTime = now;

      // Only apply idle spin before the wheel has been spun and when not actively spinning
      if (!isSpinningRef.current && !hasSpunRef.current) {
        // Slow, hypnotic luxury turn: ~0.26 radians/sec (~24s per full rotation)
        const idleSpeed = 0.00042;
        rotationRef.current = (rotationRef.current + idleSpeed * delta) % (2 * Math.PI);
        drawWheel(rotationRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(idleLoop);
    };

    animationFrameRef.current = requestAnimationFrame(idleLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawWheel]);

  // Active User Spin
  const spin = () => {
    if (spinning) return;
    initAudio();
    hasSpunRef.current = false;
    setHasSpun(false);
    setSpinning(true);
    setWinner(null);

    const extraSpins = 6 + Math.random() * 3; // 6-9 full high-speed revolutions
    const targetOffset = Math.random() * Math.PI * 2;
    const totalRotation = extraSpins * Math.PI * 2 + targetOffset;
    const startRotation = rotationRef.current;
    const duration = 4600; // 4.6s authentic physics deceleration
    const startTime = performance.now();

    const animateSpin = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Realistic physics ease-out with high initial impulse
      const easeOut = 1 - Math.pow(1 - progress, 3.2);
      const currentRot = startRotation + totalRotation * easeOut;
      rotationRef.current = currentRot;

      drawWheel(currentRot);

      if (progress < 1) {
        requestAnimationFrame(animateSpin);
      } else {
        setSpinning(false);
        hasSpunRef.current = true;
        setHasSpun(true);

        // Compute winning segment mathematically (pointer at top: -PI/2)
        const numSegments = SAMPLE_NAMES.length;
        const arc = (2 * Math.PI) / numSegments;
        const normalized = ((-rotationRef.current - Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
        const winningIndex = Math.floor(normalized / arc);
        const selectedWinner = SAMPLE_NAMES[winningIndex];

        setWinner(selectedWinner);

        // Celebration confetti burst
        confetti({
          particleCount: 95,
          spread: 80,
          origin: { y: 0.62 },
          colors: ['#635BFF', '#10B981', '#F59E0B', '#EC4899', '#3B82F6', '#8B5CF6']
        });
      }
    };

    requestAnimationFrame(animateSpin);
  };

  return (
    <div className="relative group">
      {/* Studio Radial Spotlight Effect */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-gradient-to-b from-[#635BFF]/35 to-transparent rounded-full blur-3xl -z-20 pointer-events-none" />
      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-72 h-36 bg-[#A855F7]/20 rounded-full blur-2xl -z-20 pointer-events-none" />

      {/* Main Luxury Glass Pod Card */}
      <div className="relative flex flex-col items-center bg-[#10121C]/92 backdrop-blur-2xl p-7 rounded-[32px] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.65)] hover:border-indigo-500/30 transition-all duration-500">
        
        {/* Wheel Canvas Container */}
        <div className="relative flex items-center justify-center my-1">
          <canvas
            ref={canvasRef}
            style={{ width: 380, height: 380 }}
            className="max-w-full h-auto drop-shadow-[0_16px_32px_rgba(0,0,0,0.55)] select-none cursor-pointer active:scale-[0.99] transition-transform"
            onClick={spin}
            title="Click wheel to spin"
          />

          {/* Winner Name shown directly at the wheel */}
          {winner && !spinning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
              <div className="px-5 py-2.5 rounded-2xl bg-[#0D0F18]/94 backdrop-blur-xl border border-white/25 shadow-[0_14px_40px_rgba(0,0,0,0.9)] text-center animate-in zoom-in-95 duration-200">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#817AFE]">Winner</div>
                <div className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">{winner}</div>
              </div>
            </div>
          )}
        </div>

        {/* Action Button Container */}
        <div className="mt-5 flex flex-col items-center w-full">
          {/* Luxury 3D Tactile Action Button */}
          <button
            onClick={spin}
            disabled={spinning}
            className="w-full max-w-xs relative flex items-center justify-center gap-3 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#635BFF] via-[#7367FF] to-[#8B5CF6] hover:from-[#5448F5] hover:to-[#7C3AED] text-white font-bold text-sm tracking-wide shadow-[0_6px_25px_rgba(99,91,255,0.45)] hover:shadow-[0_8px_35px_rgba(99,91,255,0.65)] active:scale-[0.97] transition-all duration-200 border-t border-white/25 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed group overflow-hidden"
          >
            {/* Subtle button sheen line */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            
            <RotateCw className={`w-4.5 h-4.5 transition-transform duration-700 ${spinning ? 'animate-spin' : 'group-hover:rotate-180'}`} />
            <span>{spinning ? 'Selecting Winner...' : 'Spin The Wheel'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
