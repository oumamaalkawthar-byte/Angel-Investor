import { gsap } from 'gsap';
import { initFormWidgets } from './form-widgets';

const SECTOR_MULTIPLES: Record<string, number> = {
  SaaS: 10,
  'DeepTech / AI': 9,
  FinTech: 8,
  HealthTech: 7,
  CleanTech: 5,
  EdTech: 5,
  Other: 5,
  AgriTech: 4,
  Logistics: 4,
  'E-commerce': 3,
};

const TEAM_FACTOR: Record<string, number> = {
  'Solo founder': 0.85,
  '2–5': 1.0,
  '6–10': 1.05,
  '11–25': 1.1,
  '25+': 1.15,
};

const MARKET_FACTOR: Record<string, number> = {
  'Under $100M': 0.8,
  '$100M – $500M': 0.9,
  '$500M – $1B': 1.0,
  '$1B – $5B': 1.1,
  '$5B+': 1.2,
};

const BERKUS_FACTORS = [
  { key: 'sound_idea', label: 'Sound idea (basic value, product/market risk)' },
  { key: 'prototype', label: 'Prototype / MVP (reduces technology risk)' },
  { key: 'team_quality', label: 'Quality management team (reduces execution risk)' },
  { key: 'strategic_relationships', label: 'Strategic relationships (reduces market risk)' },
  { key: 'early_traction', label: 'Early traction / sales (reduces production risk)' },
];

function formatPKR(value: number): string {
  if (value >= 1_000_000) return `PKR ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `PKR ${Math.round(value / 1_000)}K`;
  return `PKR ${Math.round(value)}`;
}

function animateValue(el: Element | null, target: number, formatter: (n: number) => string) {
  if (!el) return;
  const counter = { value: 0 };
  gsap.to(counter, {
    value: target,
    duration: 1.2,
    ease: 'power2.out',
    onUpdate: () => {
      el.textContent = formatter(counter.value);
    },
  });
}

function initCalculator() {
  const root = document.querySelector<HTMLElement>('[data-valuation-calculator]');
  if (!root) return;

  initFormWidgets(root);

  const form = root.querySelector<HTMLFormElement>('form');
  const stageGroup = root.querySelector<HTMLElement>('[data-radio-group="stage"] [data-radio-value]') as HTMLInputElement | null;
  const preRevenueSection = root.querySelector<HTMLElement>('[data-section="pre-revenue"]');
  const revenueSection = root.querySelector<HTMLElement>('[data-section="revenue"]');

  function updateStageVisibility() {
    const stage = stageGroup?.value;
    const isPreRevenue = stage === 'Pre-Revenue';
    preRevenueSection?.classList.toggle('hidden', !isPreRevenue);
    revenueSection?.classList.toggle('hidden', isPreRevenue);
  }

  root.querySelectorAll('[data-radio-group="stage"] [data-radio-card]').forEach((btn) => {
    btn.addEventListener('click', () => setTimeout(updateStageVisibility, 0));
  });
  updateStageVisibility();

  // Berkus sliders: live value display
  root.querySelectorAll<HTMLInputElement>('[data-berkus-slider]').forEach((slider) => {
    const output = root.querySelector<HTMLElement>(`[data-berkus-output="${slider.name}"]`);
    const sync = () => {
      if (output) output.textContent = slider.value;
    };
    slider.addEventListener('input', sync);
    sync();
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const stage = (data.get('stage') as string) || 'Early Revenue';
    const sector = (data.get('sector') as string) || 'Other';
    const teamSize = (data.get('team_size') as string) || '2–5';
    const marketSize = (data.get('market_size') as string) || '$500M – $1B';

    const teamFactor = TEAM_FACTOR[teamSize] ?? 1.0;
    const marketFactor = MARKET_FACTOR[marketSize] ?? 1.0;

    let low: number, mid: number, high: number;
    let methodNote = '';
    let impliedMultiple: number | null = null;

    if (stage === 'Pre-Revenue') {
      const perFactorMax = 500000 * marketFactor;
      let sum = 0;
      const breakdown: { label: string; value: number }[] = [];
      for (const f of BERKUS_FACTORS) {
        const score = Number(data.get(f.key) ?? 0);
        const value = (score / 5) * perFactorMax;
        sum += value;
        breakdown.push({ label: f.label, value });
      }
      mid = sum;
      low = mid * 0.8;
      high = mid * 1.2;
      methodNote = 'Berkus Method — qualitative risk-reduction scoring across five factors.';
      renderBreakdown(root, breakdown);
    } else {
      const arr = Number(data.get('arr') ?? 0);
      const growthRate = Number(data.get('growth_rate') ?? 0);
      const baseMultiple = SECTOR_MULTIPLES[sector] ?? 5;
      const growthAdjustment = 1 + Math.min(growthRate, 200) / 100 * 0.4;
      const stageAdjustment = stage === 'Growth' ? 1.15 : 1.0;

      mid = arr * baseMultiple * growthAdjustment * stageAdjustment * teamFactor * marketFactor;
      low = mid * 0.7;
      high = mid * 1.3;
      impliedMultiple = arr > 0 ? mid / arr : null;
      methodNote = `Revenue Multiple Method — ${sector} base multiple of ${baseMultiple}x ARR, adjusted for growth, stage, team, and market size.`;
      renderBreakdown(root, [
        { label: 'Annual revenue (ARR)', value: arr },
        { label: `Sector base multiple`, value: baseMultiple, isMultiple: true },
        { label: 'Growth adjustment', value: growthAdjustment, isFactor: true },
        { label: 'Stage adjustment', value: stageAdjustment, isFactor: true },
        { label: 'Team adjustment', value: teamFactor, isFactor: true },
        { label: 'Market size adjustment', value: marketFactor, isFactor: true },
      ]);
    }

    const resultsView = root.querySelector('[data-results-view]');
    const formView = root.querySelector('[data-form-view]');
    formView?.classList.add('hidden');
    resultsView?.classList.remove('hidden');

    animateValue(root.querySelector('[data-result-low]'), low, formatPKR);
    animateValue(root.querySelector('[data-result-mid]'), mid, formatPKR);
    animateValue(root.querySelector('[data-result-high]'), high, formatPKR);

    const multipleEl = root.querySelector('[data-result-multiple]');
    const multipleWrap = root.querySelector('[data-result-multiple-wrap]');
    if (impliedMultiple !== null && multipleEl && multipleWrap) {
      multipleWrap.classList.remove('hidden');
      animateValue(multipleEl, impliedMultiple, (n) => `${n.toFixed(1)}x`);
    } else {
      multipleWrap?.classList.add('hidden');
    }

    const noteEl = root.querySelector('[data-method-note]');
    if (noteEl) noteEl.textContent = methodNote;

    // Range bar
    const rangeFill = root.querySelector<HTMLElement>('[data-range-fill]');
    const rangeMarker = root.querySelector<HTMLElement>('[data-range-marker]');
    if (rangeFill && rangeMarker) {
      const spread = high - low || 1;
      const midPct = ((mid - low) / spread) * 100;
      gsap.fromTo(rangeFill, { width: '0%' }, { width: '100%', duration: 1, ease: 'power2.out' });
      gsap.fromTo(rangeMarker, { left: '0%' }, { left: `${midPct}%`, duration: 1.2, ease: 'power2.out' });
    }

    resultsView?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  root.querySelectorAll('[data-recalculate]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelector('[data-results-view]')?.classList.add('hidden');
      root.querySelector('[data-form-view]')?.classList.remove('hidden');
      root.querySelector('[data-form-view]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function renderBreakdown(
  root: HTMLElement,
  items: { label: string; value: number; isMultiple?: boolean; isFactor?: boolean }[]
) {
  const container = root.querySelector('[data-breakdown-list]');
  if (!container) return;
  container.innerHTML = items
    .map((item) => {
      let display: string;
      if (item.isMultiple) display = `${item.value}x`;
      else if (item.isFactor) display = `×${item.value.toFixed(2)}`;
      else display = formatPKR(item.value);
      return `<div class="flex items-center justify-between border-b border-line/40 py-2.5 text-sm last:border-0">
        <span class="text-paper/60">${item.label}</span>
        <span class="font-mono text-paper">${display}</span>
      </div>`;
    })
    .join('');
}

document.addEventListener('astro:page-load', initCalculator);
