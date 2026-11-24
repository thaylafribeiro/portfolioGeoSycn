/* =========================================================
   GeoSync — Portfólio · script.js
   Vanilla JS, sem dependências.
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const map = (v, a, b) => clamp((v - a) / (b - a)); // normaliza v do intervalo [a,b] para [0,1]

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* Progresso (0→1) de uma seção "pinada" com position: sticky */
  function sectionProgress(el) {
    const r = el.getBoundingClientRect();
    const dist = r.height - innerHeight;
    if (dist > 50) return clamp(-r.top / dist);
    return clamp((innerHeight - r.top) / (innerHeight + r.height));
  }

  /* =======================================================
     1. SPLIT DE TEXTO (hero)
     ======================================================= */
  let charIndex = 0;
  $$('.split').forEach(el => {
    const nodes = [...el.childNodes];
    el.textContent = '';
    nodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(' ')); return; }
          const word = document.createElement('span');
          word.style.display = 'inline-block';
          word.style.whiteSpace = 'nowrap';
          [...part].forEach(ch => {
            const c = document.createElement('span');
            c.className = 'char';
            c.style.setProperty('--i', charIndex++);
            c.textContent = ch;
            word.appendChild(c);
          });
          el.appendChild(word);
        });
      } else {
        // elementos (ex.: <em>) animam como bloco único para manter o gradiente
        const c = document.createElement('span');
        c.className = 'char';
        c.style.setProperty('--i', charIndex++);
        c.appendChild(node);
        el.appendChild(c);
      }
    });
  });

  /* =======================================================
     2. MANIFESTO — palavra por palavra
     ======================================================= */
  const manifesto = $('#manifesto');
  const keyWords = ['GeoSync', 'tempo', 'real,', 'inteligência', 'preditiva', 'máxima', 'eficiência'];
  const words = manifesto.textContent.trim().split(/\s+/);
  manifesto.innerHTML = words
    .map(w => `<span class="word${keyWords.includes(w) ? ' is-key' : ''}">${w}</span>`)
    .join(' ');
  const wordEls = $$('.word', manifesto);

  /* =======================================================
     3. LOADER
     ======================================================= */
  const loader = $('#loader');
  const loaderBar = $('#loaderBar');
  const loaderCount = $('#loaderCount');
  let pageLoaded = false;
  addEventListener('load', () => { pageLoaded = true; });
  setTimeout(() => { pageLoaded = true; }, 3500); // não segura o usuário para sempre

  (function runLoader() {
    const minTime = reduceMotion ? 200 : 1600;
    const start = performance.now();
    let shown = 0;
    function tick(now) {
      const t = clamp((now - start) / minTime);
      const target = pageLoaded ? t : Math.min(t, .9);
      shown = lerp(shown, target, .12);
      if (target === 1 && shown > .995) shown = 1;
      loaderBar.style.transform = `scaleX(${shown})`;
      loaderCount.textContent = Math.round(shown * 100);
      if (shown < 1) return requestAnimationFrame(tick);
      setTimeout(finishLoader, 250);
    }
    requestAnimationFrame(tick);
  })();

  function finishLoader() {
    loader.classList.add('is-done');
    document.body.classList.remove('is-loading');
    setTimeout(() => document.body.classList.add('is-ready'), 350);
    setTimeout(() => loader.remove(), 1300);
  }

  /* =======================================================
     4. SMOOTH SCROLL (estilo Lenis, só desktop)
     ======================================================= */
  const smooth = { target: scrollY, current: scrollY, active: false, enabled: !reduceMotion && finePointer };
  const maxScroll = () => document.documentElement.scrollHeight - innerHeight;

  if (smooth.enabled) {
    addEventListener('wheel', e => {
      if (e.ctrlKey || document.body.classList.contains('is-loading')) return;
      e.preventDefault();
      const delta = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
      if (!smooth.active) smooth.current = scrollY;
      smooth.target = clamp(smooth.target + delta, 0, maxScroll());
      smooth.active = true;
    }, { passive: false });

    // teclado, barra de rolagem etc. ressincronizam o alvo
    addEventListener('scroll', () => {
      if (!smooth.active) smooth.target = smooth.current = scrollY;
    }, { passive: true });
  }

  function scrollToY(y) {
    y = clamp(y, 0, maxScroll());
    if (smooth.enabled) {
      smooth.current = scrollY;
      smooth.target = y;
      smooth.active = true;
    } else {
      scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }

  // âncoras internas
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      const target = id === '#top' ? document.body : $(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      scrollToY(id === '#top' ? 0 : target.getBoundingClientRect().top + scrollY);
    });
  });
  $('#toTop').addEventListener('click', () => scrollToY(0));

  /* =======================================================
     5. NAV + MENU MOBILE
     ======================================================= */
  const nav = $('#nav');
  const burger = $('#burger');
  const menu = $('#menu');
  let lastY = scrollY;

  function closeMenu() {
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false');
  }
  burger.addEventListener('click', () => {
    const open = !menu.classList.contains('is-open');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open));
  });

  function updateNav(y) {
    nav.classList.toggle('is-solid', y > 60);
    if (Math.abs(y - lastY) > 6) {
      nav.classList.toggle('is-hidden', y > lastY && y > 300 && !menu.classList.contains('is-open'));
      lastY = y;
    }
  }

  /* =======================================================
     6. CURSOR CUSTOMIZADO + MAGNÉTICO
     ======================================================= */
  const cursor = $('#cursor');
  const cursorDot = $('#cursorDot');
  const cursorLabel = $('#cursorLabel');
  const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  const ring = { x: mouse.x, y: mouse.y };

  if (finePointer) {
    addEventListener('mousemove', e => {
      mouse.x = e.clientX; mouse.y = e.clientY;
      cursorDot.style.transform = `translate(${mouse.x}px, ${mouse.y}px)`;
    });
    document.addEventListener('mouseleave', () => { cursor.classList.add('is-hidden'); cursorDot.classList.add('is-hidden'); });
    document.addEventListener('mouseenter', () => { cursor.classList.remove('is-hidden'); cursorDot.classList.remove('is-hidden'); });

    document.addEventListener('mouseover', e => {
      const labeled = e.target.closest('[data-cursor]');
      const hoverable = e.target.closest('a, button, .member');
      cursor.classList.toggle('is-label', !!labeled);
      cursor.classList.toggle('is-hover', !labeled && !!hoverable);
      cursorLabel.textContent = labeled ? labeled.dataset.cursor : '';
    });

    $$('[data-magnetic]').forEach(el => {
      const strength = 0.35;
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transition = 'transform .15s linear';
        el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transition = 'transform .7s cubic-bezier(.16,1,.3,1)';
        el.style.transform = '';
      });
    });
  }

  /* =======================================================
     7. MARQUEE com velocidade da rolagem
     ======================================================= */
  const marquees = $$('[data-marquee]').map(track => {
    track.innerHTML += track.innerHTML; // duplica para loop contínuo
    return { el: track, x: 0, dir: Number(track.dataset.dir || 1) };
  });

  /* =======================================================
     8. SCROLL HORIZONTAL
     ======================================================= */
  const hSection = $('#modulos');
  const hTrack = $('#hTrack');
  const hBar = $('#hBar');
  const hCount = $('#hCount');
  const hCards = $$('.card', hTrack);
  let hDistance = 0;

  function layoutHorizontal() {
    if (reduceMotion) return;
    hDistance = Math.max(0, hTrack.scrollWidth - innerWidth);
    hSection.style.height = `${hDistance + innerHeight}px`;
  }

  /* =======================================================
     9. PROCESSO — rota SVG desenhada pela rolagem
     ======================================================= */
  const process = $('#processo');
  const routeLine = $('#routeLine');
  const routeTruck = $('#routeTruck');
  const processLabel = $('#processLabel');
  const steps = $$('.step', process);
  const pins = $$('.route__pin', process);
  const stepNames = ['COLETA', 'PROCESSAMENTO', 'MONITORAMENTO'];
  const routeLen = routeLine.getTotalLength();
  routeLine.style.strokeDasharray = routeLen;
  routeLine.style.strokeDashoffset = routeLen;

  // descobre em que fração do caminho cada pino está
  const pinFractions = pins.map(pin => {
    const c = pin.querySelector('circle');
    const px = +c.getAttribute('cx'), py = +c.getAttribute('cy');
    let best = 0, bestD = Infinity;
    for (let i = 0; i <= 200; i++) {
      const pt = routeLine.getPointAtLength(routeLen * i / 200);
      const d = (pt.x - px) ** 2 + (pt.y - py) ** 2;
      if (d < bestD) { bestD = d; best = i / 200; }
    }
    return best;
  });
  let activeStep = -1;

  /* =======================================================
     10. REVEALS + CONTADORES
     ======================================================= */
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    });
  }, { threshold: .15, rootMargin: '0px 0px -8% 0px' });

  // escalonamento automático dentro de cada grupo
  $$('.reveal').forEach(el => {
    const siblings = [...el.parentElement.children].filter(s => s.classList.contains('reveal'));
    el.style.setProperty('--d', `${siblings.indexOf(el) * 0.08}s`);
    io.observe(el);
  });

  const counterIO = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const end = Number(el.dataset.count);
      const dur = reduceMotion ? 1 : 1600;
      const t0 = performance.now();
      (function step(now) {
        const t = clamp((now - t0) / dur);
        const eased = 1 - Math.pow(1 - t, 4);
        el.textContent = String(Math.round(end * eased)).padStart(String(end).length, '0');
        if (t < 1) requestAnimationFrame(step);
      })(t0);
      counterIO.unobserve(el);
    });
  }, { threshold: .6 });
  $$('[data-count]').forEach(el => counterIO.observe(el));

  /* =======================================================
     11. BENTO — spotlight que segue o mouse
     ======================================================= */
  const bento = $('#bento');
  const tiles = $$('.tile', bento);
  bento.addEventListener('pointermove', e => {
    tiles.forEach(tile => {
      const r = tile.getBoundingClientRect();
      tile.style.setProperty('--mx', `${e.clientX - r.left}px`);
      tile.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  /* =======================================================
     12. EQUIPE — preview da foto seguindo o cursor
     ======================================================= */
  const preview = $('#teamPreview');
  const previewInner = $('#teamPreviewInner');
  const previewPos = { x: mouse.x, y: mouse.y, rot: 0 };
  const previewImgs = {};

  if (finePointer) {
    $$('.member').forEach(member => {
      member.addEventListener('mouseenter', () => {
        const src = member.dataset.img;
        if (!previewImgs[src]) {
          const img = new Image();
          img.src = src;
          img.alt = '';
          previewInner.appendChild(img);
          previewImgs[src] = img;
        }
        Object.values(previewImgs).forEach(i => i.classList.remove('is-on'));
        previewInner.appendChild(previewImgs[src]); // traz para frente
        requestAnimationFrame(() => previewImgs[src].classList.add('is-on'));
        preview.classList.add('is-on');
      });
    });
    $('#teamList').addEventListener('mouseleave', () => preview.classList.remove('is-on'));
  }

  /* =======================================================
     13. FOOTER — letras gigantes reagem ao mouse
     ======================================================= */
  const giantLetters = $$('#giant span');
  const footer = $('.footer');
  if (finePointer) {
    footer.addEventListener('mousemove', e => {
      giantLetters.forEach(l => {
        const r = l.getBoundingClientRect();
        const d = Math.abs(e.clientX - (r.left + r.width / 2));
        const lift = Math.max(0, 1 - d / (innerWidth * .18));
        l.style.setProperty('--ty', `${-lift * 6}vw`);
      });
    });
    footer.addEventListener('mouseleave', () => giantLetters.forEach(l => l.style.setProperty('--ty', '0')));
  }

  /* =======================================================
     14. RELÓGIO, ANO e HUD do hero
     ======================================================= */
  $('#year').textContent = new Date().getFullYear();
  const clock = $('#clock');
  const tickClock = () => {
    clock.textContent = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  };
  tickClock();
  setInterval(tickClock, 1000);

  const hud = { lat: $('#lat'), lng: $('#lng'), vel: $('#vel') };
  let lat = -22.9056, lng = -47.0608;
  if (!reduceMotion) {
    setInterval(() => {
      lat += (Math.random() - .5) * .0008;
      lng += (Math.random() - .3) * .0008;
      hud.lat.textContent = lat.toFixed(4);
      hud.lng.textContent = lng.toFixed(4);
      hud.vel.textContent = Math.round(68 + Math.random() * 10);
    }, 900);
  }

  const heroVideo = $('#heroVideo');
  if (reduceMotion) heroVideo.pause();

  /* =======================================================
     15. LOOP PRINCIPAL (um único requestAnimationFrame)
     ======================================================= */
  const heroMedia = $('#heroMedia');
  const heroContent = $('#heroContent');
  const expand = $('#expand');
  const expandFrame = $('#expandFrame');
  const progressBar = $('#progress');
  let prevScroll = scrollY;
  let velocity = 0;

  function frame() {
    // smooth scroll
    if (smooth.enabled && smooth.active) {
      smooth.current = lerp(smooth.current, smooth.target, .1);
      if (Math.abs(smooth.target - smooth.current) < .5) {
        smooth.current = smooth.target;
        smooth.active = false;
      }
      scrollTo(0, smooth.current);
    }

    const y = scrollY;
    velocity = lerp(velocity, y - prevScroll, .2);
    prevScroll = y;

    // barra de progresso + nav
    progressBar.style.transform = `scaleX(${y / Math.max(1, maxScroll())})`;
    updateNav(y);

    // cursor (anel com atraso)
    if (finePointer) {
      ring.x = lerp(ring.x, mouse.x, .16);
      ring.y = lerp(ring.y, mouse.y, .16);
      cursor.style.transform = `translate(${ring.x}px, ${ring.y}px)`;

      const prevX = previewPos.x;
      previewPos.x = lerp(previewPos.x, mouse.x, .12);
      previewPos.y = lerp(previewPos.y, mouse.y, .12);
      previewPos.rot = lerp(previewPos.rot, clamp((previewPos.x - prevX) * .6, -14, 14), .15);
      preview.style.translate = `${previewPos.x}px ${previewPos.y}px`;
      preview.style.rotate = `${previewPos.rot}deg`;
    }

    if (!reduceMotion) {
      // HERO: vídeo encolhe para um card, texto sobe
      const hp = clamp(y / innerHeight);
      heroMedia.style.transform = `scale(${1 - hp * .12}) translateY(${hp * 8}%)`;
      heroMedia.style.borderRadius = `${hp * 48}px`;
      heroContent.style.transform = `translateY(${-hp * 140}px)`;
      heroContent.style.opacity = 1 - hp * 1.3;

      // MANIFESTO
      const mp = sectionProgress($('#sobre'));
      const lit = Math.floor(map(mp, .05, .85) * wordEls.length);
      wordEls.forEach((w, i) => w.classList.toggle('is-on', i < lit));

      // EXPAND
      const ep = sectionProgress(expand);
      const grow = 1 - Math.pow(1 - map(ep, .05, .6), 3);
      expandFrame.style.setProperty('--inset-y', `${(1 - grow) * 30}%`);
      expandFrame.style.setProperty('--inset-x', `${(1 - grow) * 32}%`);
      expandFrame.style.setProperty('--r', `${(1 - grow) * 32}px`);
      expandFrame.style.setProperty('--img-scale', 1.3 - grow * .3);
      expandFrame.style.setProperty('--cap', map(ep, .62, .85));

      // HORIZONTAL
      const hp2 = sectionProgress(hSection);
      hTrack.style.transform = `translate3d(${-hp2 * hDistance}px,0,0)`;
      hBar.style.transform = `scaleX(${hp2})`;
      hCount.textContent = String(Math.min(hCards.length, Math.round(hp2 * (hCards.length - 1)) + 1)).padStart(2, '0');
    }

    // PROCESSO
    const pp = map(sectionProgress(process), .05, .92);
    routeLine.style.strokeDashoffset = routeLen * (1 - pp);
    const pt = routeLine.getPointAtLength(routeLen * pp);
    routeTruck.setAttribute('cx', pt.x);
    routeTruck.setAttribute('cy', pt.y);
    let step = 0;
    pinFractions.forEach((f, i) => {
      const on = pp >= f - .001;
      pins[i].classList.toggle('is-on', on);
      if (on) step = i;
    });
    if (step !== activeStep) {
      activeStep = step;
      steps.forEach((s, i) => s.classList.toggle('is-active', i === step));
    }
    processLabel.textContent = `${stepNames[step]} · ${Math.round(pp * 100)}%`;

    // MARQUEE (sempre se move; acelera e inclina com a rolagem)
    if (!reduceMotion) {
      marquees.forEach(m => {
        const half = m.el.scrollWidth / 2;
        m.x -= (1 + Math.abs(velocity) * .25) * m.dir;
        if (m.x <= -half) m.x += half;
        if (m.x > 0) m.x -= half;
        const skew = clamp(velocity * -.3, -12, 12);
        m.el.style.transform = `translate3d(${m.x}px,0,0) skewX(${skew}deg)`;
      });
    }

    requestAnimationFrame(frame);
  }

  layoutHorizontal();
  addEventListener('resize', layoutHorizontal);
  addEventListener('load', layoutHorizontal);
  requestAnimationFrame(frame);
})();
