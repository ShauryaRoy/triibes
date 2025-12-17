import { useEffect, useRef } from 'react';

export function MatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Matrix characters (English, Numbers, and Symbols)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*';
    const fontSize = 16;
    const columns = Math.floor(canvas.width / fontSize);

    // Initialize drops - one per column
    const drops: number[] = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100;
    }

    // Animation control variables
    let animationFrameId: number;
    let lastTime = 0;
    const fps = 20; // Lower = slower
    const nextFrameTime = 1000 / fps;

    const animate = (timeStamp: number) => {
      const deltaTime = timeStamp - lastTime;

      if (deltaTime >= nextFrameTime) {
        lastTime = timeStamp - (deltaTime % nextFrameTime);

        // Semi-transparent black background for trail effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Set text properties
        ctx.font = `${fontSize}px monospace`;

        // Draw characters
        for (let i = 0; i < drops.length; i++) {
          const char = chars[Math.floor(Math.random() * chars.length)];

          // Create gradient
          const gradient = ctx.createLinearGradient(
            i * fontSize, drops[i] * fontSize - fontSize * 3,
            i * fontSize, drops[i] * fontSize
          );
          gradient.addColorStop(0, '#00ff41');
          gradient.addColorStop(0.5, '#00ff41');
          gradient.addColorStop(1, '#003B00');

          ctx.fillStyle = gradient;
          ctx.fillText(char, i * fontSize, drops[i] * fontSize);

          // Randomly reset drop to top
          if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
          }

          // Move drop down
          drops[i]++;
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate(0);

    // Cleanup
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