import { useEffect, useRef } from 'react';



export function FireStormBackground() {

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



    // Flame particle class

    class FlameParticle {

      x: number;

      y: number;

      baseX: number;

      size: number;

      speedY: number;

      speedX: number;

      life: number;

      maxLife: number;

      hue: number;

      wavePhase: number;



      constructor(x: number, y: number) {

        this.x = x;

        this.y = y;

        this.baseX = x;

        this.size = Math.random() * 40 + 20;

        this.speedY = Math.random() * -3 - 2;

        this.speedX = (Math.random() - 0.5) * 2;

        this.maxLife = Math.random() * 80 + 60;

        this.life = this.maxLife;

        this.hue = Math.random() * 60; // 0-60 for red to yellow

        this.wavePhase = Math.random() * Math.PI * 2;

      }



      update() {

        this.life--;

        this.y += this.speedY;

        this.wavePhase += 0.05;

        this.x = this.baseX + Math.sin(this.wavePhase) * 30;

        this.speedY *= 0.98; // Slow down as it rises

        this.size *= 0.98; // Shrink over time

      }



      draw(ctx: CanvasRenderingContext2D) {

        const lifeRatio = this.life / this.maxLife;

       

        // Create radial gradient for flame

        const gradient = ctx.createRadialGradient(

          this.x, this.y, 0,

          this.x, this.y, this.size

        );



        // Flame colors: white core -> yellow -> orange -> red -> transparent

        if (lifeRatio > 0.7) {

          gradient.addColorStop(0, `rgba(255, 255, 255, ${lifeRatio})`);

          gradient.addColorStop(0.3, `rgba(255, 240, 100, ${lifeRatio})`);

          gradient.addColorStop(0.6, `rgba(255, 150, 50, ${lifeRatio * 0.8})`);

          gradient.addColorStop(1, `rgba(255, 50, 0, 0)`);

        } else {

          gradient.addColorStop(0, `rgba(255, 200, 100, ${lifeRatio})`);

          gradient.addColorStop(0.4, `rgba(255, 100, 50, ${lifeRatio * 0.8})`);

          gradient.addColorStop(0.7, `rgba(200, 50, 20, ${lifeRatio * 0.5})`);

          gradient.addColorStop(1, `rgba(100, 20, 0, 0)`);

        }



        ctx.save();

        ctx.globalCompositeOperation = 'screen';

        ctx.fillStyle = gradient;

        ctx.beginPath();

        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);

        ctx.fill();

        ctx.restore();

      }



      isDead() {

        return this.life <= 0;

      }

    }



    // Ember particle class (smaller floating particles)

    class Ember {

      x: number;

      y: number;

      size: number;

      speedY: number;

      speedX: number;

      opacity: number;

      flickerPhase: number;

      flickerSpeed: number;



      constructor(width: number, height: number) {

        this.x = Math.random() * width;

        this.y = height + Math.random() * 100;

        this.size = Math.random() * 3 + 1;

        this.speedY = Math.random() * -2 - 1;

        this.speedX = (Math.random() - 0.5) * 0.5;

        this.opacity = Math.random() * 0.5 + 0.3;

        this.flickerPhase = Math.random() * Math.PI * 2;

        this.flickerSpeed = Math.random() * 0.05 + 0.02;

      }



      update(width: number, height: number) {

        this.y += this.speedY;

        this.x += this.speedX;

        this.flickerPhase += this.flickerSpeed;



        // Reset if goes off screen

        if (this.y < -10) {

          this.y = height + 10;

          this.x = Math.random() * width;

        }

      }



      draw(ctx: CanvasRenderingContext2D) {

        const flicker = (Math.sin(this.flickerPhase) + 1) * 0.5;

        const currentOpacity = this.opacity * flicker;



        ctx.save();

        ctx.shadowBlur = 10;

        ctx.shadowColor = '#ff6600';

        ctx.fillStyle = `rgba(255, ${100 + Math.floor(flicker * 100)}, 50, ${currentOpacity})`;

        ctx.beginPath();

        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);

        ctx.fill();

        ctx.restore();

      }

    }



    // Flame sources at bottom of screen

    const flameSources: { x: number; interval: number; counter: number }[] = [];

    const sourceCount = Math.floor(canvas.width / 200) + 3;

    for (let i = 0; i < sourceCount; i++) {

      flameSources.push({

        x: (canvas.width / sourceCount) * i + (canvas.width / sourceCount) / 2,

        interval: Math.random() * 3 + 2,

        counter: 0

      });

    }



    const flames: FlameParticle[] = [];

    const embers: Ember[] = [];

   

    // Create initial embers

    for (let i = 0; i < 80; i++) {

      embers.push(new Ember(canvas.width, canvas.height));

    }



    // Animation loop

    let animationFrameId: number;



    const animate = () => {

      // Dark gradient background (night/fire glow)

      const bgGradient = ctx.createLinearGradient(0, canvas.height, 0, 0);

      bgGradient.addColorStop(0, '#1a0a00');

      bgGradient.addColorStop(0.3, '#0d0500');

      bgGradient.addColorStop(1, '#000000');

      ctx.fillStyle = bgGradient;

      ctx.fillRect(0, 0, canvas.width, canvas.height);



      // Generate new flames from sources

      flameSources.forEach(source => {

        source.counter++;

        if (source.counter >= source.interval) {

          flames.push(new FlameParticle(source.x, canvas.height));

          source.counter = 0;

          source.interval = Math.random() * 3 + 2;

        }

      });



      // Update and draw flames

      for (let i = flames.length - 1; i >= 0; i--) {

        flames[i].update();

        flames[i].draw(ctx);

       

        if (flames[i].isDead()) {

          flames.splice(i, 1);

        }

      }



      // Update and draw embers

      embers.forEach(ember => {

        ember.update(canvas.width, canvas.height);

        ember.draw(ctx);

      });



      animationFrameId = requestAnimationFrame(animate);

    };



    animate();



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

