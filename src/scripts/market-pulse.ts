// Homepage "Market Pulse" panel — live PSX data from public/api/psx-*.php,
// wired into the redesigned list + chart layout while keeping the original
// ticker marquee and stock search.

interface Quote {
  symbol: string;
  name: string;
  ldcp: number;
  current: number;
  change: number;
  changePct: number;
  volume: number;
}

interface SymbolMeta {
  symbol: string;
  name: string;
  sector: string;
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
  const ticker = root.querySelector<HTMLElement>('[data-market-ticker]');
  const searchRoot = root.querySelector<HTMLElement>('[data-market-search-root]');
  const searchInput = root.querySelector<HTMLInputElement>('[data-market-search]');
  const searchResults = root.querySelector<HTMLElement>('[data-market-search-results]');
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
  let symbolsList: SymbolMeta[] = [];
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

  function markSelected(symbol: string) {
    root.querySelectorAll<HTMLButtonElement>('[data-stock], [data-ticker-symbol]').forEach((btn) => {
      const match = (btn.dataset.symbol ?? btn.dataset.tickerSymbol) === symbol;
      btn.classList.toggle('selected', match);
      btn.classList.toggle('bg-white/[.07]', match && btn.hasAttribute('data-stock'));
    });
  }

  async function selectSymbol(symbol: string) {
    currentSymbol = symbol;
    markSelected(symbol);

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

  function renderTicker() {
    if (!ticker) return;
    const active = [...quotes].sort((a, b) => b.volume - a.volume).slice(0, 24);
    if (active.length === 0) {
      ticker.innerHTML = '<p class="rounded-xl border border-ink/10 px-5 py-3 text-sm text-muted">Live prices unavailable right now.</p>';
      return;
    }

    const itemHTML = (q: Quote) => {
      const up = q.change >= 0;
      const arrow = q.change > 0 ? '▲' : q.change < 0 ? '▼' : '—';
      return `
        <button type="button" data-ticker-symbol="${q.symbol}" class="flex flex-shrink-0 items-center gap-3 rounded-xl border border-ink/10 bg-white px-5 py-3 text-left shadow-sm transition-colors hover:border-cta/60">
          <span>
            <span class="block font-mono text-[10px] uppercase tracking-wide text-muted">${q.symbol}</span>
            <span class="block text-sm font-medium text-ink">${formatPrice(q.current)}</span>
          </span>
          <span class="text-xs font-medium ${up ? 'text-emerald-600' : 'text-rose-600'}">${arrow} ${Math.abs(q.changePct).toFixed(2)}%</span>
        </button>`;
    };

    // Doubled list so the marquee's translateX(-50%) loop is seamless.
    ticker.innerHTML = [...active, ...active].map(itemHTML).join('');
    ticker.querySelectorAll<HTMLButtonElement>('[data-ticker-symbol]').forEach((btn) => {
      btn.addEventListener('click', () => selectSymbol(btn.dataset.tickerSymbol!));
    });
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

  function closeSearch() {
    searchResults?.classList.add('hidden');
  }

  function renderSearchResults(query: string) {
    if (!searchResults) return;
    const q = query.trim().toLowerCase();
    if (q.length < 1) {
      closeSearch();
      return;
    }
    const matches = symbolsList
      .filter((s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .slice(0, 8);

    if (matches.length === 0) {
      searchResults.innerHTML = '<p class="px-3 py-2.5 text-sm text-white/40">No matches.</p>';
      searchResults.classList.remove('hidden');
      return;
    }

    searchResults.innerHTML = matches
      .map(
        (s) => `
        <button type="button" data-search-result="${s.symbol}" class="block w-full rounded-md px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]">
          <span class="block text-sm text-white">${s.symbol}</span>
          <span class="block text-xs text-white/40">${s.name}</span>
        </button>`
      )
      .join('');
    searchResults.classList.remove('hidden');

    searchResults.querySelectorAll<HTMLButtonElement>('[data-search-result]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const symbol = btn.dataset.searchResult!;
        if (searchInput) searchInput.value = symbol;
        closeSearch();
        selectSymbol(symbol);
      });
    });
  }

  searchInput?.addEventListener('input', () => renderSearchResults(searchInput.value));
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSearch();
  });
  searchRoot?.addEventListener('focusout', (e) => {
    const next = (e as FocusEvent).relatedTarget as Node | null;
    if (!next || !searchRoot.contains(next)) closeSearch();
  });

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
      const [quotesRes, symbolsRes] = await Promise.all([
        fetchJSON<{ quotes: Quote[] }>('/api/psx-quotes.php'),
        fetchJSON<{ symbols: SymbolMeta[] }>('/api/psx-symbols.php'),
      ]);
      quotes = quotesRes.quotes;
      symbolsList = symbolsRes.symbols;
      renderTicker();
      renderList();
    } catch {
      if (list) list.innerHTML = '<p class="px-5 py-6 text-xs text-white/40">Live market data is temporarily unavailable.</p>';
      if (ticker) ticker.innerHTML = '<p class="rounded-xl border border-ink/10 px-5 py-3 text-sm text-muted">Live market data is temporarily unavailable.</p>';
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
