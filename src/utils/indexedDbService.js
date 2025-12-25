/**
 * IndexedDB Service for persistent data caching
 * Stores dashboard data locally so it persists across browser sessions
 */

const DB_NAME = 'FranchiseExpertsDashboard';
const DB_VERSION = 1;
const STORE_NAME = 'dashboardData';

let db = null;

/**
 * Initialize IndexedDB
 */
export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('IndexedDB initialized');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const newDb = event.target.result;
      
      // Create object store if it doesn't exist
      if (!newDb.objectStoreNames.contains(STORE_NAME)) {
        newDb.createObjectStore(STORE_NAME);
        console.log('IndexedDB store created');
      }
    };
  });
};

/**
 * Save data to IndexedDB
 * @param {string} key - Data key
 * @param {object} data - Data to save
 * @returns {Promise}
 */
export const saveData = (key, data) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('IndexedDB not initialized'));
      return;
    }

    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const dataToSave = {
      data,
      timestamp: new Date().toISOString(),
      savedAt: Date.now(),
    };

    const request = store.put(dataToSave, key);

    request.onerror = () => {
      console.error('Error saving to IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log(`Data saved to IndexedDB with key: ${key}`);
      resolve(dataToSave);
    };
  });
};

/**
 * Retrieve data from IndexedDB
 * @param {string} key - Data key
 * @returns {Promise<object|null>}
 */
export const getData = (key) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('IndexedDB not initialized'));
      return;
    }

    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onerror = () => {
      console.error('Error reading from IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      if (request.result) {
        console.log(`Data retrieved from IndexedDB with key: ${key}`, request.result);
        resolve(request.result);
      } else {
        console.log(`No data found in IndexedDB for key: ${key}`);
        resolve(null);
      }
    };
  });
};

/**
 * Delete specific data from IndexedDB
 * @param {string} key - Data key
 * @returns {Promise}
 */
export const deleteData = (key) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('IndexedDB not initialized'));
      return;
    }

    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);

    request.onerror = () => {
      console.error('Error deleting from IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log(`Data deleted from IndexedDB with key: ${key}`);
      resolve();
    };
  });
};

/**
 * Clear all data from IndexedDB
 * @returns {Promise}
 */
export const clearAllData = () => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('IndexedDB not initialized'));
      return;
    }

    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => {
      console.error('Error clearing IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      console.log('IndexedDB cleared');
      resolve();
    };
  });
};

/**
 * Get time elapsed since data was saved (in minutes)
 * @param {number} savedAt - Timestamp when data was saved
 * @returns {number} Minutes elapsed
 */
export const getTimeElapsed = (savedAt) => {
  return Math.floor((Date.now() - savedAt) / 1000 / 60);
};

/**
 * Format data freshness message
 * @param {number} savedAt - Timestamp when data was saved
 * @returns {string} Freshness message
 */
export const getDataFreshnessMessage = (savedAt) => {
  if (!savedAt) return 'No cached data';
  
  const elapsed = getTimeElapsed(savedAt);
  
  if (elapsed < 1) {
    return '📡 Live (just now)';
  } else if (elapsed === 1) {
    return '💾 Cached (1 min ago)';
  } else if (elapsed < 60) {
    return `💾 Cached (${elapsed} mins ago)`;
  } else {
    const hours = Math.floor(elapsed / 60);
    return `💾 Cached (${hours}h ago)`;
  }
};
