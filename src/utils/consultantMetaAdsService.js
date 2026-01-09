/**
 * Consultant Meta Ads Service
 * Fetches and manages consultant-level Meta Ads tagged contacts data
 */
import API_CONFIG from '../config/apiConfig';

const CONSULTANT_META_ADS_WEBHOOK = API_CONFIG.CONSULTANT_META_ADS_WEBHOOK;
export const CONSULTANT_META_ADS_KEY = 'consultantMetaAds';

/**
 * Fetch consultant meta ads data from the webhook
 * @returns {Promise<{data: Array, lastUpdated: number}>}
 */
export async function fetchConsultantMetaAds() {
  try {
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

    return {
      data: Array.isArray(data) ? data : [],
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
  return ['30', '90', '150', '365'];
}
