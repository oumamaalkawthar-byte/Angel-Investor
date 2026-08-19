// Live PSX market section — ticker marquee, stock search, and a click-to-chart
// panel. All data comes from public/api/psx-*.php, which proxies and caches
// dps.psx.com.pk server-side (avoids CORS and keeps request volume low).

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

const STATUS_GOOD = '#22B573';
const STATUS_BAD = '#FF6B4A';
const NEUTRAL = '#9A9FAE';

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

function changeColor(change: number): string {
  if (change > 0) return STATUS_GOOD;
  if (change < 0) return STATUS_BAD;
  return NEUTRAL;
}

function renderTicker(root: HTMLElement, quotes: Quote[], onPick: (symbol: string) => void) {
  const track = root.querySelector<HTMLElement>('[data-stock-ticker]');
  if (!track) return;

  const active = [...quotes].sort((a, b) => b.volume - a.volume).slice(0, 24);
  if (active.length === 0) {
    track.innerHTML = '<p class="px-5 py-3 text-sm text-paper/40">Live prices unavailable right now.</p>';
    return;
  }

  const itemHTML = (q: Quote) => {
    const color = changeColor(q.change);
    const arrow = q.change > 0 ? '▲' : q.change < 0 ? '▼' : '—';
    return `
      <button type="button" data-ticker-symbol="${q.symbol}" class="flex flex-shrink-0 items-center gap-3 rounded-xl border border-line/60 bg-ink px-5 py-3 text-left transition-colors hover:border-accent/50">
        <span>
          <span class="block font-mono text-[10px] uppercase tracking-wide text-paper/40">${q.symbol}</span>
          <span class="block text-sm font-medium text-paper">${formatPrice(q.current)}</span>
        </span>
        <span class="font-mono text-xs font-medium" style="color:${color}">${arrow} ${Math.abs(q.changePct).toFixed(2)}%</span>
      </button>`;
  };

  // Doubled list so the marquee's translateX(-50%) loop is seamless.
  track.innerHTML = [...active, ...active].map(itemHTML).join('');

  track.querySelectorAll<HTMLButtonElement>('[data-ticker-symbol]').forEach((btn) => {
    btn.addEventListener('click', () => onPick(btn.dataset.tickerSymbol!));
  });
}

function renderChart(container: HTMLElement, bars: Bar[]) {
  if (bars.length === 0) {
    container.innerHTML = '<p class="flex h-full items-center justify-center text-sm text-paper/40">No chart data available.</p>';
    return;
  }

  const recent = bars.slice(-90);
  const closes = recent.map((b) => b.close);
  const w = 900;
  const h = 256;
  const pad = 28;
  const max = Math.max(...closes);
  const min = Math.min(...closes);
  const range = max - min || 1;
  const stepX = recent.length > 1 ? (w - pad * 2) / (recent.length - 1) : 0;

  const points = closes.map((c, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((c - min) / range) * (h - pad * 2);
    return [x, y] as const;
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1][0].toFixed(1)} ${h - pad} L ${points[0][0].toFixed(1)} ${h - pad} Z`;

  const trendColor = closes[closes.length - 1] >= closes[0] ? STATUS_GOOD : STATUS_BAD;

  const gridLines = [0.25, 0.5, 0.75]
    .map((f) => {
      const y = pad + f * (h - pad * 2);
      return `<line x1="${pad}" y1="${y}" x2="${w - pad}" y2="${y}" stroke="#1c2130" stroke-width="1" />`;
    })
    .join('');

  const last = points[points.length - 1];

  container.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" class="h-full w-full">
      ${gridLines}
      <path d="${areaPath}" fill="${trendColor}" opacity="0.12" />
      <path d="${linePath}" fill="none" stroke="${trendColor}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      <circle cx="${last[0]}" cy="${last[1]}" r="4.5" fill="${trendColor}" stroke="#0a0e17" stroke-width="2" />
    </svg>
  `;
}

function initStockMarket(root: HTMLElement) {
  const searchRoot = root.querySelector<HTMLElement>('[data-stock-search-root]');
  const searchInput = root.querySelector<HTMLInputElement>('[data-stock-search]');
  const searchResults = root.querySelector<HTMLElement>('[data-stock-search-results]');
  const panelSymbol = root.querySelector<HTMLElement>('[data-stock-panel-symbol]');
  const panelName = root.querySelector<HTMLElement>('[data-stock-panel-name]');
  const panelPrice = root.querySelector<HTMLElement>('[data-stock-panel-price]');
  const panelChange = root.querySelector<HTMLElement>('[data-stock-panel-change]');
  const panelChart = root.querySelector<HTMLElement>('[data-stock-panel-chart]');
  const panelStats = root.querySelector<HTMLElement>('[data-stock-panel-stats]');

  let quotesBySymbol = new Map<string, Quote>();
  let symbolsList: SymbolMeta[] = [];

  function statTile(label: string, value: string) {
    return `<div><p class="text-xs text-paper/40">${label}</p><p class="mt-1 font-mono text-paper">${value}</p></div>`;
  }

  async function loadSymbol(symbol: string) {
    const meta = symbolsList.find((s) => s.symbol === symbol);
    const quote = quotesBySymbol.get(symbol);

    if (panelSymbol) panelSymbol.textContent = symbol;
    if (panelName) panelName.textContent = meta?.name || quote?.name || symbol;
    if (panelChart) panelChart.innerHTML = '<p class="flex h-full items-center justify-center text-sm text-paper/40">Loading chart&hellip;</p>';

    if (quote) {
      if (panelPrice) panelPrice.textContent = `PKR ${formatPrice(quote.current)}`;
      if (panelChange) {
        const color = changeColor(quote.change);
        const arrow = quote.change > 0 ? '▲' : quote.change < 0 ? '▼' : '—';
        panelChange.innerHTML = `<span style="color:${color}">${arrow} ${quote.change >= 0 ? '+' : ''}${quote.change.toFixed(2)} (${quote.changePct.toFixed(2)}%)</span>`;
      }
      if (panelStats) {
        panelStats.innerHTML = [
          statTile('LDCP', formatPrice(quote.ldcp)),
          statTile('Current', formatPrice(quote.current)),
          statTile('Volume', quote.volume.toLocaleString()),
          statTile('Sector', meta?.sector || '—'),
        ].join('');
      }
    }

    try {
      const data = await fetchJSON<{ bars: Bar[] }>(`/api/psx-history.php?symbol=${encodeURIComponent(symbol)}`);
      if (panelChart) renderChart(panelChart, data.bars);
    } catch {
      if (panelChart) panelChart.innerHTML = '<p class="flex h-full items-center justify-center text-sm text-paper/40">Chart unavailable right now.</p>';
    }
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
      searchResults.innerHTML = '<p class="px-3 py-2.5 text-sm text-paper/40">No matches.</p>';
      searchResults.classList.remove('hidden');
      return;
    }

    searchResults.innerHTML = matches
      .map(
        (s) => `
        <button type="button" data-search-result="${s.symbol}" class="block w-full rounded-md px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]">
          <span class="block text-sm text-paper">${s.symbol}</span>
          <span class="block text-xs text-paper/40">${s.name}</span>
        </button>`
      )
      .join('');
    searchResults.classList.remove('hidden');

    searchResults.querySelectorAll<HTMLButtonElement>('[data-search-result]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const symbol = btn.dataset.searchResult!;
        if (searchInput) searchInput.value = symbol;
        closeSearch();
        loadSymbol(symbol);
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

  async function init() {
    try {
      const [quotesRes, symbolsRes] = await Promise.all([
        fetchJSON<{ quotes: Quote[] }>('/api/psx-quotes.php'),
        fetchJSON<{ symbols: SymbolMeta[] }>('/api/psx-symbols.php'),
      ]);

      quotesBySymbol = new Map(quotesRes.quotes.map((q) => [q.symbol, q]));
      symbolsList = symbolsRes.symbols;

      renderTicker(root, quotesRes.quotes, loadSymbol);

      const top = [...quotesRes.quotes].sort((a, b) => b.volume - a.volume)[0];
      if (top) loadSymbol(top.symbol);
    } catch {
      const track = root.querySelector<HTMLElement>('[data-stock-ticker]');
      if (track) track.innerHTML = '<p class="px-5 py-3 text-sm text-paper/40">Live market data is temporarily unavailable.</p>';
      if (panelName) panelName.textContent = 'Live data unavailable';
      if (panelChart) panelChart.innerHTML = '';
    }
  }

  init();
}

document.addEventListener('astro:page-load', () => {
  const root = document.querySelector<HTMLElement>('[data-stock-market]');
  if (root) initStockMarket(root);
});
