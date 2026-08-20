import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

function initEpisodes() {
  const root = document.querySelector<HTMLElement>('[data-episodes]');
  if (!root) return;

  const steps = [...root.querySelectorAll<HTMLElement>('[data-episode-step]')];
  const nav = [...root.querySelectorAll<HTMLButtonElement>('[data-episode-nav]')];
  const media = root.querySelector<HTMLElement>('[data-episode-media]');
  const image = root.querySelector<HTMLImageElement>('[data-episode-image]');
  const link = root.querySelector<HTMLAnchorElement>('[data-episode-link]');
  const number = root.querySelector<HTMLElement>('[data-episode-number]');
  const startup = root.querySelector<HTMLElement>('[data-episode-startup]');
  const tag = root.querySelector<HTMLElement>('[data-episode-tag]');
  const terms = root.querySelector<HTMLElement>('[data-episode-terms]');
  let active = -1;

  const activate = (index: number) => {
    if (index === active) return;
    active = index;
    const step = steps[index];
    const id = step.dataset.id ?? '';
    if (image) { image.src = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`; image.alt = `${step.dataset.startup} pitch episode`; }
    if (link) link.href = `https://www.youtube.com/watch?v=${id}`;
    if (number) number.textContent = step.dataset.ep ?? '';
    if (startup) startup.textContent = step.dataset.startup ?? '';
    if (tag) tag.textContent = step.dataset.tag ?? '';
    if (terms) terms.textContent = step.dataset.terms ?? '';
    gsap.fromTo(media, { opacity: .5, scale: .985 }, { opacity: 1, scale: 1, duration: .52, ease: 'power2.out' });
    steps.forEach((item, i) => gsap.to(item, { opacity: i === index ? 1 : .2, duration: .3 }));
    nav.forEach((button, i) => {
      button.className = `flex-1 text-left text-[9px] transition ${i === index ? 'text-white' : 'text-white/25'}`;
      const line = button.querySelector('span');
      if (line) line.className = `mb-2 block h-0.5 ${i === index ? 'bg-cta' : 'bg-white/10'}`;
    });
  };

  const triggers = steps.map((step, index) => ScrollTrigger.create({
    trigger: step,
    start: 'top 55%',
    end: 'bottom 45%',
    onEnter: () => activate(index),
    onEnterBack: () => activate(index),
  }));
  activate(0);

  const navHandlers = nav.map((button, index) => {
    const handler = () => steps[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    button.addEventListener('click', handler);
    return { button, handler };
  });

  return () => {
    triggers.forEach((t) => t.kill());
    navHandlers.forEach(({ button, handler }) => button.removeEventListener('click', handler));
  };
}

let cleanup: (() => void) | undefined;
document.addEventListener('astro:page-load', () => {
  cleanup?.();
  cleanup = initEpisodes();
});
