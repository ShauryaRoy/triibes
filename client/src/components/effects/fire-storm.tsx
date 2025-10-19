import { useEffect, useRef } from 'react';

interface FireStormProps {
  intensity?: 'low' | 'medium' | 'high';
}

export function FireStorm({ intensity = 'high' }: FireStormProps) {
  const flameCanvasRef = useRef<HTMLCanvasElement>(null);
  const emberCanvasRef = useRef<HTMLCanvasElement>(null);
  const heatCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const flameCanvas = flameCanvasRef.current;
    const emberCanvas = emberCanvasRef.current;
    const heatCanvas = heatCanvasRef.current;
    if (!flameCanvas || !emberCanvas || !heatCanvas) return;

    const flameCtx = flameCanvas.getContext('2d');
    const emberCtx = emberCanvas.getContext('2d');
    const heatCtx = heatCanvas.getContext('2d');
    if (!flameCtx || !emberCtx || !heatCtx) return;

    // Set canvas size
    const setCanvasSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      flameCanvas.width = width;
      flameCanvas.height = height;
      emberCanvas.width = width;
      emberCanvas.height = height;
      heatCanvas.width = width;
      heatCanvas.height = height;
    };
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    // Fire configuration based on intensity
    const config = {
      low: { flames: 8, embers: 50, flameHeight: 150, windStrength: 1 },
      medium: { flames: 15, embers: 100, flameHeight: 200, windStrength: 1.5 },
      high: { flames: 25, embers: 200, flameHeight: 300, windStrength: 2 }
    }[intensity];

    // Flame particles
    const flames: Array<{
      x: number;
      y: number;
      baseX: number;
      baseY: number;
      life: number;
      maxLife: number;
      size: number;
      speed: number;
      windOffset: number;
      color: { r: number; g: number; b: number };
    }> = [];

    // Ember particles
    const embers: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      life: number;
      maxLife: number;
      heat: number;
      trail: Array<{ x: number; y: number; opacity: number }>;
    }> = [];

    // Heat distortion points
    const heatWaves: Array<{
      x: number;
      y: number;
      amplitude: number;
      frequency: number;
      phase: number;
      life: number;
    }> = [];

    // Initialize flames
    for (let i = 0; i < config.flames; i++) {
      const baseX = (flameCanvas.width / config.flames) * i + Math.random() * (flameCanvas.width / config.flames);
      const baseY = flameCanvas.height - 50;
      
      flames.push({
        x: baseX,
        y: baseY,
        baseX: baseX,
        baseY: baseY,
        life: Math.random() * 100,
        maxLife: 100 + Math.random() * 50,
        size: 20 + Math.random() * 30,
        speed: 2 + Math.random() * 3,
        windOffset: 0,
        color: {
          r: 255,
          g: Math.floor(100 + Math.random() * 155),
          b: Math.floor(Math.random() * 50)
        }
      });
    }

    // Initialize embers
    for (let i = 0; i < config.embers; i++) {
      embers.push({
        x: Math.random() * emberCanvas.width,
        y: emberCanvas.height + Math.random() * 100,
        vx: (Math.random() - 0.5) * 4,
        vy: -(Math.random() * 3 + 1),
        size: Math.random() * 4 + 1,
        life: Math.random() * 255,
        maxLife: 255,
        heat: Math.random() * 0.8 + 0.2,
        trail: []
      });
    }

    // Initialize heat waves
    for (let i = 0; i < 20; i++) {
      heatWaves.push({
        x: Math.random() * heatCanvas.width,
        y: heatCanvas.height * 0.6 + Math.random() * heatCanvas.height * 0.4,
        amplitude: Math.random() * 10 + 5,
        frequency: Math.random() * 0.02 + 0.01,
        phase: Math.random() * Math.PI * 2,
        life: Math.random() * 1000
      });
    }

    let animationTime = 0;
    const wind = { x: 0, strength: config.windStrength };

    const drawFlames = () => {
      flameCtx.clearRect(0, 0, flameCanvas.width, flameCanvas.height);
      
      // Update wind
      wind.x = Math.sin(animationTime * 0.005) * wind.strength;

      flames.forEach((flame, index) => {
        // Update flame position and properties
        flame.life += flame.speed;
        flame.windOffset += wind.x * 0.1;
        
        const lifeRatio = flame.life / flame.maxLife;
        const height = config.flameHeight * (1 - lifeRatio);
        
        flame.x = flame.baseX + flame.windOffset + Math.sin(animationTime * 0.01 + index) * 10;
        flame.y = flame.baseY - height;
        
        // Color evolution (red -> orange -> yellow -> transparent)
        const alpha = 1 - lifeRatio;
        flame.color.r = 255;
        flame.color.g = Math.floor(100 + lifeRatio * 155);
        flame.color.b = Math.floor(lifeRatio * 100);

        // Draw flame with gradient
        const gradient = flameCtx.createRadialGradient(
          flame.x, flame.y, 0,
          flame.x, flame.y, flame.size
        );
        
        gradient.addColorStop(0, `rgba(${flame.color.r}, ${flame.color.g}, ${flame.color.b}, ${alpha})`);
        gradient.addColorStop(0.6, `rgba(${flame.color.r}, ${Math.floor(flame.color.g * 0.8)}, ${Math.floor(flame.color.b * 0.5)}, ${alpha * 0.6})`);
        gradient.addColorStop(1, `rgba(${Math.floor(flame.color.r * 0.8)}, ${Math.floor(flame.color.g * 0.4)}, 0, 0)`);

        flameCtx.fillStyle = gradient;
        flameCtx.shadowBlur = 20;
        flameCtx.shadowColor = `rgba(255, ${flame.color.g}, 0, 0.5)`;
        
        // Draw flame shape
        flameCtx.beginPath();
        flameCtx.ellipse(flame.x, flame.y, flame.size * (1 - lifeRatio * 0.5), flame.size * (2 - lifeRatio), 0, 0, Math.PI * 2);
        flameCtx.fill();

        // Reset flame when it dies
        if (flame.life >= flame.maxLife) {
          flame.life = 0;
          flame.x = flame.baseX;
          flame.y = flame.baseY;
          flame.windOffset = 0;
          flame.maxLife = 100 + Math.random() * 50;
        }
      });
    };

    const drawEmbers = () => {
      emberCtx.clearRect(0, 0, emberCanvas.width, emberCanvas.height);

      embers.forEach((ember) => {
        // Update ember physics
        ember.x += ember.vx + wind.x * 0.5;
        ember.y += ember.vy;
        ember.vy -= 0.02; // gravity
        ember.vx *= 0.999; // air resistance
        ember.life -= 2;

        // Add to trail
        ember.trail.push({ x: ember.x, y: ember.y, opacity: ember.life / ember.maxLife });
        if (ember.trail.length > 8) {
          ember.trail.shift();
        }

        // Draw trail
        ember.trail.forEach((point, index) => {
          const trailOpacity = point.opacity * (index / ember.trail.length);
          const hue = 60 - (ember.heat * 40); // Orange to red based on heat
          
          emberCtx.fillStyle = `hsla(${hue}, 100%, 50%, ${trailOpacity})`;
          emberCtx.shadowBlur = 10;
          emberCtx.shadowColor = `hsla(${hue}, 100%, 50%, ${trailOpacity * 0.5})`;
          
          emberCtx.beginPath();
          emberCtx.arc(point.x, point.y, ember.size * (index / ember.trail.length), 0, Math.PI * 2);
          emberCtx.fill();
        });

        // Draw main ember
        const alpha = ember.life / ember.maxLife;
        const hue = 60 - (ember.heat * 40);
        
        emberCtx.fillStyle = `hsla(${hue}, 100%, 60%, ${alpha})`;
        emberCtx.shadowBlur = 15;
        emberCtx.shadowColor = `hsla(${hue}, 100%, 50%, ${alpha * 0.8})`;
        
        emberCtx.beginPath();
        emberCtx.arc(ember.x, ember.y, ember.size, 0, Math.PI * 2);
        emberCtx.fill();

        // Reset ember when it dies or goes off screen
        if (ember.life <= 0 || ember.x < -50 || ember.x > emberCanvas.width + 50 || ember.y < -50) {
          ember.x = Math.random() * emberCanvas.width;
          ember.y = emberCanvas.height + Math.random() * 50;
          ember.vx = (Math.random() - 0.5) * 4;
          ember.vy = -(Math.random() * 3 + 1);
          ember.life = ember.maxLife;
          ember.heat = Math.random() * 0.8 + 0.2;
          ember.trail = [];
        }
      });
    };

    const drawHeatDistortion = () => {
      heatCtx.clearRect(0, 0, heatCanvas.width, heatCanvas.height);

      // Create heat shimmer effect
      const imageData = heatCtx.createImageData(heatCanvas.width, heatCanvas.height);
      const data = imageData.data;

      for (let y = 0; y < heatCanvas.height; y += 4) {
        for (let x = 0; x < heatCanvas.width; x += 4) {
          const distortion = Math.sin((x + animationTime) * 0.01) * Math.sin((y + animationTime * 1.5) * 0.008) * 10;
          const intensity = Math.max(0, (heatCanvas.height - y) / heatCanvas.height - 0.3) * 0.3;
          
          if (intensity > 0) {
            const index = (y * heatCanvas.width + x) * 4;
            data[index] = 255;     // Red
            data[index + 1] = 100; // Green
            data[index + 2] = 0;   // Blue
            data[index + 3] = intensity * 20; // Alpha
          }
        }
      }

      heatCtx.putImageData(imageData, 0, 0);
    };

    const animate = () => {
      animationTime++;
      
      drawFlames();
      drawEmbers();
      drawHeatDistortion();

      requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', setCanvasSize);
    };
  }, [intensity]);

  return (
    <>
      {/* Fire gradient background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-t from-orange-900 via-red-800 to-yellow-600 animate-fire-gradient" />
      
      {/* Smoke overlay */}
      <div className="fixed inset-0 z-1 opacity-20 animate-smoke">
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-gray-900/30 to-gray-800/60" />
      </div>

      {/* Heat distortion canvas */}
      <canvas
        ref={heatCanvasRef}
        className="fixed inset-0 pointer-events-none mix-blend-overlay"
        style={{ zIndex: 3, opacity: 0.6 }}
      />
      
      {/* Flame canvas */}
      <canvas
        ref={flameCanvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 5, opacity: 0.9 }}
      />
      
      {/* Ember canvas */}
      <canvas
        ref={emberCanvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 7, opacity: 0.8 }}
      />
      
      {/* Fire glow overlay */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at bottom, rgba(255, 69, 0, 0.3) 0%, rgba(255, 140, 0, 0.2) 30%, transparent 70%)',
          zIndex: 2
        }}
      />

      {/* Additional CSS for fire animations */}
      <style>{`
        @keyframes fire-gradient {
          0%, 100% {
            background-position: 0% 50%;
            filter: hue-rotate(0deg) brightness(1);
          }
          25% {
            background-position: 25% 75%;
            filter: hue-rotate(5deg) brightness(1.1);
          }
          50% {
            background-position: 100% 100%;
            filter: hue-rotate(10deg) brightness(0.95);
          }
          75% {
            background-position: 75% 25%;
            filter: hue-rotate(-5deg) brightness(1.05);
          }
        }
        .animate-fire-gradient {
          background-size: 200% 200%;
          animation: fire-gradient 8s ease-in-out infinite;
        }
        @keyframes smoke {
          0%, 100% {
            transform: translateX(0) scale(1);
            opacity: 0.2;
          }
          33% {
            transform: translateX(-10px) scale(1.1);
            opacity: 0.3;
          }
          66% {
            transform: translateX(10px) scale(0.9);
            opacity: 0.25;
          }
        }
        .animate-smoke {
          animation: smoke 12s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}