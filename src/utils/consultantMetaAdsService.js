/**
 * Consultant Meta Ads Service
 * Fetches and manages consultant-level Meta Ads tagged contacts data
 */

const CONSULTANT_META_ADS_WEBHOOK = 'https://n8n.aiclinicgenius.com/webhook/d27d1b26-441a-490c-b5fb-5f6633dab10c';
export const CONSULTANT_META_ADS_KEY = 'consultantMetaAds';
const TIME_WINDOWS = ['30', '90', '150', '365'];
const DEFAULT_TAG_KEY = 'allFacebook';

function normalizeConsultantRecord(record) {
  if (!record || typeof record !== 'object') {
    return null;
  }

  const countsSource = record.countsByTimeWindow || {};
  const countsByTimeWindow = {};
  TIME_WINDOWS.forEach((window) => {
    const raw = countsSource?.[window];
    const numeric = typeof raw === 'number' ? raw : Number(raw) || 0;
    countsByTimeWindow[window] = numeric;
  });

  const totalTaggedContacts = typeof record.totalTaggedContacts === 'number'
    ? record.totalTaggedContacts
    : typeof record.totalFacebookContacts === 'number'
      ? record.totalFacebookContacts
      : TIME_WINDOWS.reduce((sum, window) => sum + (countsByTimeWindow[window] || 0), 0);

  const tagCountsByTimeWindow = {};
  const tagCountsSource = record.tagCountsByTimeWindow;
  TIME_WINDOWS.forEach((window) => {
    const windowTags = tagCountsSource?.[window];
    if (windowTags && typeof windowTags === 'object') {
      tagCountsByTimeWindow[window] = windowTags;
    } else {
      tagCountsByTimeWindow[window] = { [DEFAULT_TAG_KEY]: countsByTimeWindow[window] };
    }
  });

  return {
    ...record,
    assignedTo: record.assignedTo || 'Unassigned',
    countsByTimeWindow,
    totalTaggedContacts,
    tagCountsByTimeWindow
  };
}

/**
 * Fetch consultant meta ads data from the webhook
 * @returns {Promise<{data: Array, lastUpdated: number}>}
 */
export async function fetchConsultantMetaAds() {
  try {
    console.log('[ConsultantMetaAdsService] Fetching from webhook...');
    const response = await fetch(CONSULTANT_META_ADS_WEBHOOK, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('[ConsultantMetaAdsService] Fetched data:', { count: data?.length, data });

    const normalized = (Array.isArray(data) ? data : [])
      .map(normalizeConsultantRecord)
      .filter(Boolean);

    return {
      data: normalized,
      lastUpdated: Date.now()
    };
  } catch (error) {
    console.error('[ConsultantMetaAdsService] Fetch failed:', error);
    throw error;
  }
}

/**
 * Get all unique tags from the data
 * @param {Array} data - Array of consultant data
 * @returns {Array<string>} Array of unique tag names
 */
export function getAllTags(data) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return [];
  }

  const tagsSet = new Set();
  data.forEach(consultant => {
    if (consultant.tagCountsByTimeWindow) {
      // Get tags from any time window (they should be consistent)
      const timeWindows = Object.values(consultant.tagCountsByTimeWindow);
      if (timeWindows.length > 0) {
        Object.keys(timeWindows[0]).forEach(tag => tagsSet.add(tag));
      }
    }
  });

  return Array.from(tagsSet).sort();
}

/**
 * Get time windows from the data
 * @returns {Array<string>} Array of time window keys
 */
export function getTimeWindows() {
  return TIME_WINDOWS;
}
