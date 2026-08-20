import { initFormWidgets } from './form-widgets';

function initApplyWizard() {
  const wizard = document.querySelector<HTMLElement>('[data-wizard]');
  if (!wizard) return;

  initFormWidgets(wizard);

  const form = wizard.querySelector<HTMLFormElement>('form');
  if (!form) return;

  const steps = Array.from(wizard.querySelectorAll<HTMLElement>('[data-step]'));
  const stepItems = Array.from(wizard.querySelectorAll<HTMLElement>('[data-step-item]'));
  const progressBar = wizard.querySelector<HTMLElement>('[data-progress-bar]');
  const stepLabel = wizard.querySelector<HTMLElement>('[data-step-label]');
  const totalSteps = steps.length;
  let current = 1;

  function validateStep(n: number): boolean {
    const stepEl = steps.find((s) => Number(s.dataset.step) === n);
    if (!stepEl) return true;
    const fields = stepEl.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[required]');
    for (const field of fields) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }
    return true;
  }

  function populateReview() {
    const review = wizard!.querySelector<HTMLElement>('[data-review-summary]');
    if (!review) return;
    const data = new FormData(form!);
    const get = (key: string) => (data.get(key) as string)?.trim() || '—';
    const rows: [string, string][] = [
      ['Founder', get('founder_name')],
      ['Email', get('founder_email')],
      ['Startup', get('startup_name')],
      ['One-liner', get('one_liner')],
      ['Sector', get('sector')],
      ['Stage', get('stage')],
      ['Investment ask', get('investment_ask')],
      ['Equity offered', get('equity_offered')],
    ];
    review.innerHTML = `<dl class="grid gap-x-6 gap-y-4 sm:grid-cols-2">${rows
      .map(
        ([label, value]) => `
        <div>
          <dt class="text-xs uppercase tracking-wide text-paper/40">${label}</dt>
          <dd class="mt-1 text-sm text-paper">${value}</dd>
        </div>`
      )
      .join('')}</dl>`;
  }

  function showStep(n: number) {
    steps.forEach((s) => s.classList.toggle('hidden', Number(s.dataset.step) !== n));
    stepItems.forEach((item) => {
      const idx = Number(item.dataset.stepItem);
      item.dataset.state = idx < n ? 'done' : idx === n ? 'active' : 'pending';
    });
    if (progressBar) progressBar.style.width = `${(n / totalSteps) * 100}%`;
    if (stepLabel) stepLabel.textContent = `Step ${n} of ${totalSteps}`;
    if (n === totalSteps) populateReview();
    current = n;
    wizard!.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  wizard.querySelectorAll<HTMLElement>('[data-next]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!validateStep(current)) return;
      if (current < totalSteps) showStep(current + 1);
    });
  });
  wizard.querySelectorAll<HTMLElement>('[data-back]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (current > 1) showStep(current - 1);
    });
  });

  // Co-founder repeater
  const repeaterList = wizard.querySelector<HTMLElement>('[data-cofounder-list]');
  const addBtn = wizard.querySelector<HTMLElement>('[data-add-cofounder]');
  const template = wizard.querySelector<HTMLTemplateElement>('[data-cofounder-template]');
  const MAX_COFOUNDERS = 3;
  let cofounderCount = 0;

  addBtn?.addEventListener('click', () => {
    if (!repeaterList || !template || cofounderCount >= MAX_COFOUNDERS) return;
    cofounderCount++;
    const clone = template.content.cloneNode(true) as DocumentFragment;
    const card = clone.querySelector<HTMLElement>('[data-cofounder-card]');
    if (!card) return;
    card.querySelectorAll('input').forEach((inp) => {
      inp.name = `${inp.name}_${cofounderCount}`;
    });
    card.querySelector('[data-remove-cofounder]')?.addEventListener('click', () => {
      card.remove();
      cofounderCount--;
      addBtn.classList.remove('hidden');
    });
    repeaterList.appendChild(card);
    if (cofounderCount >= MAX_COFOUNDERS) addBtn.classList.add('hidden');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateStep(current)) return;
    const ref = `AI-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const refEl = wizard.querySelector('[data-ref-number]');
    if (refEl) refEl.textContent = ref;
    wizard.querySelector('[data-form-view]')?.classList.add('hidden');
    wizard.querySelector('[data-success-view]')?.classList.remove('hidden');
    wizard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  showStep(1);
}

document.addEventListener('astro:page-load', initApplyWizard);
