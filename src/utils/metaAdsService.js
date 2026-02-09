// Meta Ads service helpers
// Single webhook returns all campaign data with monthly breakdown

// Single Meta Ads webhook URL
const META_ADS_WEBHOOK = process.env.REACT_APP_META_ADS_WEBHOOK || 'https://n8n.franchisedataexpert.com/webhook/meta_ads_all';

export const isDeltaConfigured = () => true; // Delta uses same webhook as full data

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

// Transform webhook data to add required fields for UI
function transformMetaAdsData(item) {
  // Calculate CTR if not present
  const impressions = toNumber(item.impressions || 0);
  const clicks = toNumber(item.link_click || 0);
  const spend = toNumber(item.totalspend || 0);
  // Store as decimal (0-1), NOT percentage, for weighted calculations in UI
  const ctr = impressions > 0 ? clicks / impressions : 0;
  const engagement_rate = impressions > 0 ? clicks / impressions : 0;
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
  
  return {
    ...item,
    // Add accountname for OverviewView filtering (aliases campaignname)
    accountname: item.campaignname || item.accountname || 'Unknown',
    // Add aggregation type for OverviewView filtering
    _aggregation_type: 'monthly_campaign',
    // Normalize status field (webhook uses compaignStatus with typo)
    campaignstatus: item.compaignStatus || item.campaignstatus || item.status || 'UNKNOWN',
    // Calculate missing metrics (stored as decimals, not percentages)
    ctr: item.ctr || ctr,
    engagement_rate: item.engagement_rate || engagement_rate,
    cpm: item.cpm || cpm,
    // Ensure numeric fields are numbers
    impressions: impressions,
    link_click: clicks,
    totalspend: spend,
    totalleads: toNumber(item.totalleads || item.leads || 0),
    Reach: toNumber(item.Reach || item.reach || 0)
  };
}

function toNumber(val, fallback = 0) {
  const n = typeof val === 'string' ? parseFloat(val) : Number(val);
  return Number.isFinite(n) ? n : fallback;
}

// Fetch all campaign data from single webhook
export async function fetchAllCampaigns() {
  console.info(`[MetaAds] Fetching all campaign data...`);
  const rawData = await fetchJson(META_ADS_WEBHOOK);
  const data = toArray(rawData).map(transformMetaAdsData);
  return {
    data,
    lastUpdated: Date.now()
  };
}

// Legacy function names (redirected to fetchAllCampaigns for compatibility)
export async function fetchAccountData(accountName) {
  console.info(`[MetaAds] fetchAccountData called (legacy), fetching all campaigns...`);
  return await fetchAllCampaigns();
}

export async function fetchAllAccounts(onProgress) {
  console.info(`[MetaAds] fetchAllAccounts called (legacy), fetching all campaigns...`);
  if (onProgress) onProgress({ status: 'fetching' });
  const result = await fetchAllCampaigns();
  if (onProgress) onProgress({ status: 'success', count: result.data.length });
  return result;
}

export async function fetchFullMetaAdsParts() {
  console.info(`[MetaAds] fetchFullMetaAdsParts called (legacy), fetching all campaigns...`);
  return await fetchAllCampaigns();
}

export async function fetchMetaAdsForAccount(accountName) {
  console.info(`[MetaAds] fetchMetaAdsForAccount called (legacy), fetching all campaigns...`);
  return await fetchAllCampaigns();
}

// Fetch delta (updated rows only) - now just fetches from main webhook and transforms
export async function fetchDeltaMetaAds() {
  console.info(`[MetaAds] Fetching delta (using main webhook)`);
  const rawData = await fetchJson(META_ADS_WEBHOOK);
  const data = toArray(rawData).map(transformMetaAdsData);
  return {
    data,
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
