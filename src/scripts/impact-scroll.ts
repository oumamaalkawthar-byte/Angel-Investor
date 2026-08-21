import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function initImpact() {
  const root = document.querySelector<HTMLElement>('[data-impact]');
  if (!root) return;

  const stage = root.querySelector<HTMLElement>('[data-impact-stage]');
  const numbers = [...root.querySelectorAll<HTMLElement>('[data-impact-number]')];
  const copies = [...root.querySelectorAll<HTMLElement>('[data-impact-copy]')];
  const nav = [...root.querySelectorAll<HTMLButtonElement>('[data-impact-nav]')];
  const counter = root.querySelector<HTMLElement>('[data-impact-index]');
  const label = root.querySelector<HTMLElement>('[data-impact-label]');
  const count = numbers.length;
  let active = -1;

  const setActive = (next: number, immediate = false) => {
    if (next === active || next < 0 || next >= count) return;
    active = next;
    root.className = root.className.replace(/tone-\d/g, `tone-${next}`);
    if (counter) counter.textContent = String(next + 1).padStart(2, '0');
    if (label) label.textContent = copies[next]?.querySelector('p')?.textContent ?? '';

    numbers.forEach((number, index) => {
      const delta = index - next;
      gsap.to(number, {
        y: delta === 0 ? 0 : delta < 0 ? -205 : 205,
        rotationX: delta === 0 ? -3 : delta < 0 ? 30 : -30,
        z: delta === 0 ? 95 : -45,
        scale: delta === 0 ? 1.03 : .84,
        opacity: delta === 0 ? 1 : 0,
        filter: delta === 0 ? 'drop-shadow(0 20px 12px rgba(7,27,42,.18))' : 'none',
        duration: immediate ? 0 : .78,
        ease: 'power3.out',
      });
    });

    copies.forEach((copy, index) => gsap.to(copy, {
      autoAlpha: index === next ? 1 : 0,
      y: index === next ? 0 : 18,
      duration: immediate ? 0 : .42,
      ease: 'power2.out',
    }));
    nav.forEach((button, index) => button.classList.toggle('active', index === next));
    nav.forEach((button, index) => button.style.opacity = index === next ? '1' : '.25');
  };

  setActive(0, true);

  const trigger = ScrollTrigger.create({
    trigger: root,
    start: 'top top',
    end: () => `+=${Math.max(1, count - 1) * window.innerHeight}`,
    pin: stage,
    pinSpacing: false,
    invalidateOnRefresh: true,
    onUpdate: self => setActive(Math.round(self.progress * (count - 1))),
  });

  nav.forEach((button, index) => button.addEventListener('click', () => {
    const distance = Math.max(1, count - 1) * window.innerHeight;
    window.scrollTo({ top: root.offsetTop + distance * (index / Math.max(1, count - 1)), behavior: 'smooth' });
  }));

  return () => trigger.kill();
}

let cleanup: (() => void) | undefined;
document.addEventListener('astro:page-load', () => {
  cleanup?.();
  cleanup = initImpact();
});
