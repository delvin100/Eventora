import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { playTickSound } from './audio/wheelAudio';

const SEGMENT_PALETTE = [
  '#635BFF', '#159A72', '#F59E0B', '#EC4899',
  '#3B82F6', '#8B5CF6', '#10B981', '#F97316',
  '#06B6D4', '#64748B', '#D946EF', '#84CC16'
];

const WheelCanvas = forwardRef(function WheelCanvas(
  {
    participants = [],
    duration = 5,
    soundEnabled = true,
    onSpinStart,
    onSpinEnd,
    className = ''
  },
  ref
) {
  const canvasRef = useRef(null);
  const currentRotationRef = useRef(0);
  const isSpinningRef = useRef(false);
  const animFrameIdRef = useRef(null);
  const lastTickSegmentRef = useRef(-1);

  // Expose spin action via imperative ref
  useImperativeHandle(ref, () => ({
    spin: () => startSpin(),
    isSpinning: () => isSpinningRef.current
  }));

  const numSegments = participants.length;

  const drawWheel = (rotation) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 20;

    ctx.clearRect(0, 0, width, height);

    if (numSegments === 0) {
      // Empty wheel placeholder
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#E2E8F0';
      ctx.fill();
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 15px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No eligible participants', centerX, centerY);
      return;
    }

    const arc = (2 * Math.PI) / numSegments;

    // Draw rotated segments
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);

    for (let i = 0; i < numSegments; i++) {
      const angle = i * arc;
      const color = SEGMENT_PALETTE[i % SEGMENT_PALETTE.length];

      // Segment wedge
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, angle, angle + arc);
      ctx.lineTo(0, 0);
      ctx.fill();

      // Divider line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Segment text label
      ctx.save();
      ctx.fillStyle = '#ffffff';
      
      // Dynamic font size for large lists
      const fontSize = numSegments > 30 ? 10 : numSegments > 20 ? 11 : numSegments > 12 ? 12 : 14;
      ctx.font = `bold ${fontSize}px Inter, sans-serif`;
      
      ctx.translate(
        Math.cos(angle + arc / 2) * (radius * 0.65),
        Math.sin(angle + arc / 2) * (radius * 0.65)
      );
      ctx.rotate(angle + arc / 2 + Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Truncate name if long
      let displayName = participants[i].name || '';
      if (displayName.length > 15) displayName = displayName.slice(0, 13) + '…';

      ctx.fillText(displayName, 0, 0);
      ctx.restore();
    }

    // Outer wheel border
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    // Center Hub Outer
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, 2 * Math.PI);
    ctx.fillStyle = '#171923';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    // Center Hub Inner Dot
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, 2 * Math.PI);
    ctx.fillStyle = '#635BFF';
    ctx.fill();

    ctx.restore();

    // Fixed Pointer at Top
    ctx.save();
    ctx.translate(centerX, centerY - radius + 8);
    ctx.beginPath();
    ctx.moveTo(-16, -22);
    ctx.lineTo(16, -22);
    ctx.lineTo(0, 16);
    ctx.closePath();
    ctx.fillStyle = '#DC4545';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
    ctx.restore();
  };

  useEffect(() => {
    drawWheel(currentRotationRef.current);
  }, [participants]);

  const startSpin = () => {
    if (isSpinningRef.current || numSegments === 0) return;
    isSpinningRef.current = true;
    if (onSpinStart) onSpinStart();

    // 1. Choose winning index mathematically before animation
    const winningIndex = Math.floor(Math.random() * numSegments);
    const winner = participants[winningIndex];

    // 2. Calculate exact target angle
    // Pointer is at the top (-PI / 2)
    const arc = (2 * Math.PI) / numSegments;
    const targetSegmentCenter = winningIndex * arc + arc / 2;
    // Add random slight jitter inside segment wedge so it doesn't always hit dead center
    const jitter = (Math.random() - 0.5) * (arc * 0.6);
    const targetAngleAtPointer = -Math.PI / 2 - targetSegmentCenter + jitter;

    // Normalizing rotations (at least 6-9 full spins)
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

      // Ease-out cubic: 1 - (1 - t)^3
      const ease = 1 - Math.pow(1 - progress, 3);
      const currentAngle = startAngle + (finalAngle - startAngle) * ease;
      currentRotationRef.current = currentAngle;

      // Detect ticking when pointer crosses segment divider
      if (soundEnabled) {
        const normalized = ((-currentAngle - Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
        const currentSegment = Math.floor(normalized / arc);
        if (currentSegment !== lastTickSegmentRef.current) {
          lastTickSegmentRef.current = currentSegment;
          playTickSound();
        }
      }

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
        width={480}
        height={480}
        className="max-w-full h-auto drop-shadow-xl select-none"
      />
    </div>
  );
});

export default WheelCanvas;
