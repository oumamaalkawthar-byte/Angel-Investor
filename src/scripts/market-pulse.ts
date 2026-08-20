// Homepage "Market Pulse" panel — same live PSX data source as
// stock-market.ts (public/api/psx-*.php), wired into the redesigned
// list + chart layout instead of the ticker/search layout.

interface Quote {
  symbol: string;
  name: string;
  ldcp: number;
  current: number;
  change: number;
  changePct: number;
  volume: number;
}

interface Bar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const RANGE_DAYS: Record<string, number> = { '1W': 7, '1M': 30, '3M': 90, '1Y': 365 };

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${url}`);
  const data = await res.json();
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(String((data as { error: string }).error));
  }
  return data as T;
}

function formatPrice(n: number): string {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function changeText(change: number, changePct: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}  ${sign}${changePct.toFixed(2)}%`;
}

function initMarketPulse(root: HTMLElement) {
  const list = root.querySelector<HTMLElement>('[data-market-list]');
  const symbolEl = root.querySelector<HTMLElement>('[data-market-symbol]');
  const valueEl = root.querySelector<HTMLElement>('[data-market-value]');
  const changeEl = root.querySelector<HTMLElement>('[data-market-change]');
  const openEl = root.querySelector<HTMLElement>('[data-market-open]');
  const highEl = root.querySelector<HTMLElement>('[data-market-high]');
  const lowEl = root.querySelector<HTMLElement>('[data-market-low]');
  const volumeEl = root.querySelector<HTMLElement>('[data-market-volume]');
  const areaPath = root.querySelector<SVGPathElement>('[data-market-area]');
  const linePath = root.querySelector<SVGPathElement>('[data-market-line]');
  const dot = root.querySelector<SVGCircleElement>('[data-market-dot]');
  const chartEmpty = root.querySelector<HTMLElement>('[data-market-chart-empty]');
  const rangeButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-range]'));
  const liveBadge = root.querySelector<HTMLElement>('[data-market-live]');

  let quotes: Quote[] = [];
  let currentBars: Bar[] = [];
  let currentSymbol = '';
  let currentRange = '1M';

  function renderChart(bars: Bar[]) {
    if (!areaPath || !linePath || !dot) return;
    if (bars.length === 0) {
      areaPath.setAttribute('d', '');
      linePath.setAttribute('d', '');
      dot.style.display = 'none';
      chartEmpty?.classList.remove('hidden');
      chartEmpty?.classList.add('flex');
      return;
    }
    chartEmpty?.classList.add('hidden');
    chartEmpty?.classList.remove('flex');

    const w = 760;
    const h = 280;
    const pad = 16;
    const closes = bars.map((b) => b.close);
    const max = Math.max(...closes);
    const min = Math.min(...closes);
    const range = max - min || 1;
    const stepX = bars.length > 1 ? (w - pad * 2) / (bars.length - 1) : 0;

    const points = closes.map((c, i) => {
      const x = pad + i * stepX;
      const y = h - pad - ((c - min) / range) * (h - pad * 2);
      return [x, y] as const;
    });

    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    const area = `${line} L ${points[points.length - 1][0].toFixed(1)} ${h} L ${points[0][0].toFixed(1)} ${h} Z`;

    linePath.setAttribute('d', line);
    areaPath.setAttribute('d', area);

    const last = points[points.length - 1];
    dot.setAttribute('cx', String(last[0]));
    dot.setAttribute('cy', String(last[1]));
    dot.style.display = '';
  }

  function applyRange() {
    const days = RANGE_DAYS[currentRange] ?? 30;
    renderChart(currentBars.slice(-days));
  }

  function renderStats(quote: Quote | undefined, bars: Bar[]) {
    const lastBar = bars[bars.length - 1];
    if (symbolEl) symbolEl.textContent = `${currentSymbol} INDEX`;
    if (valueEl) valueEl.textContent = quote ? formatPrice(quote.current) : '—';
    if (changeEl) {
      if (quote) {
        changeEl.textContent = changeText(quote.change, quote.changePct);
        changeEl.className = `text-xs ${quote.change >= 0 ? 'text-emerald-300' : 'text-rose-300'}`;
      } else {
        changeEl.textContent = '';
      }
    }
    if (openEl) openEl.textContent = lastBar ? formatPrice(lastBar.open) : '—';
    if (highEl) highEl.textContent = lastBar ? formatPrice(lastBar.high) : '—';
    if (lowEl) lowEl.textContent = lastBar ? formatPrice(lastBar.low) : '—';
    if (volumeEl) volumeEl.textContent = quote ? quote.volume.toLocaleString() : '—';
  }

  async function selectSymbol(symbol: string) {
    currentSymbol = symbol;
    list?.querySelectorAll<HTMLButtonElement>('[data-stock]').forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.symbol === symbol);
      btn.classList.toggle('bg-white/[.07]', btn.dataset.symbol === symbol);
    });

    const quote = quotes.find((q) => q.symbol === symbol);
    renderStats(quote, []);

    try {
      const data = await fetchJSON<{ bars: Bar[] }>(`/api/psx-history.php?symbol=${encodeURIComponent(symbol)}`);
      currentBars = data.bars;
      renderStats(quote, currentBars);
      applyRange();
    } catch {
      currentBars = [];
      renderChart([]);
    }
  }

  function renderList() {
    if (!list) return;
    const top = [...quotes].sort((a, b) => b.volume - a.volume).slice(0, 6);
    if (top.length === 0) {
      list.innerHTML = '<p class="px-5 py-6 text-xs text-white/40">Live prices unavailable right now.</p>';
      return;
    }

    list.innerHTML = top
      .map(
        (q, i) => `
        <button type="button" data-stock data-symbol="${q.symbol}" class="flex w-full items-center justify-between border-b border-white/10 px-5 py-[18px] text-left transition hover:bg-white/5 ${i === 0 ? 'selected bg-white/[.07]' : ''}">
          <span><b class="block text-sm">${q.symbol}</b><small class="mt-1 block text-[8px] text-white/35">${q.name}</small></span>
          <span class="text-right"><b class="block text-xs">${formatPrice(q.current)}</b><small class="mt-1 block text-[9px] ${q.change >= 0 ? 'text-emerald-300' : 'text-rose-300'}">${q.change >= 0 ? '+' : ''}${q.changePct.toFixed(2)}%</small></span>
        </button>`
      )
      .join('');

    list.querySelectorAll<HTMLButtonElement>('[data-stock]').forEach((btn) => {
      btn.addEventListener('click', () => selectSymbol(btn.dataset.symbol!));
    });

    selectSymbol(top[0].symbol);
  }

  rangeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      currentRange = button.dataset.range ?? '1M';
      rangeButtons.forEach((b) => {
        b.classList.toggle('active', b === button);
        b.classList.toggle('bg-cta', b === button);
        b.classList.toggle('text-deep', b === button);
        b.classList.toggle('text-white/45', b !== button);
      });
      applyRange();
    });
  });

  async function init() {
    try {
      const quotesRes = await fetchJSON<{ quotes: Quote[] }>('/api/psx-quotes.php');
      quotes = quotesRes.quotes;
      renderList();
    } catch {
      if (list) list.innerHTML = '<p class="px-5 py-6 text-xs text-white/40">Live market data is temporarily unavailable.</p>';
      liveBadge?.classList.add('hidden');
      renderStats(undefined, []);
      renderChart([]);
    }
  }

  init();
}

document.addEventListener('astro:page-load', () => {
  const root = document.querySelector<HTMLElement>('[data-market]');
  if (root) initMarketPulse(root);
});
