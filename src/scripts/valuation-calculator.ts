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
  'Under PKR 1B': 0.8,
  'PKR 1B – 10B': 0.9,
  'PKR 10B – 50B': 1.0,
  'PKR 50B – 200B': 1.1,
  'PKR 200B+': 1.2,
};

const BERKUS_FACTORS = [
  { key: 'sound_idea', label: 'Sound idea' },
  { key: 'prototype', label: 'Prototype / MVP' },
  { key: 'team_quality', label: 'Quality management team' },
  { key: 'strategic_relationships', label: 'Strategic relationships' },
  { key: 'early_traction', label: 'Early traction / sales' },
];

// Validated 5-hue categorical set (dark surface #0A0E17) — see
// scripts/validate_palette.js in the dataviz skill. Fixed order, never cycled.
const SERIES = ['#4F5DFF', '#E85A3A', '#14967F', '#B87814', '#B34FE0'];
const STATUS_GOOD = '#22B573';
const STATUS_BAD = '#FF6B4A';

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
    const marketSize = (data.get('market_size') as string) || 'PKR 10B – 50B';

    const teamFactor = TEAM_FACTOR[teamSize] ?? 1.0;
    const marketFactor = MARKET_FACTOR[marketSize] ?? 1.0;

    let low: number, mid: number, high: number;
    let methodNote = '';
    let impliedMultiple: number | null = null;

    const stackedChart = root.querySelector<HTMLElement>('[data-chart-stacked]');
    const divergingChart = root.querySelector<HTMLElement>('[data-chart-diverging]');
    stackedChart?.classList.add('hidden');
    divergingChart?.classList.add('hidden');

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
      renderStackedBar(root, breakdown);
      stackedChart?.classList.remove('hidden');
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

      renderDivergingBars(root, [
        { label: 'Growth', deltaPercent: (growthAdjustment - 1) * 100 },
        { label: 'Stage', deltaPercent: (stageAdjustment - 1) * 100 },
        { label: 'Team size', deltaPercent: (teamFactor - 1) * 100 },
        { label: 'Market size', deltaPercent: (marketFactor - 1) * 100 },
      ]);
      divergingChart?.classList.remove('hidden');

      renderBreakdownList(root, [
        { label: 'Annual revenue (ARR)', value: formatPKR(arr) },
        { label: 'Sector base multiple', value: `${baseMultiple}x` },
        { label: 'Growth adjustment', value: `×${growthAdjustment.toFixed(2)}` },
        { label: 'Stage adjustment', value: `×${stageAdjustment.toFixed(2)}` },
        { label: 'Team adjustment', value: `×${teamFactor.toFixed(2)}` },
        { label: 'Market size adjustment', value: `×${marketFactor.toFixed(2)}` },
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

/** Part-to-whole horizontal stacked bar — Berkus factor contributions. */
function renderStackedBar(root: HTMLElement, items: { label: string; value: number }[]) {
  const bar = root.querySelector<HTMLElement>('[data-stacked-bar]');
  const legend = root.querySelector<HTMLElement>('[data-stacked-legend]');
  if (!bar || !legend) return;

  const total = items.reduce((s, i) => s + i.value, 0) || 1;

  bar.innerHTML = items
    .map((item, i) => {
      const pct = (item.value / total) * 100;
      return `<div style="width:${pct}%; background:${SERIES[i % SERIES.length]}" class="h-full first:rounded-l-full last:rounded-r-full" title="${item.label}: ${formatPKR(item.value)}"></div>`;
    })
    .join('');

  legend.innerHTML = items
    .map(
      (item, i) => `
      <div class="flex items-center justify-between gap-3 py-2 text-sm">
        <span class="flex items-center gap-2.5 text-paper/70">
          <span class="h-2.5 w-2.5 flex-shrink-0 rounded-full" style="background:${SERIES[i % SERIES.length]}"></span>
          ${item.label}
        </span>
        <span class="font-mono text-paper">${formatPKR(item.value)}</span>
      </div>`
    )
    .join('');
}

/** Diverging bars from a zero baseline — Revenue Multiple adjustment factors. */
function renderDivergingBars(root: HTMLElement, rows: { label: string; deltaPercent: number }[]) {
  const container = root.querySelector<HTMLElement>('[data-diverging-bars]');
  if (!container) return;

  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.deltaPercent)), 1);
  // Past this width the bar reaches too close to the row-label column for an
  // outside label to fit without colliding — flip the value label inside the
  // bar itself instead of clipping or overlapping it.
  const INSIDE_THRESHOLD = 32;

  container.innerHTML = rows
    .map((row) => {
      const pct = Math.max((Math.abs(row.deltaPercent) / maxAbs) * 50, 4); // half-width max per side, floored so tiny deltas stay visible
      const isPositive = row.deltaPercent >= 0;
      const color = isPositive ? STATUS_GOOD : STATUS_BAD;
      const sign = isPositive ? '+' : '−';
      const valueText = `${sign}${Math.abs(row.deltaPercent).toFixed(0)}%`;
      const barStyle = isPositive
        ? `left:50%; width:${pct}%; border-radius:0 4px 4px 0;`
        : `right:50%; width:${pct}%; border-radius:4px 0 0 4px;`;

      const insideLabel =
        pct >= INSIDE_THRESHOLD
          ? `<span class="absolute inset-y-0 flex items-center ${isPositive ? 'right-0 pr-2' : 'left-0 pl-2'} font-mono text-[11px] font-semibold text-ink/90">${valueText}</span>`
          : '';
      const outsideLabel =
        pct >= INSIDE_THRESHOLD
          ? ''
          : `<span class="absolute top-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-xs text-paper" style="${isPositive ? `left:calc(50% + ${pct}% + 8px);` : `right:calc(50% + ${pct}% + 8px);`}">${valueText}</span>`;

      return `
        <div class="relative flex h-9 items-center">
          <span class="absolute left-0 w-24 flex-shrink-0 text-xs text-paper/60">${row.label}</span>
          <div class="relative ml-24 h-5 flex-1">
            <div class="absolute inset-y-0 left-1/2 w-px bg-paper/20"></div>
            <div class="absolute inset-y-0" style="${barStyle} background:${color}">${insideLabel}</div>
            ${outsideLabel}
          </div>
        </div>`;
    })
    .join('');
}

function renderBreakdownList(root: HTMLElement, items: { label: string; value: string }[]) {
  const container = root.querySelector('[data-breakdown-list]');
  if (!container) return;
  container.innerHTML = items
    .map(
      (item) => `<div class="flex items-center justify-between border-b border-line/40 py-2.5 text-sm last:border-0">
        <span class="text-paper/60">${item.label}</span>
        <span class="font-mono text-paper">${item.value}</span>
      </div>`
    )
    .join('');
}

document.addEventListener('astro:page-load', initCalculator);
