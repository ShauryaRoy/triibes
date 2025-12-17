import { useEffect, useRef } from 'react';

export function WarpSpeedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- CONFIGURATION ---
    // Detect mobile by width (standard breakpoint)
    const isMobile = window.innerWidth < 768;

    // DRASTICALLY reduce speed on mobile to make it readable
    const speed = isMobile ? 8 : 25; 
    
    // Reduce count on mobile to prevent clutter/lag
    const starCount = isMobile ? 250 : 600; 

    // --- RESIZE HANDLER ---
    let width = window.innerWidth;
    let height = window.innerHeight;
    
    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // --- STAR CLASS ---
    class Star {
      x: number;
      y: number;
      z: number;
      color: string;
      radius: number;

      constructor() {
        this.reset(true);
      }

      reset(initial: boolean = false) {
        // Random position
        this.x = (Math.random() - 0.5) * width * 3; 
        this.y = (Math.random() - 0.5) * height * 3;
        
        // Depth (Z)
        this.z = initial ? Math.random() * width : width;
        
        // Make stars slightly smaller on mobile for sharpness
        const baseSize = isMobile ? 1.5 : 2;
        this.radius = Math.random() * baseSize + 0.5;

        // Dynamic Sci-Fi Colors
        const hue = Math.random();
        if (hue < 0.3) {
          this.color = '#00f3ff'; // Cyan
        } else if (hue < 0.6) {
          this.color = '#bd00ff'; // Magenta
        } else if (hue < 0.8) {
          this.color = '#0066ff'; // Electric Blue
        } else {
          this.color = '#ffffff'; // White core
        }
      }

      update() {
        this.z -= speed;

        if (this.z <= 1) {
          this.reset();
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        // Perspective projection formula
        const sx = (this.x / this.z) * width + width / 2;
        const sy = (this.y / this.z) * width + height / 2;

        // "Tail" position for motion blur
        // On mobile, we reduce the tail length multiplier so lines aren't too long
        const tailFactor = isMobile ? 1.2 : 1.5;
        const tailZ = this.z + speed * tailFactor; 
        const tailX = (this.x / tailZ) * width + width / 2;
        const tailY = (this.y / tailZ) * width + height / 2;

        const size = (1 - this.z / width) * this.radius * 2;
        
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(sx, sy);
        
        ctx.strokeStyle = this.color;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        
        // Disable glow on mobile for better performance
        if (!isMobile) {
            ctx.shadowBlur = size * 2;
            ctx.shadowColor = this.color;
        }
        
        ctx.stroke();
        
        ctx.shadowBlur = 0;
      }
    }

    // Initialize stars
    const stars: Star[] = Array.from({ length: starCount }, () => new Star());

    // --- ANIMATION LOOP ---
    let animationFrameId: number;

    const animate = () => {
      ctx.fillStyle = 'rgba(10, 10, 20, 0.4)'; 
      ctx.fillRect(0, 0, width, height);

      // Draw center glow
      const gradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, width * 0.4
      );
      gradient.addColorStop(0, 'rgba(200, 255, 255, 0.05)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      stars.sort((a, b) => b.z - a.z);

      stars.forEach(star => {
        star.update();
        star.draw(ctx);
      });

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