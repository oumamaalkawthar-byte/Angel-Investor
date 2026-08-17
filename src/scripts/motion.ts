import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function showEverythingStatically() {
  gsap.set('[data-reveal], [data-hero-fade], [data-hero-word]', { clearProps: 'all' });
  gsap.utils.toArray<HTMLElement>('[data-counter]').forEach((el) => {
    const target = Number(el.dataset.counter ?? '0');
    const suffix = el.dataset.counterSuffix ?? '';
    el.textContent = target.toLocaleString() + suffix;
  });
}

function initReveals() {
  gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: 32 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      }
    );
  });
}

function initHero() {
  const words = gsap.utils.toArray<HTMLElement>('[data-hero-word]');
  if (!words.length) return;
  gsap.set(words, { yPercent: 110 });
  gsap.to(words, {
    yPercent: 0,
    duration: 0.9,
    ease: 'power4.out',
    stagger: 0.06,
    delay: 0.15,
  });

  gsap.fromTo(
    '[data-hero-fade]',
    { autoAlpha: 0, y: 20 },
    { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 0.6, stagger: 0.1 }
  );
}

function initCounters() {
  gsap.utils.toArray<HTMLElement>('[data-counter]').forEach((el) => {
    const target = Number(el.dataset.counter ?? '0');
    const suffix = el.dataset.counterSuffix ?? '';
    const counter = { value: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.to(counter, {
          value: target,
          duration: 1.6,
          ease: 'power2.out',
          onUpdate: () => {
            el.textContent = Math.round(counter.value).toLocaleString() + suffix;
          },
        });
      },
    });
  });
}

function initMagnetic() {
  gsap.utils.toArray<HTMLElement>('[data-magnetic]').forEach((el) => {
    const strength = 0.35;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      gsap.to(el, { x: x * strength, y: y * strength, duration: 0.3, ease: 'power2.out' });
    };
    const onLeave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.4, ease: 'elastic.out(1, 0.4)' });
    };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
  });
}

function initLineDraw() {
  gsap.utils.toArray<SVGPathElement>('[data-line-draw]').forEach((path) => {
    const length = path.getTotalLength();
    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
    gsap.to(path, {
      strokeDashoffset: 0,
      duration: 1.4,
      ease: 'power2.inOut',
      scrollTrigger: {
        trigger: path,
        start: 'top 80%',
        toggleActions: 'play none none reverse',
      },
    });
  });
}

function initAll() {
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  gsap.killTweensOf('[data-reveal], [data-hero-fade], [data-hero-word], [data-magnetic]');

  if (prefersReducedMotion()) {
    showEverythingStatically();
    return;
  }

  initHero();
  initReveals();
  initCounters();
  initMagnetic();
  initLineDraw();
}

document.addEventListener('astro:page-load', initAll);
