// Космический фон: статичные звёзды на отдельном canvas под графом.
// Слой ниже force-graph, без транслейта камерой — поэтому небо стоит на месте.
// Звёзды мерцают (sin-альфа), периодически проходят tihиe «падающие звёзды».

const STAR_COUNT_BASE = 300;
const NEBULA_COUNT = 4;

export function initStars() {
  const canvas = document.getElementById('stars');
  if (!canvas) return;

  // Respect user preference: пользователи с motion sensitivity получают
  // статичный фон без мерцания и падающих звёзд.
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ctx = canvas.getContext('2d');

  // Сцена пересчитывается при resize, но звёзды/туманности сохраняются.
  let stars = [];
  let nebulae = [];
  let shootingStars = [];

  function rand(min, max) { return min + Math.random() * (max - min); }

  function generate() {
    const w = canvas.width;
    const h = canvas.height;
    // Плотность пропорциональна площади (для больших экранов больше звёзд).
    const count = Math.round(STAR_COUNT_BASE * (w * h) / (1280 * 800));
    stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.pow(Math.random(), 3) * 1.6 + 0.3, // больше мелких, мало крупных
        baseAlpha: rand(0.25, 0.9),
        twinkleSpeed: rand(0.4, 1.6),
        twinklePhase: Math.random() * Math.PI * 2,
        hue: Math.random() < 0.85 ? null : (Math.random() < 0.5 ? '#a3c9ff' : '#ffd6a3'), // редкие голубые/оранжевые
      });
    }
    nebulae = [];
    const palette = [
      'rgba(120, 60, 200, 0.20)',  // фиолет
      'rgba(60, 130, 220, 0.15)',  // синий
      'rgba(200, 80, 160, 0.12)',  // розовый
      'rgba(80, 200, 200, 0.10)',  // циан
    ];
    for (let i = 0; i < NEBULA_COUNT; i++) {
      nebulae.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: rand(180, 380),
        color: palette[i % palette.length],
      });
    }
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0); // координаты в device pixels
    generate();
  }

  function spawnShooting() {
    const fromLeft = Math.random() < 0.5;
    const y = rand(0, canvas.height * 0.5);
    shootingStars.push({
      x: fromLeft ? -50 : canvas.width + 50,
      y,
      vx: (fromLeft ? 1 : -1) * rand(8, 14),
      vy: rand(2, 5),
      life: 0,
      maxLife: rand(60, 90),
    });
  }

  function frame(t) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Туманности — мягкое радиальное свечение
    for (const n of nebulae) {
      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      grad.addColorStop(0, n.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }

    // Звёзды
    const time = t * 0.001;
    for (const s of stars) {
      // reduce-motion: статичная альфа без мерцания
      const tw = reduceMotion ? 1 : (0.5 + 0.5 * Math.sin(time * s.twinkleSpeed + s.twinklePhase));
      const alpha = s.baseAlpha * (0.6 + 0.4 * tw);
      ctx.fillStyle = s.hue
        ? hexToRgba(s.hue, alpha)
        : `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      // Самые крупные звёзды — лёгкое свечение
      if (s.r > 1.4) {
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.15})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Падающие звёзды — отключаем при prefers-reduced-motion
    if (!reduceMotion && Math.random() < 0.003 && shootingStars.length < 2) spawnShooting();
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const sh = shootingStars[i];
      sh.x += sh.vx;
      sh.y += sh.vy;
      sh.life++;
      const alpha = 1 - sh.life / sh.maxLife;
      const tailLen = 60;
      const gx = sh.x - sh.vx * tailLen / Math.hypot(sh.vx, sh.vy);
      const gy = sh.y - sh.vy * tailLen / Math.hypot(sh.vx, sh.vy);
      const grad = ctx.createLinearGradient(gx, gy, sh.x, sh.y);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(1, `rgba(255,255,255,${alpha})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(sh.x, sh.y);
      ctx.stroke();
      if (sh.life > sh.maxLife || sh.x < -100 || sh.x > w + 100) {
        shootingStars.splice(i, 1);
      }
    }

    requestAnimationFrame(frame);
  }

  function hexToRgba(hex, a) {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
}
