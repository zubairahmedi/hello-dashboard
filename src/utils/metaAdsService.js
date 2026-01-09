// Meta Ads service helpers
// Each account has its own webhook that returns aggregated monthly data
import API_CONFIG from '../config/apiConfig';

// Account webhook URLs (one per account)
const ACCOUNT_WEBHOOKS = API_CONFIG.META_ADS_WEBHOOKS;

export const isDeltaConfigured = () => true; // Delta webhook configured at Refresh_Hook

// Simple GET fetch like Dashboard.js uses for n8n webhooks
const fetchJson = async (url) => {
  console.info(`[MetaAds] GET ${url}`);
  let response;
  try {
    response = await fetch(url); // GET by default, just like main dashboard
  } catch (err) {
    console.error(`[MetaAds] Network error calling ${url}:`, err);
    throw err;
  }

  if (!response.ok) {
    let body = '';
    try {
      body = await response.text();
    } catch (e) {
      body = '(unable to read body)';
    }
    console.error(`[MetaAds] ${url} failed ${response.status} ${response.statusText} body=${body?.slice(0, 400)}`);
    throw new Error(`Meta Ads fetch failed: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  console.info(`[MetaAds] GET ${url} ok, items=${Array.isArray(json) ? json.length : 'n/a'}`);
  return json;
};

const toArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload == null) return [];
  return [payload];
};

// Fetch data for a single account
export async function fetchAccountData(accountName) {
  const url = ACCOUNT_WEBHOOKS[accountName];
  if (!url) {
    throw new Error(`No webhook configured for account: ${accountName}`);
  }
  
  console.info(`[MetaAds] Fetching data for account: ${accountName}`);
  const data = await fetchJson(url);
  return {
    accountName,
    data: toArray(data),
    lastUpdated: Date.now()
  };
}

// Fetch data for all configured accounts sequentially (to avoid webhook timeouts/CORS bursts)
export async function fetchAllAccounts(onProgress) {
  const accounts = Object.keys(ACCOUNT_WEBHOOKS).filter(acc => ACCOUNT_WEBHOOKS[acc]);
  
  if (accounts.length === 0) {
    throw new Error('No account webhooks configured');
  }

  console.info(`[MetaAds] Fetching ${accounts.length} accounts sequentially...`);

  const results = [];

  for (const accountName of accounts) {
    try {
      if (onProgress) onProgress({ account: accountName, status: 'fetching' });
      const result = await fetchAccountData(accountName);
      if (onProgress) onProgress({ account: accountName, status: 'success', count: result.data.length });
      results.push(result);
    } catch (err) {
      console.error(`[MetaAds] Failed to fetch ${accountName}:`, err);
      if (onProgress) onProgress({ account: accountName, status: 'error', error: err.message });
      results.push({ accountName, data: [], error: err.message });
    }
  }
  
  // Merge all account data into one array
  const combined = results.flatMap(r => r.data);
  const errors = results.filter(r => r.error);
  
  console.info(`[MetaAds] Fetched ${results.length} accounts, ${combined.length} total rows, ${errors.length} errors`);
  
  return {
    data: combined,
    lastUpdated: Date.now(),
    accountResults: results,
    errors: errors.length > 0 ? errors : null
  };
}

// Legacy functions (kept for compatibility, will be removed later)
export async function fetchFullMetaAdsParts() {
  // For now, just fetch MFE - BEAUTY
  return await fetchAccountData('MFE - BEAUTY');
}

// New: Fetch data for a specific account (preferred over legacy function)
export async function fetchMetaAdsForAccount(accountName) {
  return await fetchAccountData(accountName);
}

// Fetch delta (updated rows only) from n8n Refresh_Hook
export async function fetchDeltaMetaAds() {
  const url = API_CONFIG.REFRESH_HOOK;
  console.info(`[MetaAds] Fetching delta from ${url}`);
  const data = await fetchJson(url);
  return {
    data: toArray(data),
    lastUpdated: Date.now()
  };
}

// Simple upsert merge: assumes records are arrays with stable `id`.
// If data is an object, it shallow merges fields.
export function mergeMetaAdsData(baseData, deltaData) {
  if (!baseData && deltaData) return deltaData;
  if (!deltaData && baseData) return baseData;
  if (!baseData && !deltaData) return null;

  if (Array.isArray(baseData) && Array.isArray(deltaData)) {
    const map = new Map();
    baseData.forEach((item) => {
      if (item && item.id) {
        map.set(item.id, { ...item });
      }
    });
    deltaData.forEach((item) => {
      if (item && item.id) {
        const current = map.get(item.id) || {};
        map.set(item.id, { ...current, ...item });
      }
    });
    return Array.from(map.values());
  }

  if (typeof baseData === 'object' && typeof deltaData === 'object') {
    return { ...baseData, ...deltaData };
  }

  // Fallback: prefer delta when types differ
  return deltaData || baseData;
}

export const META_ADS_FULL_KEY = 'metaAds:full';
export const META_ADS_MERGED_KEY = 'metaAds:merged';
