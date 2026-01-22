'use client';

import { useRef, useState, useEffect } from 'react';
import { Navigation } from 'lucide-react';

interface JoystickProps {
  onMove: (angle: number, intensity: number) => void;
  onStop: () => void;
  disabled?: boolean;
}

export default function Joystick({ onMove, onStop, disabled }: JoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const onMoveRef = useRef(onMove);
  const onStopRef = useRef(onStop);

  useEffect(() => {
    onMoveRef.current = onMove;
    onStopRef.current = onStop;
  }, [onMove, onStop]);

  const handleStart = (clientX: number, clientY: number) => {
    if (disabled) return;
    setActive(true);
    handleMove(clientX, clientY);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;

    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = rect.width / 2;

    let clampedDistance = Math.min(distance, maxRadius);
    const angleRad = Math.atan2(dy, dx);

    const angleDeg = (angleRad * 180) / Math.PI + 90;
    const normalizedBearing = (angleDeg + 360) % 360;

    const intensity = clampedDistance / maxRadius;

    setPosition({
      x: Math.cos(angleRad) * clampedDistance,
      y: Math.sin(angleRad) * clampedDistance,
    });

    onMoveRef.current(normalizedBearing, intensity);
  };

  const handleEnd = () => {
    setActive(false);
    setPosition({ x: 0, y: 0 });
    onStopRef.current();
  };

  const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX, e.clientY);

  const onTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX, e.touches[0].clientY);
  };

  useEffect(() => {
    const onWindowMouseMove = (e: MouseEvent) => {
      if (active) {
        e.preventDefault();
        handleMove(e.clientX, e.clientY);
      }
    };
    const onWindowMouseUp = (e: MouseEvent) => {
      if (active) {
        e.preventDefault();
        handleEnd();
      }
    };
    const onWindowTouchMove = (e: TouchEvent) => {
      if (active) {
        e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onWindowTouchEnd = (e: TouchEvent) => {
      if (active) {
        handleEnd();
      }
    };

    if (active) {
      window.addEventListener('mousemove', onWindowMouseMove);
      window.addEventListener('mouseup', onWindowMouseUp);
      window.addEventListener('touchmove', onWindowTouchMove, { passive: false });
      window.addEventListener('touchend', onWindowTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
      window.removeEventListener('touchmove', onWindowTouchMove);
      window.removeEventListener('touchend', onWindowTouchEnd);
    };
  }, [active]);

  return (
    <div
      ref={containerRef}
      className={`relative w-32 h-32 rounded-full border-4 transition-colors ${
        active ? 'bg-brand-50 border-brand-500' : 'bg-white/80 border-gray-200'
      } shadow-xl backdrop-blur-sm touch-none select-none flex items-center justify-center cursor-pointer`}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {!active && <Navigation className="text-gray-300 w-8 h-8" />}

      <div
        className={`absolute w-12 h-12 rounded-full shadow-md transition-transform duration-75 ease-out flex items-center justify-center ${
          active ? 'bg-brand-500 scale-110' : 'bg-gray-400'
        }`}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
        }}
      >
        {active && <div className="w-2 h-2 bg-white rounded-full" />}
      </div>
    </div>
  );
}
