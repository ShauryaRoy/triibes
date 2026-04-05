import React, { useEffect, useMemo, useRef } from 'react';
import { AuroraBackground } from './AuroraBackground';
import { FirefliesBackground } from './FirefliesBackground';
import { MatrixBackground } from './MatrixBackground';
import { WarpSpeedBackground } from './WarpSpeedBackground';
import { FireStormBackground } from './FireStormBackground';
import { getRandomMinimalThemeId, resolveThemeById } from './theme-catalog';
import { type DisplayMode } from '@/hooks/useDisplayMode';

interface ThemeBackgroundProps {
  themeId?: string;
  displayMode?: DisplayMode;
  className?: string;
  children?: React.ReactNode;
}

type QuantumBlobVariant = {
  base: string;
  blobs: [string, string, string];
};

type EmojiParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotateSpeed: number;
  scale: number;
  opacity: number;
  blur: number;
  phase: number;
  fontSize: number;
};

type ConfettiParticle = {
  id: string;
  side: 'left' | 'right';
  x: number;
  y: number;
  driftX: number;
  driftPhase: number;
  driftSpeed: number;
  vx: number;
  vy: number;
  gravity: number;
  rotation: number;
  rotationSpeed: number;
  scale: number;
  opacity: number;
  duration: number;
  age: number;
  color: string;
  shape: 'star' | 'heart' | 'party' | 'circle';
  blur: number;
  trailOpacity: number;
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const quantumBlobVariants: QuantumBlobVariant[] = [
  {
    base: '#1a0a10',
    blobs: ['#ff6eb4', '#ffce5c', '#ff4499'],
  },
  {
    base: '#0a0a1a',
    blobs: ['#4f8ef7', '#a855f7', '#06b6d4'],
  },
  {
    base: '#030d1a',
    blobs: ['#00e5c3', '#0ea5e9', '#6366f1'],
  },
  {
    base: '#08090f',
    blobs: ['#3b82f6', '#f59e0b', '#8b5cf6'],
  },
  {
    base: '#0a0a06',
    blobs: ['#ef4444', '#22c55e', '#84cc16'],
  },
  {
    base: '#120609',
    blobs: ['#c026d3', '#e11d48', '#f97316'],
  },
  {
    base: '#0c0a04',
    blobs: ['#84cc16', '#b45309', '#dc2626'],
  },
];

const quantumThemeVariantIndexMap: Record<string, number> = {
  'quantum-dreamy': 1, // Blue/Purple
  'quantum-summer': 3, // Blue/Amber
  'quantum-melon': 0, // Pink/Yellow
  'quantum-barbie': 5, // Purple/Red
  'quantum-sunset': 0, // Pink/Yellow alias
  'quantum-ocean': 2, // Teal/Navy
  'quantum-forest': 4, // Red/Green
  'quantum-lavender': 6, // Olive/Brown
};

const varyHexBrightness = (hex: string, variance: number): string => {
  if (!/^#([\da-f]{3}|[\da-f]{6})$/i.test(hex)) return hex;

  let normalized = hex.slice(1);
  if (normalized.length === 3) {
    normalized = normalized
      .split('')
      .map((part) => `${part}${part}`)
      .join('');
  }

  const amount = (Math.random() * 2 - 1) * variance;
  const r = clamp(Math.round(parseInt(normalized.slice(0, 2), 16) + 255 * amount), 0, 255);
  const g = clamp(Math.round(parseInt(normalized.slice(2, 4), 16) + 255 * amount), 0, 255);
  const b = clamp(Math.round(parseInt(normalized.slice(4, 6), 16) + 255 * amount), 0, 255);

  return `rgb(${r}, ${g}, ${b})`;
};

function FloatingEmojiField({ emoji, seedKey }: { emoji: string; seedKey: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const particlesRef = useRef<EmojiParticle[]>([]);
  const frameRef = useRef<number>();
  const lastTsRef = useRef<number>(0);

  const particles = useMemo(() => {
    const count = 12 + Math.floor(Math.random() * 9); // 12-20
    const segmentWidth = 100 / count;

    return Array.from({ length: count }, (_, index) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 38 + Math.random() * 34;
      const scale = 0.8 + Math.random() * 0.4;
      const opacity = 0.84 + Math.random() * 0.16;
      const left = segmentWidth * (index + 0.5) + (Math.random() - 0.5) * segmentWidth * 0.35;
      const top = 10 + Math.random() * 80;

      return {
        x: left,
        y: top,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rotation: -8 + Math.random() * 16,
        rotateSpeed: -6 + Math.random() * 12,
        scale,
        opacity,
        blur: 0,
        phase: Math.random() * Math.PI * 2,
        fontSize: 20 + scale * 14,
      } as EmojiParticle;
    });
  }, [seedKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = () => container.clientWidth;
    const height = () => container.clientHeight;

    particlesRef.current = particles.map((particle) => ({
      ...particle,
      x: (particle.x / 100) * Math.max(width(), 1),
      y: (particle.y / 100) * Math.max(height(), 1),
    }));

    lastTsRef.current = 0;

    const animate = (timestamp: number) => {
      const w = Math.max(width(), 1);
      const h = Math.max(height(), 1);
      const last = lastTsRef.current || timestamp;
      const dt = Math.min((timestamp - last) / 1000, 0.05);
      lastTsRef.current = timestamp;

      particlesRef.current.forEach((particle, index) => {
        // Random-walk acceleration gives non-fixed path while staying calm.
        particle.vx += (Math.random() - 0.5) * 42 * dt;
        particle.vy += (Math.random() - 0.5) * 42 * dt;
        particle.vx = clamp(particle.vx, -72, 72);
        particle.vy = clamp(particle.vy, -72, 72);

        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.rotation += particle.rotateSpeed * dt;

        if (particle.x < -40) particle.x = w + 20;
        if (particle.x > w + 40) particle.x = -20;
        if (particle.y < -40) particle.y = h + 20;
        if (particle.y > h + 40) particle.y = -20;

        const node = nodeRefs.current[index];
        if (!node) return;

        const pulse = 0.96 + 0.04 * Math.sin(timestamp * 0.00035 + particle.phase);
        node.style.opacity = `${particle.opacity * pulse}`;
        node.style.transform = `translate3d(${particle.x}px, ${particle.y}px, 0) scale(${particle.scale}) rotate(${particle.rotation}deg)`;
      });

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [particles]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {particles.map((particle, index) => (
        <span
          key={`${seedKey}-${index}`}
          ref={(node) => {
            nodeRefs.current[index] = node;
          }}
          className="absolute left-0 top-0 select-none will-change-transform"
          style={{
            fontSize: `${particle.fontSize}px`,
            filter: `blur(${particle.blur}px)`,
            opacity: 0,
          }}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}

function ConfettiBurstField({
  shape,
  palette,
}: {
  shape: 'star' | 'heart' | 'party' | 'circle';
  palette: string[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [particles, setParticles] = React.useState<ConfettiParticle[]>([]);
  const rafRef = useRef<number>();
  const lastRef = useRef<number>(0);
  const burstTimerRef = useRef<number>(0);
  const nextBurstRef = useRef<number>(0.35);

  const spawnBurst = React.useCallback((width: number, height: number) => {
    const burstCount = 4 + Math.floor(Math.random() * 6); // 4-9 per burst
    const newParticles: ConfettiParticle[] = [];

    for (let i = 0; i < burstCount; i++) {
      const side: 'left' | 'right' = i % 2 === 0 ? 'left' : 'right';
      const y = height * (0.12 + Math.random() * 0.76);
      const direction = side === 'left' ? 1 : -1;
      const speed = 210 + Math.random() * 170;
      const arcVy = -55 + Math.random() * 95;
      const duration = 1.5 + Math.random() * 1.5;
      const scale = 0.6 + Math.random() * 0.6;
      const baseOpacity = 0.7 + Math.random() * 0.3;
      const color = varyHexBrightness(
        palette[Math.floor(Math.random() * palette.length)] || '#ffd27f',
        0.12,
      );

      newParticles.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        side,
        x: side === 'left' ? 0 : width,
        y,
        driftX: 24 + Math.random() * 38,
        driftPhase: Math.random() * Math.PI * 2,
        driftSpeed: 1.8 + Math.random() * 2.2,
        vx: direction * speed,
        vy: arcVy,
        gravity: 60 + Math.random() * 46,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() > 0.5 ? 1 : -1) * (220 + Math.random() * 360),
        scale,
        opacity: baseOpacity,
        duration,
        age: 0,
        color,
        shape,
        blur: scale < 0.86 ? 0.75 : 0,
        trailOpacity: 0.06 + Math.random() * 0.08,
      });
    }

    setParticles((prev) => {
      const combined = [...prev, ...newParticles];
      return combined.slice(-30); // cap density
    });
  }, [palette, shape]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    lastRef.current = 0;
    burstTimerRef.current = 0;
    nextBurstRef.current = 0.35;
    setParticles([]);

    // Trigger one burst immediately so the theme feels active as soon as selected.
    spawnBurst(Math.max(container.clientWidth, 1), Math.max(container.clientHeight, 1));

    const frame = (ts: number) => {
      const w = Math.max(container.clientWidth, 1);
      const h = Math.max(container.clientHeight, 1);
      const last = lastRef.current || ts;
      const dt = Math.min((ts - last) / 1000, 0.05);
      lastRef.current = ts;

      burstTimerRef.current += dt;
      if (burstTimerRef.current >= nextBurstRef.current) {
        burstTimerRef.current = 0;
        nextBurstRef.current = 1 + Math.random(); // 1-2s
        spawnBurst(w, h);
      }

      setParticles((prev) => {
        const updated = prev
          .map((particle) => {
            const age = particle.age + dt;
            const t = Math.min(age / particle.duration, 1);

            // Fast start then slow down
            const speedEase = 1 - 0.72 * t;
            const baseX = particle.x + particle.vx * speedEase * dt;
            const sinusoidalDrift = Math.sin(age * particle.driftSpeed + particle.driftPhase) * particle.driftX * dt;
            const randomDrift = (Math.random() - 0.5) * 16 * dt;
            const x = baseX + sinusoidalDrift + randomDrift;
            const vy = particle.vy + particle.gravity * age;
            const y = particle.y + vy * dt;
            const rotation = particle.rotation + particle.rotationSpeed * dt;
            const opacity = particle.opacity * (1 - t);

            return {
              ...particle,
              x,
              y,
              rotation,
              opacity,
              age,
            };
          })
          .filter((particle) => {
            return (
              particle.age < particle.duration &&
              particle.opacity > 0.02 &&
              particle.x > -80 &&
              particle.x < w + 80 &&
              particle.y > -80 &&
              particle.y < h + 80
            );
          });

        return updated;
      });

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [spawnBurst]);

  const renderShape = (particle: ConfettiParticle) => {
    const baseStyle: React.CSSProperties = {
      width: '12px',
      height: '12px',
      backgroundColor: particle.color,
    };

    if (particle.shape === 'circle') {
      return <span style={{ ...baseStyle, borderRadius: '999px' }} />;
    }

    if (particle.shape === 'party') {
      return (
        <span
          style={{
            ...baseStyle,
            borderRadius: '2px',
            clipPath: 'polygon(10% 0%, 100% 18%, 76% 100%, 0% 82%)',
          }}
        />
      );
    }

    if (particle.shape === 'heart') {
      return (
        <span
          style={{
            ...baseStyle,
            clipPath: 'path("M6,11 C2.5,8.5 0,6.5 0,4 C0,2 1.5,0.5 3.5,0.5 C4.8,0.5 5.6,1.2 6,2 C6.4,1.2 7.2,0.5 8.5,0.5 C10.5,0.5 12,2 12,4 C12,6.5 9.5,8.5 6,11 Z")',
          }}
        />
      );
    }

    return (
      <span
        style={{
          ...baseStyle,
          clipPath: 'polygon(50% 0%, 62% 36%, 100% 36%, 70% 58%, 82% 95%, 50% 72%, 18% 95%, 30% 58%, 0% 36%, 38% 36%)',
        }}
      />
    );
  };

  return (
    <div ref={containerRef} className="absolute inset-0 z-[5] overflow-hidden pointer-events-none" aria-hidden="true">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="absolute left-0 top-0 will-change-transform"
          style={{
            transform: `translate3d(${particle.x}px, ${particle.y}px, 0) rotate(${particle.rotation}deg) scale(${particle.scale})`,
            opacity: particle.opacity,
            filter: `blur(${particle.blur}px)`,
          }}
        >
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-1/2"
            style={{
              width: '9px',
              height: '2px',
              transform: `translate(-50%, -50%) rotate(${particle.side === 'left' ? 8 : -8}deg)`,
              borderRadius: '999px',
              background: particle.color,
              opacity: particle.trailOpacity,
              filter: 'blur(0.8px)',
            }}
          />
          {renderShape(particle)}
        </span>
      ))}
    </div>
  );
}

export const ThemeBackground: React.FC<ThemeBackgroundProps> = ({ 
  themeId,
  displayMode = 'auto',
  className = '', 
  children 
}) => {
  void displayMode;
  const fallbackThemeIdRef = useRef<string>(getRandomMinimalThemeId());
  const resolvedTheme = resolveThemeById(themeId) || resolveThemeById(fallbackThemeIdRef.current);
  const selectedQuantumBaseIndex = quantumThemeVariantIndexMap[resolvedTheme?.id || ''] ?? 0;
  const activeQuantumVariantIndex = selectedQuantumBaseIndex % quantumBlobVariants.length;
  const activeQuantumVariant = quantumBlobVariants[activeQuantumVariantIndex] || quantumBlobVariants[0];
  const quantumDebugMode =
    typeof window !== 'undefined' && window.localStorage.getItem('quantum-debug') === '1';

  return (
    <div className={`relative min-h-screen ${className}`}>
      {resolvedTheme?.kind === 'minimal' && (
        <div className="absolute inset-0 -z-20" style={{ backgroundColor: resolvedTheme.solidColor }} />
      )}

      {resolvedTheme?.kind === 'quantum' && (
        <>
          <div
            className={`quantum-bg quantum-aurora pointer-events-none ${quantumDebugMode ? 'quantum-debug' : ''}`}
            style={{
              background: activeQuantumVariant.base,
              transition: 'background 2s ease',
            }}
            aria-hidden="true"
          >
            <div
              className="quantum-blob blob1"
              style={{
                background: activeQuantumVariant.blobs[0],
                transition: 'background 2s ease',
              }}
            />
            <div
              className="quantum-blob blob2"
              style={{
                background: activeQuantumVariant.blobs[1],
                transition: 'background 2s ease',
              }}
            />
            <div
              className="quantum-blob blob3"
              style={{
                background: activeQuantumVariant.blobs[2],
                transition: 'background 2s ease',
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.16)',
              }}
            />
          </div>
        </>
      )}

      {resolvedTheme?.kind === 'warp' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 -z-20" />
          <WarpSpeedBackground />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundColor: resolvedTheme.warpTint,
              mixBlendMode: 'soft-light',
              opacity: 0.45,
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 25% 20%, ${resolvedTheme.warpTint}99 0%, transparent 42%), radial-gradient(circle at 75% 80%, ${resolvedTheme.warpTint}88 0%, transparent 40%)`,
              mixBlendMode: 'overlay',
              opacity: 0.35,
            }}
          />
        </>
      )}

      {resolvedTheme?.kind === 'emoji' && (
        <>
          <div className="absolute inset-0 -z-20" style={{ backgroundColor: resolvedTheme.bgColor || '#0F172A' }} />
          <FloatingEmojiField emoji={resolvedTheme.emoji || '✨'} seedKey={`${themeId}-${resolvedTheme.emoji || 'emoji'}`} />
        </>
      )}

      {resolvedTheme?.kind === 'confetti' && (
        <>
          <div className="absolute inset-0 -z-20" style={{ backgroundColor: resolvedTheme.bgColor || '#101317' }} />
          <ConfettiBurstField
            shape={resolvedTheme.confettiShape || 'circle'}
            palette={resolvedTheme.confettiPalette || ['#8ed47a', '#86c9ff', '#b69bff', '#ffd27f']}
          />
        </>
      )}

      {resolvedTheme?.kind === 'legacy' && (
        <>
          {/* Base dark background */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 -z-20" />

          {/* Theme-specific animated background - only render if not 'none' */}
          {themeId === 'matrix-code' && <MatrixBackground />}
          {themeId === 'warp-speed' && <WarpSpeedBackground />}
          {themeId === 'aurora' && <AuroraBackground />}
          {themeId === 'fireflies' && <FirefliesBackground />}
          {themeId === 'fire-storm' && <FireStormBackground />}
          {/* 'none' theme will just show the base dark background */}
        </>
      )}
      
      {/* Content */}
      <div className="ui-layer">{children}</div>
    </div>
  );
};

export default ThemeBackground;
