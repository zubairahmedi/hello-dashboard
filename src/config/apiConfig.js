/**
 * API Configuration
 * Centralizes all external API endpoints
 */

const API_CONFIG = {
  // PDF Service
  PDF_SERVICE: process.env.REACT_APP_PDF_SERVICE_URL || 'https://pdf-service-j950.onrender.com/api/generate-pdf',
  
  // Main Data Webhooks
  AIRTABLE_WEBHOOK: process.env.REACT_APP_AIRTABLE_WEBHOOK || 'https://n8n.aiclinicgenius.com/webhook/airtable',
  MONTHLY_PERFORMANCE_WEBHOOK: process.env.REACT_APP_MONTHLY_WEBHOOK || 'https://n8n.aiclinicgenius.com/webhook/c4da33a4-5da9-4570-93b8-d0f89385ed',
  SOURCES_WEBHOOK: process.env.REACT_APP_SOURCES_WEBHOOK || 'https://n8n.aiclinicgenius.com/webhook/abb37c74-5acd-44cf-9c38-981d4692ea4a',
  CONSULTANT_META_ADS_WEBHOOK: process.env.REACT_APP_CONSULTANT_META_ADS_WEBHOOK || 'https://n8n.aiclinicgenius.com/webhook/d27d1b26-441a-490c-b5fb-5f6633dab10c',
  
  // Meta Ads Webhooks
  META_ADS_WEBHOOKS: {
    'MFE - BEAUTY': process.env.REACT_APP_META_ADS_BEAUTY || 'https://n8n.aiclinicgenius.com/webhook/Meta_Ads_part1',
    'MFE - FOOD': process.env.REACT_APP_META_ADS_FOOD || 'https://n8n.aiclinicgenius.com/webhook/mfe-food',
    'MFE - RECREATION': process.env.REACT_APP_META_ADS_RECREATION || 'https://n8n.aiclinicgenius.com/webhook/mfe-recreation',
    'MFE - HOME': process.env.REACT_APP_META_ADS_HOME || 'https://n8n.aiclinicgenius.com/webhook/mfe-home',
    'MFE - PET': process.env.REACT_APP_META_ADS_PET || 'https://n8n.aiclinicgenius.com/webhook/mfe-pet',
    'MFE - FINANCIAL': process.env.REACT_APP_META_ADS_FINANCIAL || 'https://n8n.aiclinicgenius.com/webhook/mfe_financial',
  },
  
  // Refresh Hook
  REFRESH_HOOK: process.env.REACT_APP_REFRESH_HOOK || 'https://n8n.aiclinicgenius.com/webhook/Refresh_Hook',
};

export default API_CONFIG;
