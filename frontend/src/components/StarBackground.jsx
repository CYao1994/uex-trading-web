import { memo, useEffect, useRef, useState } from 'react';

function StarBackground() {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [isDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth > 768);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseRef.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
      setParallax({
        x: (e.clientX / window.innerWidth - 0.5) * 50,
        y: (e.clientY / window.innerHeight - 0.5) * 35,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const isMobile = window.innerWidth < 768;
    const starCount = isMobile ? 60 : 120;


    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * 2000,
      y: Math.random() * 2000,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.8 + 0.2,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.02 + 0.01,
    }));

    const hexPoints = (cx, cy, r) => {
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
      }
      return pts;
    };

    let frame;
    let time = 0;

    const animate = () => {
      time += 0.016;

      ctx.clearRect(0, 0, width, height);

      // 星星
      stars.forEach(star => {
        const twinkle = Math.sin(time * star.speed * 10 + star.phase) * 0.2;
        const x = (star.x + time * 5) % width;
        const y = (star.y + time * 2) % height;
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity + twinkle})`;
        ctx.fillRect(x, y, star.size, star.size);
      });

      // 扫描线 - 从上到下
      const scanY = (time * 40) % (height + 100) - 50;
      const scanGrad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
      scanGrad.addColorStop(0, 'transparent');
      scanGrad.addColorStop(0.3, 'rgba(150, 200, 255, 0.03)');
      scanGrad.addColorStop(0.5, 'rgba(180, 220, 255, 0.06)');
      scanGrad.addColorStop(0.7, 'rgba(150, 200, 255, 0.03)');
      scanGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 30, width, 60);

      ctx.strokeStyle = 'rgba(180, 220, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(width, scanY);
      ctx.stroke();

      // 六边形HUD - 左上角
      ctx.lineWidth = 0.5;
      [90, 60, 32].forEach((r, idx) => {
        const pulse = Math.sin(time * 0.5 + idx * 0.3) * 0.01;
        ctx.strokeStyle = `rgba(180, 210, 250, ${0.05 + pulse - idx * 0.012})`;
        ctx.beginPath();
        const pts = hexPoints(110, 110, r);
        pts.forEach((p, j) => j === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]));
        ctx.closePath();
        ctx.stroke();
      });

      // 六边形HUD - 右下角
      ctx.save();
      ctx.translate(width - 100, height - 100);
      ctx.rotate(Math.PI / 6);
      ctx.lineWidth = 0.4;
      [70, 45, 25].forEach((r, idx) => {
        const pulse = Math.sin(time * 0.4 + idx * 0.4) * 0.008;
        ctx.strokeStyle = `rgba(180, 210, 250, ${0.04 + pulse - idx * 0.01})`;
        ctx.beginPath();
        const pts = hexPoints(0, 0, r);
        pts.forEach((p, j) => j === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]));
        ctx.closePath();
        ctx.stroke();
      });
      ctx.restore();

      // 暗角效果
      const vignette = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.6);
      vignette.addColorStop(0, 'transparent');
      vignette.addColorStop(0.6, 'transparent');
      vignette.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      frame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, pointerEvents: 'none', overflow: 'hidden', background: '#010308' }}>
      {isDesktop && (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          minWidth: '105%',
          minHeight: '105%',
          transform: `translate(calc(-50% + ${parallax.x}px), calc(-50% + ${parallax.y}px))`,
          objectFit: 'cover',
        }}
      >
        <source src="/sc-combat-bg.mp4" type="video/mp4" />
      </video>
      )}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}

export default memo(StarBackground);
