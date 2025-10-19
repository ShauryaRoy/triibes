import { useEffect, useRef } from 'react';

interface ElectricStormProps {
  intensity?: 'low' | 'medium' | 'high';
}

export function ElectricStorm({ intensity = 'high' }: ElectricStormProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lightningCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const lightningCanvas = lightningCanvasRef.current;
    if (!canvas || !lightningCanvas) return;

    const ctx = canvas.getContext('2d');
    const lightningCtx = lightningCanvas.getContext('2d');
    if (!ctx || !lightningCtx) return;

    // Set canvas size
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      lightningCanvas.width = window.innerWidth;
      lightningCanvas.height = window.innerHeight;
    };
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    // Rain drops configuration
    const rainDropCount = intensity === 'high' ? 400 : intensity === 'medium' ? 250 : 150;
    const rainDrops: Array<{
      x: number;
      y: number;
      length: number;
      speed: number;
      opacity: number;
    }> = [];

    // Initialize rain drops
    for (let i = 0; i < rainDropCount; i++) {
      rainDrops.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        length: Math.random() * 20 + 10,
        speed: Math.random() * 3 + 2,
        opacity: Math.random() * 0.3 + 0.2,
      });
    }

    // Lightning configuration
    let lightningTimeout: NodeJS.Timeout | null = null;
    let lightningFlashDuration = 0;
    let lightningBranches: Array<{
      points: Array<{ x: number; y: number }>;
      opacity: number;
    }> = [];

    const createLightning = () => {
      lightningBranches = [];
      const startX = Math.random() * canvas.width;
      const startY = 0;
      
      // Main lightning bolt
      const mainBranch: Array<{ x: number; y: number }> = [];
      let currentX = startX;
      let currentY = startY;
      
      while (currentY < canvas.height) {
        mainBranch.push({ x: currentX, y: currentY });
        currentX += (Math.random() - 0.5) * 50;
        currentY += Math.random() * 30 + 20;
      }
      
      lightningBranches.push({
        points: mainBranch,
        opacity: 1,
      });

      // Add side branches
      const branchCount = intensity === 'high' ? 5 : intensity === 'medium' ? 3 : 2;
      for (let i = 0; i < branchCount; i++) {
        const branchStartIndex = Math.floor(Math.random() * (mainBranch.length - 1));
        const branchStart = mainBranch[branchStartIndex];
        const sideBranch: Array<{ x: number; y: number }> = [branchStart];
        
        let branchX = branchStart.x;
        let branchY = branchStart.y;
        const branchLength = Math.random() * 5 + 3;
        
        for (let j = 0; j < branchLength; j++) {
          branchX += (Math.random() - 0.5) * 40;
          branchY += Math.random() * 25 + 15;
          sideBranch.push({ x: branchX, y: branchY });
        }
        
        lightningBranches.push({
          points: sideBranch,
          opacity: 0.7,
        });
      }
      
      lightningFlashDuration = 8;
    };

    const drawLightning = () => {
      lightningCtx.clearRect(0, 0, lightningCanvas.width, lightningCanvas.height);
      
      if (lightningFlashDuration > 0) {
        // Draw lightning flash background
        const flashOpacity = Math.min(lightningFlashDuration / 8, 0.3);
        lightningCtx.fillStyle = `rgba(147, 197, 253, ${flashOpacity})`;
        lightningCtx.fillRect(0, 0, lightningCanvas.width, lightningCanvas.height);
        
        // Draw lightning bolts
        lightningBranches.forEach((branch) => {
          const opacity = (lightningFlashDuration / 8) * branch.opacity;
          
          // Outer glow
          lightningCtx.strokeStyle = `rgba(96, 165, 250, ${opacity * 0.5})`;
          lightningCtx.lineWidth = 8;
          lightningCtx.shadowBlur = 20;
          lightningCtx.shadowColor = '#60a5fa';
          lightningCtx.beginPath();
          branch.points.forEach((point, index) => {
            if (index === 0) {
              lightningCtx.moveTo(point.x, point.y);
            } else {
              lightningCtx.lineTo(point.x, point.y);
            }
          });
          lightningCtx.stroke();
          
          // Inner bolt
          lightningCtx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
          lightningCtx.lineWidth = 3;
          lightningCtx.shadowBlur = 10;
          lightningCtx.shadowColor = '#ffffff';
          lightningCtx.beginPath();
          branch.points.forEach((point, index) => {
            if (index === 0) {
              lightningCtx.moveTo(point.x, point.y);
            } else {
              lightningCtx.lineTo(point.x, point.y);
            }
          });
          lightningCtx.stroke();
        });
        
        lightningFlashDuration--;
      }
    };

    const scheduleLightning = () => {
      const delay = Math.random() * 4000 + 2000; // Random delay between 2-6 seconds
      lightningTimeout = setTimeout(() => {
        createLightning();
        scheduleLightning();
      }, delay);
    };

    scheduleLightning();

    // Animation loop for rain
    const animate = () => {
      // Clear canvas
      ctx.fillStyle = 'rgba(15, 23, 42, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw and update rain drops
      rainDrops.forEach((drop) => {
        // Draw rain drop
        ctx.strokeStyle = `rgba(147, 197, 253, ${drop.opacity})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 2, drop.y + drop.length);
        ctx.stroke();

        // Update position
        drop.y += drop.speed;
        drop.x -= 0.5;

        // Reset drop when it goes off screen
        if (drop.y > canvas.height) {
          drop.y = -20;
          drop.x = Math.random() * canvas.width;
        }
      });

      // Draw lightning
      drawLightning();

      requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', setCanvasSize);
      if (lightningTimeout) {
        clearTimeout(lightningTimeout);
      }
    };
  }, [intensity]);

  return (
    <>
      {/* Animated gradient background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-slate-950 via-blue-950 to-cyan-950 animate-storm-gradient" />
      
      {/* Dynamic storm clouds */}
      <div className="fixed inset-0 -z-19 opacity-30 animate-clouds">
        <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-gray-900/80 to-transparent" />
      </div>
      
      {/* Rain canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ opacity: 0.8, zIndex: 5 }}
      />
      
      {/* Lightning canvas */}
      <canvas
        ref={lightningCanvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 15 }}
      />
      
      {/* Cloud overlay */}
      <div 
        className="fixed inset-0 -z-15 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at top, rgba(51, 65, 85, 0.4) 0%, transparent 50%)',
        }}
      />
      
      {/* Additional CSS for storm gradient animation */}
      <style>{`
        @keyframes storm-gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-storm-gradient {
          background-size: 200% 200%;
          animation: storm-gradient 20s ease infinite;
        }
        @keyframes clouds {
          0%, 100% {
            transform: translateX(0);
            opacity: 0.3;
          }
          50% {
            transform: translateX(50px);
            opacity: 0.5;
          }
        }
        .animate-clouds {
          animation: clouds 30s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
