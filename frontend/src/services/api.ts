export const BASE_URL = import.meta.env.VITE_API_BASE || 'https://darshil16-stock-prediction-api.hf.space';

// Helper for timeout
const fetchWithTimeout = async (resource: RequestInfo, options: RequestInit & { timeout?: number } = {}) => {
  const { timeout = 10000, ...opts } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    // If the caller provided a signal, link them up so caller can cancel too
    if (opts.signal) {
      opts.signal.addEventListener('abort', () => controller.abort());
    }
    const response = await fetch(resource, { ...opts, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

// Retry mechanism
export const fetchWithRetry = async (url: string, options: RequestInit = {}, retries = 3, delayMs = 1000): Promise<any> => {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}${url}`, options);
    if (!res.ok) {
      if (res.status === 503 && retries > 0) {
        console.warn(`[API] 503 Service Unavailable for ${url}. Retries left: ${retries}`);
        await new Promise((r) => setTimeout(r, delayMs));
        return fetchWithRetry(url, options, retries - 1, delayMs * 1.5);
      }
      throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }
    return res.json();
  } catch (error: any) {
    if ((error.name === 'AbortError' || error.message?.includes('timeout')) && retries > 0) {
      console.warn(`[API] Timeout/Abort for ${url}. Retries left: ${retries}`);
      await new Promise((r) => setTimeout(r, delayMs));
      return fetchWithRetry(url, options, retries - 1, delayMs * 1.5);
    }
    if (retries > 0 && error.name !== 'AbortError') {
      console.warn(`[API] Network error for ${url}: ${error.message}. Retries left: ${retries}`);
      await new Promise((r) => setTimeout(r, delayMs));
      return fetchWithRetry(url, options, retries - 1, delayMs * 1.5);
    }
    console.error(`[API] Failed to fetch ${url} after retries:`, error);
    throw error;
  }
};

export const api = {
  getPrediction: (symbol: string) => {
    const sym = symbol.toUpperCase();
    return fetchWithRetry(`/api/${sym}/predict`);
  },

  refreshPrediction: (symbol: string) => {
    const sym = symbol.toUpperCase();
    return fetchWithRetry(`/api/${sym}/refresh`, { method: 'POST' });
  },

  getHistory: (symbol: string, limit: number = 25) => {
    const sym = symbol.toUpperCase();
    return fetchWithRetry(`/api/${sym}/history?limit=${limit}`);
  },

  getSentiment: (symbol: string) => {
    const sym = symbol.toUpperCase();
    return fetchWithRetry(`/sentiment/${sym}`);
  },

  getLivePrice: (symbol: string) => {
    const sym = symbol.toUpperCase();
    return fetchWithRetry(`/api/${sym}/price`);
  },

  searchSymbol: (query: string, signal?: AbortSignal) => {
    // Search is best effort and interactive, avoiding auto-retries which could lag the UI.
    const url = `/api/search?q=${encodeURIComponent(query)}`;
    return fetchWithTimeout(`${BASE_URL}${url}`, { signal }).then(r => {
      if (!r.ok) throw new Error(`Search failed: ${r.statusText}`);
      return r.json();
    });
  },

  reconcileHistory: () => {
    return fetchWithRetry(`/api/reconcile`, { method: 'POST' }, 0);
  }
};
