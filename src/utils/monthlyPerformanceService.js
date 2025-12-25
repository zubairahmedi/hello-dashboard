/**
 * Monthly Performance Service
 * Fetches detailed monthly breakdown data for consultant best/worst month analysis
 * Uses SPECIAL WEBHOOK (different from main dashboard webhook)
 */

const MONTHLY_SPECIAL_WEBHOOK = 'https://n8n.aiclinicgenius.com/webhook/c4da33a4-5da9-4570-93b8-d0f89385ed';

// ⚠️ HARDCODED MONTHLY WEBHOOK IDS (verified and correct)
// These IDs are ONLY for the monthly webhook - NEVER use these for main Airtable webhook
const MONTHLY_WEBHOOK_IDS = {
  'Auston': 'O7soRErw04P5g37sZ5fL',
  'Austin': 'O7soRErw04P5g37sZ5fL',  // Fallback spelling variant
  'Austin Touey': 'O7soRErw04P5g37sZ5fL',  // Full name variant
  'Lisa': 'hlZvGYqioLUo9yppR06s',
  'Lisa Magnan': 'hlZvGYqioLUo9yppR06s',  // Full name variant
  'Priscila': 'lhLCrve2EOCmojSbSmd0',
  'Priscilla C.': 'lhLCrve2EOCmojSbSmd0',  // Alternative spelling
  'Keith': 'nKBSR31TmOpRLFxuThXi',
  'Keith Talty': 'nKBSR31TmOpRLFxuThXi'  // Full name variant
};

/**
 * Fetch monthly performance data for a consultant (ID REQUIRED)
 * @param {{id: string, name?: string} | string} consultant - consultant object or raw id
 * @returns {Promise<object>} Monthly data
 */
export async function fetchMonthlyPerformance(consultant) {
  try {
    let consultantId = typeof consultant === 'object' ? consultant?.id : consultant;
    const consultantName = typeof consultant === 'object' ? consultant?.name : undefined;
    
    // ⚠️ If we have a name, map it to the correct monthly webhook ID
    // The main webhook IDs don't match monthly webhook IDs, so we MUST use name mapping
    if (consultantName) {
      // Try exact match first
      if (MONTHLY_WEBHOOK_IDS[consultantName]) {
        consultantId = MONTHLY_WEBHOOK_IDS[consultantName];
        console.log(`[Monthly] Mapped name "${consultantName}" to monthly webhook ID: ${consultantId}`);
      } else {
        // Try first name as fallback
        const firstName = consultantName.split(' ')[0];
        if (MONTHLY_WEBHOOK_IDS[firstName]) {
          consultantId = MONTHLY_WEBHOOK_IDS[firstName];
          console.log(`[Monthly] Mapped first name "${firstName}" (from "${consultantName}") to monthly webhook ID: ${consultantId}`);
        } else {
          console.warn(`[Monthly] No mapping found for consultant name: "${consultantName}". Available keys: ${Object.keys(MONTHLY_WEBHOOK_IDS).join(', ')}`);
        }
      }
    }
    
    console.log(`[Monthly] Fetching monthly data for id=${consultantId || 'MISSING'} name=${consultantName || 'n/a'}`);
    
    if (!consultantId) {
      console.warn('[Monthly] Missing consultant id for monthly webhook');
      return {};
    }
    
    const response = await fetch(MONTHLY_SPECIAL_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        consultant_id: consultantId
      })
    });

    console.log(`[Monthly] Response status: ${response.status}, headers: ${JSON.stringify({...response.headers})}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Monthly] HTTP error! status: ${response.status}, body: ${errorText}`);
      return {};
    }

    // The browser's fetch API should automatically handle content-encoding (gzip, br, etc)
    // But let's read it as text first to debug
    const responseText = await response.text();
    console.log(`[Monthly] Response text length: ${responseText?.length || 0}, preview: ${responseText?.substring(0, 200) || '(empty)'}`);
    
    if (!responseText || responseText.trim() === '') {
      console.error('[Monthly] Empty response from webhook');
      return {};
    }

    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`[Monthly] Successfully parsed JSON with ${Object.keys(data).length} keys`);
    } catch (parseError) {
      console.error('[Monthly] Failed to parse JSON:', parseError, 'Response preview:', responseText.substring(0, 200));
      return {};
    }
    
    // Extract statusByMonth which has the detailed breakdown
    if (!data.statusByMonth) {
      console.warn(`[Monthly] No statusByMonth in response`);
      return {};
    }
    
    // Transform statusByMonth into our internal format
    const monthlyData = {};
    Object.entries(data.statusByMonth).forEach(([monthKey, status]) => {
      const total = (status.showed || 0) + (status.noshow || 0) + (status.confirmed || 0) + (status.cancelled || 0);
      monthlyData[monthKey] = {
        showed: status.showed || 0,
        noshow: status.noshow || 0,
        confirmed: status.confirmed || 0,
        cancelled: status.cancelled || 0,
        total: total
      };
    });
    
    console.log(`[Monthly] Transformed monthly data:`, monthlyData);
    return monthlyData;
  } catch (error) {
    console.error('[Monthly] Error fetching monthly performance:', error);
    return {}; // Return empty object on error to prevent breaking UI
  }
}

/**
 * Calculate performance score for a month
 * @param {object} monthData - { showed, noshow, confirmed, cancelled, total }
 * @returns {number} Performance score
 */
export function calculateMonthScore(monthData) {
  const total = Number(monthData.total || 0);
  const showed = Number(monthData.showed || 0);
  
  if (total === 0) return 0;
  
  const showRate = (showed / total) * 100;
  
  // Performance Score = Volume × Quality
  // Divide by 10 for readability (so scores are 0-100 range instead of 0-1000)
  return (total * showRate) / 10;
}

/**
 * Find best and worst performing months
 * @param {object} monthlyData - Monthly data keyed by YYYY-MM
 * @returns {object} { best: {...}, worst: {...} }
 */
export function analyzeBestWorstMonths(monthlyData) {
  if (!monthlyData || Object.keys(monthlyData).length === 0) {
    return { best: null, worst: null };
  }

  const monthsArray = Object.entries(monthlyData).map(([monthKey, data]) => {
    const total = Number(data.total || 0);
    const showed = Number(data.showed || 0);
    const showRate = total > 0 ? ((showed / total) * 100).toFixed(1) : '0.0';
    const score = calculateMonthScore(data);
    
    // Parse YYYY-MM format to readable format
    const [year, month] = monthKey.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[parseInt(month) - 1];
    const label = `${monthName} ${year}`;
    
    return {
      monthKey,
      label,
      appointments: total,
      showed,
      showRate: parseFloat(showRate),
      score: parseFloat(score.toFixed(1)),
      rawData: data
    };
  });

  console.log(`[Monthly] All months from webhook (including zeros):`, monthsArray.map(m => `${m.monthKey}: ${m.appointments} appts`));

  // Filter out months with no data
  const validMonths = monthsArray.filter(m => m.appointments > 0);

  if (validMonths.length === 0) {
    return { best: null, worst: null };
  }

  // Sort by score (best first)
  validMonths.sort((a, b) => b.score - a.score);

  const best = validMonths[0];
  const worst = validMonths[validMonths.length - 1];

  return { best, worst, allMonths: validMonths };
}

/**
 * Format month data for display
 * @param {object} monthData - Single month analysis result
 * @returns {string} Formatted description
 */
export function formatMonthDescription(monthData) {
  if (!monthData) return 'No data';
  
  return `${monthData.appointments} appts • ${monthData.showRate}% show rate`;
}

export default {
  fetchMonthlyPerformance,
  calculateMonthScore,
  analyzeBestWorstMonths,
  formatMonthDescription
};
