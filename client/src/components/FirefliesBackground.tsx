import { useEffect, useRef } from 'react';

export function FirefliesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle Resize
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Track Mouse
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Configuration
    const config = {
      particleCount: 80, // Adjust based on density preference
      mouseRadius: 150,
      mouseForce: 0.05,
    };

    class Firefly {
      x: number;
      y: number;
      z: number; // Depth factor (0.1 to 1)
      size: number;
      vx: number;
      vy: number;
      angle: number; // For organic wavy movement
      angleSpeed: number;
      color: string;
      brightness: number;
      pulseSpeed: number;
      pulseOffset: number;

      constructor(w: number, h: number) {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        // Z-index simulation: 1 is close/fast, 0.1 is far/slow
        this.z = Math.random() * 0.8 + 0.2; 
        
        this.size = Math.random() * 2 + 1;
        this.angle = Math.random() * Math.PI * 2;
        this.angleSpeed = Math.random() * 0.02 + 0.01;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        
        this.pulseSpeed = Math.random() * 0.03 + 0.01;
        this.pulseOffset = Math.random() * Math.PI * 2;
        
        // Color Palette: Gold, Amber, and a hint of Teal
        const hue = Math.random() > 0.8 ? 160 : 45 + Math.random() * 15; // 80% Gold/Amber, 20% Teal
        const sat = 100;
        const light = 60 + Math.random() * 20;
        this.color = `hsl(${hue}, ${sat}%, ${light}%)`;
      }

      update(w: number, h: number, mouseX: number, mouseY: number) {
        // Organic sinusoidal movement (Wobble)
        this.angle += this.angleSpeed;
        
        // Base drift speed modified by depth (parallax)
        const driftX = Math.cos(this.angle) * 0.2 * this.z;
        const driftY = Math.sin(this.angle) * 0.2 * this.z;

        // Interaction: Repel from mouse
        const dx = this.x - mouseX;
        const dy = this.y - mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        let forceX = 0;
        let forceY = 0;

        if (distance < config.mouseRadius) {
          const force = (config.mouseRadius - distance) / config.mouseRadius;
          const angle = Math.atan2(dy, dx);
          forceX = Math.cos(angle) * force * 2; // Strength of push
          forceY = Math.sin(angle) * force * 2;
        }

        // Apply movement
        this.x += (this.vx + driftX + forceX) * this.z; // Apply depth speed multiplier
        this.y += (this.vy + driftY + forceY) * this.z;

        // Wrap around screen
        if (this.x < -50) this.x = w + 50;
        if (this.x > w + 50) this.x = -50;
        if (this.y < -50) this.y = h + 50;
        if (this.y > h + 50) this.y = -50;
      }

      draw(ctx: CanvasRenderingContext2D) {
        // Calculate pulse
        const time = Date.now() * 0.002;
        const pulse = Math.sin(time * this.pulseSpeed * 5 + this.pulseOffset);
        const alpha = 0.3 + (pulse + 1) * 0.35; // Alpha oscillates between 0.3 and 1.0

        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Use depth (z) to scale size - things further away are smaller
        const scale = this.z; 
        ctx.scale(scale, scale);

        // Core glow (Intense center)
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 4);
        
        // We use HSLA for easier opacity manipulation
        const c = this.color; 
        // Extract HSL values to inject alpha - simplified for performance
        // Actually, let's use the color string directly but rely on GlobalCompositeOperation for the glow
        
        gradient.addColorStop(0, this.color.replace(')', ', 1)')); 
        gradient.addColorStop(0.1, this.color.replace(')', `, ${alpha})`));
        gradient.addColorStop(0.4, this.color.replace(')', `, ${alpha * 0.2})`));
        gradient.addColorStop(1, this.color.replace(')', ', 0)'));

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    // Initialize Particles
    const fireflies: Firefly[] = [];
    for (let i = 0; i < config.particleCount; i++) {
      fireflies.push(new Firefly(canvas.width, canvas.height));
    }

    // Animation Loop
    let animationFrameId: number;

    const animate = () => {
      // 1. Clear with a slight fade for trails (optional, but 'clearRect' is cleaner for fireflies)
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 2. Draw Background (Deep Radial Vignette)
      // This creates a "spotlight" effect in the center
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width
      );
      gradient.addColorStop(0, '#0f172a'); // Slate-900 (Lighter center)
      gradient.addColorStop(1, '#020617'); // Slate-950 (Dark edges)
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 3. Set Blend Mode to "Screen" or "Lighter"
      // This is crucial! It makes overlapping lights get brighter, like real light.
      ctx.globalCompositeOperation = 'screen';

      fireflies.forEach(firefly => {
        firefly.update(canvas.width, canvas.height, mouseRef.current.x, mouseRef.current.y);
        firefly.draw(ctx);
      });

      // Reset blend mode for next frame (if you draw other things)
      ctx.globalCompositeOperation = 'source-over';

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }} // Ensure it stays behind content
    />
  );
}