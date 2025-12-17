import { useEffect, useRef } from 'react';

export function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- RESIZE HANDLER ---
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      // Re-initialize mountains on resize to fix height
      initMountains();
    };
    window.addEventListener('resize', resizeCanvas);
    
    // Initial size set
    canvas.width = width;
    canvas.height = height;

    // --- AURORA CLASS ---
    class Wave {
      amplitude: number;
      frequency: number;
      phase: number;
      speed: number;
      color: string;
      opacity: number;
      baseYOffset: number;
      baseOpacity: number;
      verticalPhase: number;
      verticalSpeed: number;

      constructor(
        amplitude: number,
        frequency: number,
        phase: number,
        speed: number,
        color: string,
        opacity: number,
        yOffset: number
      ) {
        this.amplitude = amplitude;
        this.frequency = frequency;
        this.phase = phase;
        this.speed = speed;
        this.color = color;
        this.baseOpacity = opacity;
        this.opacity = opacity;
        this.baseYOffset = yOffset;
        this.verticalPhase = Math.random() * Math.PI * 2;
        this.verticalSpeed = Math.random() * 0.002 + 0.001;
      }

      update() {
        this.phase += this.speed;
        this.verticalPhase += this.verticalSpeed;
        
        // Slow pulsing opacity
        this.opacity = this.baseOpacity + Math.sin(this.verticalPhase * 3) * 0.1;
        this.opacity = Math.max(0.05, Math.min(0.4, this.opacity));
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const currentY = this.baseYOffset + Math.sin(this.verticalPhase) * 20;

        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, `${this.color}00`);
        gradient.addColorStop(0.5, `${this.color}${Math.floor(this.opacity * 255).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, `${this.color}00`);

        ctx.beginPath();
        ctx.moveTo(0, height);

        for (let x = 0; x <= width; x += 5) {
          const y = currentY +
            Math.sin((x * this.frequency + this.phase) * 0.01) * this.amplitude +
            Math.sin((x * this.frequency * 0.5 + this.phase * 1.5) * 0.01) * (this.amplitude * 0.5);
          ctx.lineTo(x, y);
        }

        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.shadowBlur = 30;
        ctx.shadowColor = this.color;
        ctx.restore();
      }
    }

    // --- MOUNTAIN CLASS ---
    class MountainRange {
      points: { x: number; y: number }[];
      speed: number;
      color: string;
      segmentWidth: number;
      roughness: number;

      constructor(speed: number, color: string, roughness: number) {
        this.speed = speed;
        this.color = color;
        this.roughness = roughness;
        this.segmentWidth = 30; // Distance between peaks
        this.points = [];
        this.populate();
      }

      populate() {
        // Fill screen with mountain points
        let currentX = -this.segmentWidth;
        while (currentX < width + this.segmentWidth * 2) {
          this.addPoint(currentX);
          currentX += this.segmentWidth;
        }
      }

      addPoint(x: number) {
        // Generate a y height relative to the bottom of the screen
        // Higher roughness = taller, more jagged mountains
        const yNoise = Math.random() * this.roughness; 
        const yBase = height - (this.roughness * 0.5); // Base height
        this.points.push({ x, y: yBase - yNoise });
      }

      update() {
        // Move all points to the left
        this.points.forEach(p => p.x -= this.speed);

        // Remove points that have gone off the left side
        if (this.points[0].x < -this.segmentWidth * 2) {
          this.points.shift();
        }

        // Add new points to the right side to keep the chain going
        const lastPoint = this.points[this.points.length - 1];
        if (lastPoint.x < width + this.segmentWidth * 2) {
          this.addPoint(lastPoint.x + this.segmentWidth);
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        
        // Start below the first point to ensure bottom corners are filled
        ctx.moveTo(this.points[0].x, height); 
        
        // Connect the peaks
        this.points.forEach(p => ctx.lineTo(p.x, p.y));
        
        // Close the shape at bottom right
        ctx.lineTo(this.points[this.points.length - 1].x, height);
        ctx.lineTo(this.points[0].x, height);
        
        ctx.fill();
      }
    }

    // --- INITIALIZATION ---
    
    // 1. Setup Waves
    const waves = [
      new Wave(150, 0.8, 0, 0.02, '#00ff88', 0.2, height * 0.3),
      new Wave(120, 1.2, Math.PI, 0.01, '#00ffaa', 0.15, height * 0.35),
      new Wave(140, 1.0, Math.PI * 1.5, 0.015, '#cc00ff', 0.18, height * 0.4),
      new Wave(170, 0.7, Math.PI * 0.3, 0.020, '#00ccff', 0.2, height * 0.28),
    ];

    // 2. Setup Stars
    const stars: { x: number; y: number; radius: number; opacity: number; flickerSpeed: number }[] = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.7,
        radius: Math.random() * 1.2 + 0.3,
        opacity: Math.random(),
        flickerSpeed: Math.random() * 0.05 + 0.01, // Individual flicker speeds
      });
    }

    // 3. Setup Mountains
    let backMountains: MountainRange;
    let frontMountains: MountainRange;

    const initMountains = () => {
      // Back layer: Slower, darker, smaller
      backMountains = new MountainRange(0.2, '#000814', 150);
      // Front layer: Slightly faster, closer (taller)
      frontMountains = new MountainRange(0.4, '#000000', 100); 
    };
    initMountains();


    // --- ANIMATION LOOP ---
    let animationFrameId: number;

    const animate = () => {
      // Background (Night Sky)
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, '#020024');
      bgGradient.addColorStop(0.5, '#090979');
      bgGradient.addColorStop(1, '#000000');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Draw Stars
      stars.forEach(star => {
        // Flicker effect: Simple sine wave based on time for smooth but random-looking twinkling
        star.opacity += (Math.random() - 0.5) * 0.1; // Random walk
        // Clamp opacity
        star.opacity = Math.max(0.1, Math.min(1, star.opacity));

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.fill();
      });

      // Draw Aurora
      waves.forEach(wave => {
        wave.update();
        wave.draw(ctx);
      });

      // Draw Mountains
      if (backMountains) {
        backMountains.update();
        backMountains.draw(ctx);
      }
      if (frontMountains) {
        frontMountains.update();
        frontMountains.draw(ctx);
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}