import { initFormWidgets } from './form-widgets';

function initInvestorForm() {
  const root = document.querySelector<HTMLElement>('[data-investor-form-root]');
  if (!root) return;

  initFormWidgets(root);

  const form = root.querySelector<HTMLFormElement>('form');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const ref = `AI-INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const refEl = root.querySelector('[data-ref-number]');
    if (refEl) refEl.textContent = ref;
    root.querySelector('[data-form-view]')?.classList.add('hidden');
    root.querySelector('[data-success-view]')?.classList.remove('hidden');
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

document.addEventListener('astro:page-load', initInvestorForm);
