import React, { useEffect, useRef } from 'react';
import { EventTheme } from '@shared/themes';

interface ThemeBackgroundProps {
  theme: EventTheme;
  className?: string;
  children?: React.ReactNode;
}

export const ThemeBackground: React.FC<ThemeBackgroundProps> = ({ theme, className = '', children }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Clear any existing animation
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }

    if (theme.category === 'confetti' && canvasRef.current) {
      try {
        initConfetti(canvasRef.current, theme);
      } catch (error) {
        console.warn('Confetti animation failed:', error);
      }
    } else if (theme.category === 'special-effects' && canvasRef.current) {
      try {
        initSpecialEffect(canvasRef.current, theme);
      } catch (error) {
        console.warn('Special effect animation failed:', error);
      }
    }

    // Cleanup function
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };
  }, [theme]);

  const getBackgroundStyles = () => {
    const backgroundValue = getBackgroundStyle();
    
    // Determine if it's a gradient or solid color
    const isGradient = backgroundValue.includes('linear-gradient') || backgroundValue.includes('radial-gradient');
    
    if (isGradient) {
      return {
        backgroundImage: backgroundValue,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    } else {
      return {
        backgroundColor: backgroundValue,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    }
  };

  const getBackgroundStyle = () => {
    try {
      switch (theme.category) {
        case 'minimal':
          if (theme.gradient) {
            // Convert Tailwind gradient to CSS
            const gradientMap: { [key: string]: string } = {
              'from-gray-900 via-gray-800 to-gray-900': 'linear-gradient(45deg, #111827, #1f2937, #111827)',
              'from-slate-100 via-white to-slate-100': 'linear-gradient(45deg, #f1f5f9, #ffffff, #f1f5f9)',
              'from-blue-400 via-cyan-400 to-teal-400': 'linear-gradient(45deg, #60a5fa, #22d3ee, #4ade80)',
              'from-orange-400 via-red-400 to-pink-500': 'linear-gradient(45deg, #fb923c, #f87171, #ec4899)',
              'from-green-400 via-emerald-400 to-teal-500': 'linear-gradient(45deg, #4ade80, #34d399, #14b8a6)',
              'from-purple-400 via-pink-400 to-red-400': 'linear-gradient(45deg, #c084fc, #f472b6, #f87171)',
              'from-yellow-400 via-orange-400 to-red-500': 'linear-gradient(45deg, #facc15, #fb923c, #ef4444)',
            };
            
            return gradientMap[theme.gradient] || 'linear-gradient(45deg, #111827, #1f2937, #111827)';
          }
          return theme.solidColor || '#1f2937';

        case 'seasonal':
          // Provide fallback gradients for seasonal themes when images fail to load
          if (theme.id === 'autumn-leaves') {
            return 'linear-gradient(135deg, #92400e, #ea580c, #dc2626)';
          } else if (theme.id === 'winter-snow') {
            return 'linear-gradient(135deg, #1e3a8a, #0ea5e9, #e2e8f0)';
          } else if (theme.id === 'spring-bloom') {
            return 'linear-gradient(135deg, #166534, #16a34a, #f9a8d4)';
          } else if (theme.id === 'summer-pool') {
            return 'linear-gradient(135deg, #155e75, #0891b2, #67e8f9)';
          }
          return theme.backgroundColor || 'linear-gradient(135deg, #1f2937, #374151)';

        case 'holiday':
          // Provide fallback gradients for holiday themes when images fail to load
          if (theme.id === 'christmas-joy') {
            return 'linear-gradient(135deg, #dc2626, #166534, #fbbf24)';
          } else if (theme.id === 'diwali-lights') {
            return 'linear-gradient(135deg, #f59e0b, #ea580c, #fbbf24)';
          } else if (theme.id === 'halloween-spook') {
            return 'linear-gradient(135deg, #ea580c, #7c2d12, #581c87)';
          } else if (theme.id === 'new-year-fireworks') {
            return 'linear-gradient(135deg, #8b5cf6, #3b82f6, #1e40af)';
          }
          return theme.backgroundColor || 'linear-gradient(135deg, #1f2937, #374151)';

        case 'pattern':
          return theme.backgroundColor || '#1f2937';

        case 'emoji':
          return theme.backgroundColor || '#1f2937';

        case 'confetti':
        case 'special-effects':
          return theme.backgroundColor || '#1f2937';

        default:
          return '#1f2937';
      }
    } catch (error) {
      console.warn('Theme background style error:', error);
      return '#1f2937';
    }
  };

  const getOverlayStyle = (overlayClass: string) => {
    const overlayMap: { [key: string]: string } = {
      'from-black/50 to-transparent': 'linear-gradient(to bottom right, rgba(0,0,0,0.5), transparent)',
      'from-blue-900/70 to-cyan-900/30': 'linear-gradient(to bottom right, rgba(30,58,138,0.7), rgba(22,78,99,0.3))',
      'from-orange-900/60 to-red-900/40': 'linear-gradient(to bottom right, rgba(154,52,18,0.6), rgba(127,29,29,0.4))',
      'from-green-900/60 to-emerald-900/40': 'linear-gradient(to bottom right, rgba(20,83,45,0.6), rgba(6,78,59,0.4))',
      'from-purple-900/70 to-pink-900/50': 'linear-gradient(to bottom right, rgba(88,28,135,0.7), rgba(131,24,67,0.5))',
      'from-red-900/80 to-green-900/60': 'linear-gradient(to bottom right, rgba(127,29,29,0.8), rgba(20,83,45,0.6))',
      // Seasonal overlays
      'from-orange-900/60 to-red-900/60': 'linear-gradient(to bottom right, rgba(154,52,18,0.6), rgba(127,29,29,0.6))',
      'from-blue-900/50 to-slate-900/50': 'linear-gradient(to bottom right, rgba(30,58,138,0.5), rgba(15,23,42,0.5))',
      'from-green-800/40 to-pink-800/40': 'linear-gradient(to bottom right, rgba(22,101,52,0.4), rgba(157,23,77,0.4))',
      'from-cyan-900/50 to-blue-900/50': 'linear-gradient(to bottom right, rgba(22,78,99,0.5), rgba(30,58,138,0.5))',
      // Holiday overlays
      'from-red-900/60 to-green-900/60': 'linear-gradient(to bottom right, rgba(127,29,29,0.6), rgba(20,83,45,0.6))',
      'from-yellow-900/50 to-orange-900/50': 'linear-gradient(to bottom right, rgba(113,63,18,0.5), rgba(154,52,18,0.5))',
      'from-orange-900/70 to-purple-900/70': 'linear-gradient(to bottom right, rgba(154,52,18,0.7), rgba(88,28,135,0.7))',
      'from-purple-900/50 to-blue-900/50': 'linear-gradient(to bottom right, rgba(88,28,135,0.5), rgba(30,58,138,0.5))',
    };
    
    return overlayMap[overlayClass] || 'linear-gradient(to bottom right, rgba(0,0,0,0.3), transparent)';
  };

  const getBackgroundImage = () => {
    // For now, we'll skip background images since the image files don't exist
    // and rely on the gradient backgrounds instead
    // Future: implement actual image loading with fallbacks
    return {};
  };

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={{
        ...getBackgroundStyles(),
        ...getBackgroundImage()
      }}
    >
      {/* Overlay for seasonal/holiday themes */}
      {(theme.seasonalOverlay || theme.holidayOverlay) && (
        <div 
          className="absolute inset-0"
          style={{
            background: getOverlayStyle(theme.seasonalOverlay || theme.holidayOverlay || ''),
          }}
        />
      )}

      {/* Pattern backgrounds */}
      {theme.category === 'pattern' && (
        <PatternBackground theme={theme} />
      )}

      {/* Emoji backgrounds */}
      {theme.category === 'emoji' && (
        <EmojiBackground theme={theme} />
      )}

      {/* Canvas for confetti and special effects */}
      {(theme.category === 'confetti' || theme.category === 'special-effects') && (
        <canvas 
          key={`${theme.id}-${theme.category}`}
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

// Pattern Background Component
const PatternBackground: React.FC<{ theme: EventTheme }> = ({ theme }) => {
  const getPatternSVG = () => {
    const { patternType, patternColor = '#ffffff' } = theme;

    switch (patternType) {
      case 'polkadot':
        return (
          <svg width="60" height="60" viewBox="0 0 60 60" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
            <defs>
              <pattern id="polkadot" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <circle cx="30" cy="30" r="8" fill={patternColor} opacity="0.4" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#polkadot)" />
          </svg>
        );

      case 'waves':
        return (
          <svg width="100" height="20" viewBox="0 0 100 20" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
            <defs>
              <pattern id="waves" x="0" y="0" width="100" height="20" patternUnits="userSpaceOnUse">
                <path 
                  d="M0,10 Q25,0 50,10 T100,10" 
                  stroke={patternColor} 
                  strokeWidth="2" 
                  fill="none" 
                  opacity="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#waves)" />
          </svg>
        );

      case 'zigzag':
        return (
          <svg width="40" height="40" viewBox="0 0 40 40" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
            <defs>
              <pattern id="zigzag" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path 
                  d="M0,20 L20,0 L40,20 L20,40 Z" 
                  stroke={patternColor} 
                  strokeWidth="2" 
                  fill="none" 
                  opacity="0.4"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#zigzag)" />
          </svg>
        );

      case 'hexagon':
        return (
          <svg width="60" height="60" viewBox="0 0 60 60" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
            <defs>
              <pattern id="hexagon" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <polygon 
                  points="30,5 50,20 50,40 30,55 10,40 10,20" 
                  stroke={patternColor} 
                  strokeWidth="2" 
                  fill="none" 
                  opacity="0.4"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hexagon)" />
          </svg>
        );

      case 'stripes':
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
            <defs>
              <pattern id="stripes" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <line 
                  x1="0" y1="0" x2="0" y2="20" 
                  stroke={patternColor} 
                  strokeWidth="2" 
                  opacity="0.4"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#stripes)" />
          </svg>
        );

      case 'grid':
        return (
          <svg width="40" height="40" viewBox="0 0 40 40" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
            <defs>
              <pattern id="grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path 
                  d="M 40 0 L 0 0 0 40" 
                  stroke={patternColor} 
                  strokeWidth="1" 
                  fill="none" 
                  opacity="0.4"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        );

      default:
        return null;
    }
  };

  return (
    <div className="absolute inset-0" style={{ opacity: 0.3 }}>
      {getPatternSVG()}
    </div>
  );
};

// Emoji Background Component
const EmojiBackground: React.FC<{ theme: EventTheme }> = ({ theme }) => {
  const { emojiPattern, emojiSize = 'medium' } = theme;
  
  const sizeStyles = {
    small: { fontSize: '1.125rem' }, // text-lg
    medium: { fontSize: '1.5rem' }, // text-2xl
    large: { fontSize: '2.25rem' }, // text-4xl
  };

  const emojis = emojiPattern?.split('') || [];

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ opacity: 0.4 }}>
      {Array.from({ length: 50 }).map((_, i) => {
        const emoji = emojis[i % emojis.length];
        return (
          <div
            key={i}
            className="absolute animate-pulse"
            style={{
              ...sizeStyles[emojiSize],
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          >
            {emoji}
          </div>
        );
      })}
    </div>
  );
};

// Confetti Animation
const initConfetti = (canvas: HTMLCanvasElement, theme: EventTheme) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  const particles: any[] = [];
  const { confettiType, confettiColors = ['#ff6b9d', '#4ecdc4', '#45b7d1', '#f9ca24'] } = theme;

  // Create particles
  for (let i = 0; i < 50; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 2,
      vy: Math.random() * 2 + 1,
      size: Math.random() * 8 + 4,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
    });
  }

  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((particle) => {
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.rotation += particle.rotationSpeed;

      // Reset if out of bounds
      if (particle.y > canvas.height) {
        particle.y = -10;
        particle.x = Math.random() * canvas.width;
      }

      // Draw particle
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate((particle.rotation * Math.PI) / 180);
      ctx.fillStyle = particle.color;

      switch (confettiType) {
        case 'hearts':
          drawHeart(ctx, particle.size);
          break;
        case 'stars':
          drawStar(ctx, particle.size);
          break;
        case 'sparkles':
          drawSparkle(ctx, particle.size);
          break;
        default:
          ctx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
      }

      ctx.restore();
    });

    requestAnimationFrame(animate);
  };

  animate();
};

// Special Effects Animation
const initSpecialEffect = (canvas: HTMLCanvasElement, theme: EventTheme) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  switch (theme.effectType) {
    case 'warp':
      animateWarp(ctx, canvas);
      break;
    case 'champagne':
      animateChampagne(ctx, canvas);
      break;
    case 'bokeh':
      animateBokeh(ctx, canvas);
      break;
    case 'matrix':
      animateMatrix(ctx, canvas);
      break;
  }
};

// Helper drawing functions
const drawHeart = (ctx: CanvasRenderingContext2D, size: number) => {
  const x = 0, y = 0;
  ctx.beginPath();
  ctx.moveTo(x, y + size/4);
  ctx.bezierCurveTo(x, y, x - size/2, y, x - size/2, y + size/4);
  ctx.bezierCurveTo(x - size/2, y + size/2, x, y + size/1.2, x, y + size);
  ctx.bezierCurveTo(x, y + size/1.2, x + size/2, y + size/2, x + size/2, y + size/4);
  ctx.bezierCurveTo(x + size/2, y, x, y, x, y + size/4);
  ctx.fill();
};

const drawStar = (ctx: CanvasRenderingContext2D, size: number) => {
  const spikes = 5;
  const outerRadius = size;
  const innerRadius = size * 0.5;
  
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / spikes;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fill();
};

const drawSparkle = (ctx: CanvasRenderingContext2D, size: number) => {
  const centerX = 0, centerY = 0;
  
  ctx.beginPath();
  // Vertical line
  ctx.moveTo(centerX, centerY - size);
  ctx.lineTo(centerX, centerY + size);
  // Horizontal line
  ctx.moveTo(centerX - size, centerY);
  ctx.lineTo(centerX + size, centerY);
  
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = 2;
  ctx.stroke();
};

// Animation functions
const animateWarp = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
  const lines: any[] = [];
  
  for (let i = 0; i < 100; i++) {
    lines.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      length: Math.random() * 100 + 50,
      speed: Math.random() * 10 + 5,
      opacity: Math.random(),
    });
  }

  const animate = () => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    lines.forEach((line) => {
      line.x += line.speed;
      
      if (line.x > canvas.width + line.length) {
        line.x = -line.length;
        line.y = Math.random() * canvas.height;
      }

      ctx.strokeStyle = `rgba(6, 182, 212, ${line.opacity})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(line.x, line.y);
      ctx.lineTo(line.x + line.length, line.y);
      ctx.stroke();
    });

    requestAnimationFrame(animate);
  };

  animate();
};

const animateChampagne = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
  const bubbles: any[] = [];
  
  for (let i = 0; i < 30; i++) {
    bubbles.push({
      x: Math.random() * canvas.width,
      y: canvas.height + Math.random() * 100,
      radius: Math.random() * 10 + 5,
      speed: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.3,
    });
  }

  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    bubbles.forEach((bubble) => {
      bubble.y -= bubble.speed;
      
      if (bubble.y < -bubble.radius) {
        bubble.y = canvas.height + bubble.radius;
        bubble.x = Math.random() * canvas.width;
      }

      ctx.fillStyle = `rgba(255, 255, 255, ${bubble.opacity})`;
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(animate);
  };

  animate();
};

const animateBokeh = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
  const circles: any[] = [];
  
  for (let i = 0; i < 20; i++) {
    circles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 50 + 30,
      dx: (Math.random() - 0.5) * 0.5,
      dy: (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.3 + 0.1,
      hue: Math.random() * 360,
    });
  }

  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    circles.forEach((circle) => {
      circle.x += circle.dx;
      circle.y += circle.dy;
      
      if (circle.x < 0 || circle.x > canvas.width) circle.dx *= -1;
      if (circle.y < 0 || circle.y > canvas.height) circle.dy *= -1;

      const gradient = ctx.createRadialGradient(
        circle.x, circle.y, 0,
        circle.x, circle.y, circle.radius
      );
      gradient.addColorStop(0, `hsla(${circle.hue}, 70%, 60%, ${circle.opacity})`);
      gradient.addColorStop(1, `hsla(${circle.hue}, 70%, 60%, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(animate);
  };

  animate();
};

const animateMatrix = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()';
  const fontSize = 14;
  const columns = Math.floor(canvas.width / fontSize);
  const drops: number[] = [];

  for (let i = 0; i < columns; i++) {
    drops[i] = 1;
  }

  const animate = () => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#00ff00';
    ctx.font = `${fontSize}px monospace`;

    for (let i = 0; i < drops.length; i++) {
      const text = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);

      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }

    setTimeout(() => requestAnimationFrame(animate), 50);
  };

  animate();
};

export default ThemeBackground;
