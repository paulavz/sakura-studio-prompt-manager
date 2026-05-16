// ─── Petal Rain Animation ─────────────────────────────────────────────────────

const PetalRain = ({ trigger }) => {
  const canvasRef = React.useRef(null);
  const animRef = React.useRef(null);
  const prevTrigger = React.useRef(0);

  React.useEffect(() => {
    if (trigger === prevTrigger.current) return;
    prevTrigger.current = trigger;

    const canvas = document.getElementById('petal-canvas');
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');

    // Cancel any running animation
    if (animRef.current) cancelAnimationFrame(animRef.current);

    // Create petals
    const petalCount = 38;
    const petals = Array.from({ length: petalCount }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 120,
      size: 5 + Math.random() * 8,
      speedY: 1.2 + Math.random() * 2.2,
      speedX: (Math.random() - 0.5) * 1.4,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.08,
      opacity: 0.6 + Math.random() * 0.4,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.02 + Math.random() * 0.03,
      // Petal color variations
      hue: 340 + Math.floor(Math.random() * 20), // pink range
      sat: 70 + Math.floor(Math.random() * 30),
      lit: 75 + Math.floor(Math.random() * 20),
    }));

    const drawPetal = (ctx, petal) => {
      ctx.save();
      ctx.translate(petal.x, petal.y);
      ctx.rotate(petal.rotation);
      ctx.globalAlpha = petal.opacity;

      // Draw a 5-petal sakura flower
      const s = petal.size;
      ctx.fillStyle = `hsl(${petal.hue}, ${petal.sat}%, ${petal.lit}%)`;

      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        ctx.save();
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(0, -s * 0.6, s * 0.38, s * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Center dot
      ctx.fillStyle = `hsl(${petal.hue - 10}, 60%, 95%)`;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.22, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const startTime = performance.now();
    const duration = 2800; // ms

    const animate = (now) => {
      const elapsed = now - startTime;
      if (elapsed > duration) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Fade out in last 600ms
      const fadeOut = elapsed > (duration - 600)
        ? 1 - (elapsed - (duration - 600)) / 600
        : 1;

      petals.forEach(p => {
        // Update position
        p.wobble += p.wobbleSpeed;
        p.x += p.speedX + Math.sin(p.wobble) * 0.7;
        p.y += p.speedY;
        p.rotation += p.rotationSpeed;

        // Temporary opacity factor
        const savedOpacity = p.opacity;
        p.opacity *= fadeOut;
        drawPetal(ctx, p);
        p.opacity = savedOpacity;
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [trigger]);

  return null;
};

Object.assign(window, { PetalRain });
