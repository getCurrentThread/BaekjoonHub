/**
 * Chrome Storage Bridge
 * Abstraction layer for Chrome storage API with React integration
 */

import { STORAGE_KEYS } from "@scripts/constants/registry.js";
import log from "@scripts/commons/logger.js";

/**
 * Sync initial state from Chrome storage
 */
export async function syncWithChromeStorage(dispatch) {
  try {
    // Get all relevant storage keys
    const keys = [
      STORAGE_KEYS.TOKEN,
      STORAGE_KEYS.USERNAME,
      STORAGE_KEYS.HOOK,
      STORAGE_KEYS.MODE_TYPE,
      STORAGE_KEYS.ENABLE,
      STORAGE_KEYS.USE_CUSTOM_TEMPLATE,
      STORAGE_KEYS.DIR_TEMPLATE,
      STORAGE_KEYS.STATS,
    ];

    const data = await chrome.storage.local.get(keys);

    log.info("Chrome Storage Sync: Retrieved data", data);

    // Dispatch sync action with all data
    dispatch({
      type: "SYNC_FROM_CHROME",
      payload: data,
    });

    return data;
  } catch (error) {
    log.error("Chrome Storage Sync Error:", error);
    dispatch({
      type: "SET_ERROR",
      payload: "Failed to sync with Chrome storage",
    });
    throw error;
  }
}

/**
 * Save state to Chrome storage
 * Used for persistence when state changes
 */
export async function saveToChrome(key, value) {
  try {
    await chrome.storage.local.set({ [key]: value });
    log.debug(`Saved to Chrome storage: ${key}`, value);
    return true;
  } catch (error) {
    log.error(`Error saving to Chrome storage: ${key}`, error);
    throw error;
  }
}

/**
 * Batch save multiple values to Chrome storage
 */
export async function batchSaveToChrome(data) {
  try {
    await chrome.storage.local.set(data);
    log.debug("Batch saved to Chrome storage", data);
    return true;
  } catch (error) {
    log.error("Error batch saving to Chrome storage", error);
    throw error;
  }
}

/**
 * Get value from Chrome storage
 */
export async function getFromChrome(key) {
  try {
    const result = await chrome.storage.local.get(key);
    return result[key];
  } catch (error) {
    log.error(`Error getting from Chrome storage: ${key}`, error);
    throw error;
  }
}

/**
 * Get multiple values from Chrome storage
 */
export async function batchGetFromChrome(keys) {
  try {
    const result = await chrome.storage.local.get(keys);
    return result;
  } catch (error) {
    log.error("Error batch getting from Chrome storage", error);
    throw error;
  }
}

/**
 * Remove value from Chrome storage
 */
export async function removeFromChrome(key) {
  try {
    await chrome.storage.local.remove(key);
    log.debug(`Removed from Chrome storage: ${key}`);
    return true;
  } catch (error) {
    log.error(`Error removing from Chrome storage: ${key}`, error);
    throw error;
  }
}

/**
 * Clear all Chrome storage
 */
export async function clearChromeStorage() {
  try {
    await chrome.storage.local.clear();
    log.info("Chrome storage cleared");
    return true;
  } catch (error) {
    log.error("Error clearing Chrome storage", error);
    throw error;
  }
}

/**
 * Subscribe to Chrome storage changes
 * Returns unsubscribe function
 */
export function subscribeToChanges(callback) {
  const listener = (changes, namespace) => {
    if (namespace === "local") {
      callback(changes);
    }
  };

  chrome.storage.onChanged.addListener(listener);

  // Return unsubscribe function
  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}
