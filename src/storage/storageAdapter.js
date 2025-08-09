/**
 * Storage Adapter - Bridge between centralized storage and non-React files
 * Provides compatibility layer for legacy JS files that cannot use React hooks
 */

import { STORAGE_KEYS } from "@scripts/constants/registry.js";
import { saveToChrome, getFromChrome, batchSaveToChrome, batchGetFromChrome } from "./chromeBridge.js";
import log from "@scripts/commons/logger.js";

/**
 * Global storage state for non-React files
 * This acts as a minimal version of the React context state
 */
let globalStorageState = {
  token: null,
  username: null,
  hook: null,
  modeType: null,
  enable: true,
  useCustomTemplate: false,
  dirTemplate: "{{language}}/{{removeAfterSpace(level)}}/{{problemId}}. {{safe(title)}}",
  stats: {
    version: "0.0.0",
    branches: {},
    submission: {},
    problems: {},
  },
  isInitialized: false,
};

/**
 * Storage change listeners for non-React components
 */
const storageListeners = new Set();

/**
 * Initialize storage adapter
 * Call this once at the start of your application
 */
export async function initializeStorageAdapter() {
  if (globalStorageState.isInitialized) {
    return globalStorageState;
  }

  try {
    log.info("StorageAdapter: Initializing...");

    // Sync with Chrome storage
    const chromeData = await batchGetFromChrome([
      STORAGE_KEYS.TOKEN,
      STORAGE_KEYS.USERNAME,
      STORAGE_KEYS.HOOK,
      STORAGE_KEYS.MODE_TYPE,
      STORAGE_KEYS.ENABLE,
      STORAGE_KEYS.USE_CUSTOM_TEMPLATE,
      STORAGE_KEYS.DIR_TEMPLATE,
      STORAGE_KEYS.STATS,
    ]);

    // Update global state
    updateGlobalState(chromeData);

    // Set up Chrome storage listener
    chrome.storage.onChanged.addListener(handleChromeStorageChange);

    globalStorageState.isInitialized = true;
    log.info("StorageAdapter: Initialized successfully");

    return globalStorageState;
  } catch (error) {
    log.error("StorageAdapter: Initialization failed", error);
    throw error;
  }
}

/**
 * Update global state from Chrome storage data
 */
function updateGlobalState(chromeData) {
  if (chromeData[STORAGE_KEYS.TOKEN] !== undefined) {
    globalStorageState.token = chromeData[STORAGE_KEYS.TOKEN];
  }

  if (chromeData[STORAGE_KEYS.USERNAME] !== undefined) {
    globalStorageState.username = chromeData[STORAGE_KEYS.USERNAME];
  }

  if (chromeData[STORAGE_KEYS.HOOK] !== undefined) {
    globalStorageState.hook = chromeData[STORAGE_KEYS.HOOK];
  }

  if (chromeData[STORAGE_KEYS.MODE_TYPE] !== undefined) {
    globalStorageState.modeType = chromeData[STORAGE_KEYS.MODE_TYPE];
  }

  if (chromeData[STORAGE_KEYS.ENABLE] !== undefined) {
    globalStorageState.enable = chromeData[STORAGE_KEYS.ENABLE];
  }

  if (chromeData[STORAGE_KEYS.USE_CUSTOM_TEMPLATE] !== undefined) {
    globalStorageState.useCustomTemplate = chromeData[STORAGE_KEYS.USE_CUSTOM_TEMPLATE];
  }

  if (chromeData[STORAGE_KEYS.DIR_TEMPLATE] !== undefined) {
    globalStorageState.dirTemplate = chromeData[STORAGE_KEYS.DIR_TEMPLATE];
  }

  if (chromeData[STORAGE_KEYS.STATS] !== undefined) {
    globalStorageState.stats = chromeData[STORAGE_KEYS.STATS] || globalStorageState.stats;
  }
}

/**
 * Handle Chrome storage changes
 */
function handleChromeStorageChange(changes, namespace) {
  if (namespace !== "local") return;

  log.debug("StorageAdapter: Chrome storage changed", changes);

  // Update global state
  updateGlobalState(changes);

  // Notify listeners
  storageListeners.forEach((listener) => {
    try {
      listener(globalStorageState, changes);
    } catch (error) {
      log.error("StorageAdapter: Listener error", error);
    }
  });
}

/**
 * Legacy compatibility functions
 * These match the original storage.js API for easy migration
 */

/**
 * Get token (legacy compatibility)
 */
export async function getToken() {
  await ensureInitialized();
  return globalStorageState.token;
}

/**
 * Get GitHub username (legacy compatibility)
 */
export async function getGithubUsername() {
  await ensureInitialized();
  return globalStorageState.username;
}

/**
 * Get hook (legacy compatibility)
 */
export async function getHook() {
  await ensureInitialized();
  return globalStorageState.hook;
}

/**
 * Get stats (legacy compatibility)
 */
export async function getStats() {
  await ensureInitialized();

  // Ensure stats has all required properties
  if (!globalStorageState.stats.branches) globalStorageState.stats.branches = {};
  if (!globalStorageState.stats.submission) globalStorageState.stats.submission = {};
  if (!globalStorageState.stats.problems) globalStorageState.stats.problems = {};
  if (!globalStorageState.stats.version) globalStorageState.stats.version = "0.0.0";

  return globalStorageState.stats;
}

/**
 * Save stats (legacy compatibility)
 */
export async function saveStats(stats) {
  await ensureInitialized();

  globalStorageState.stats = { ...globalStorageState.stats, ...stats };
  await saveToChrome(STORAGE_KEYS.STATS, globalStorageState.stats);

  // Notify listeners
  notifyListeners({ [STORAGE_KEYS.STATS]: { newValue: globalStorageState.stats } });
}

/**
 * Save token (legacy compatibility)
 */
export async function saveToken(token) {
  await ensureInitialized();

  globalStorageState.token = token;
  await saveToChrome(STORAGE_KEYS.TOKEN, token);

  notifyListeners({ [STORAGE_KEYS.TOKEN]: { newValue: token } });
}

/**
 * Get mode type (legacy compatibility)
 */
export async function getModeType() {
  await ensureInitialized();
  return globalStorageState.modeType;
}

/**
 * Get object from local storage (legacy compatibility)
 */
export async function getObjectFromLocalStorage(key) {
  if (Array.isArray(key)) {
    return await batchGetFromChrome(key);
  } else {
    return await getFromChrome(key);
  }
}

/**
 * Save object in local storage (legacy compatibility)
 */
export async function saveObjectInLocalStorage(obj) {
  await batchSaveToChrome(obj);

  // Update global state for tracked keys
  const trackedKeys = [
    STORAGE_KEYS.TOKEN,
    STORAGE_KEYS.USERNAME,
    STORAGE_KEYS.HOOK,
    STORAGE_KEYS.MODE_TYPE,
    STORAGE_KEYS.ENABLE,
    STORAGE_KEYS.USE_CUSTOM_TEMPLATE,
    STORAGE_KEYS.DIR_TEMPLATE,
    STORAGE_KEYS.STATS,
  ];

  const changes = {};
  Object.keys(obj).forEach((key) => {
    if (trackedKeys.includes(key)) {
      changes[key] = { newValue: obj[key] };
    }
  });

  updateGlobalState(obj);
  notifyListeners(changes);
}

/**
 * Update stats SHA from path (legacy compatibility)
 */
export async function updateStatsSHAfromPath(path, sha) {
  const stats = await getStats();

  if (!stats.submission) {
    stats.submission = {};
  }

  updateObjectDatafromPath(stats.submission, path, sha);
  await saveStats(stats);
}

/**
 * Get stats SHA from path (legacy compatibility)
 */
export async function getStatsSHAfromPath(path) {
  const stats = await getStats();

  if (!stats.submission) {
    return null;
  }

  return getObjectDatafromPath(stats.submission, path);
}

/**
 * Helper functions from original storage.js
 */

export function updateObjectDatafromPath(obj, path, data) {
  if (!obj) {
    log.error("updateObjectDatafromPath: obj is null or undefined", { obj, path, data });
    return;
  }

  try {
    let current = obj;
    const pathArray = _swexpertacademyRankRemoveFilter(_baekjoonSpaceRemoverFilter(_programmersRankRemoverFilter(_baekjoonRankRemoverFilter(path))))
      .split("/")
      .filter((p) => p !== "");

    for (const p of pathArray.slice(0, -1)) {
      if (current[p] == null) {
        current[p] = {};
      }
      current = current[p];
    }

    const lastKey = pathArray.pop();
    if (lastKey) {
      current[lastKey] = data;
    }
  } catch (error) {
    log.error("updateObjectDatafromPath error:", error, { obj, path, data });
  }
}

export function getObjectDatafromPath(obj, path) {
  if (!obj) {
    log.warn("getObjectDatafromPath: obj is null or undefined", { obj, path });
    return null;
  }

  try {
    let current = obj;
    const pathArray = _swexpertacademyRankRemoveFilter(_baekjoonSpaceRemoverFilter(_programmersRankRemoverFilter(_baekjoonRankRemoverFilter(path))))
      .split("/")
      .filter((p) => p !== "");

    for (const p of pathArray.slice(0, -1)) {
      if (current[p] == null) {
        return null;
      }
      current = current[p];
    }

    const lastKey = pathArray.pop();
    return lastKey ? current[lastKey] : null;
  } catch (error) {
    log.error("getObjectDatafromPath error:", error, { obj, path });
    return null;
  }
}

// Filter functions from original storage.js
export function _baekjoonRankRemoverFilter(path) {
  return path.replace(/\/(Unrated|Silver|Bronze|Gold|Platinum|Diamond|Ruby|Master)\//g, "/");
}

export function _programmersRankRemoverFilter(path) {
  return path.replace(/\/(lv[0-9]|unrated)\//g, "/");
}

export function _baekjoonSpaceRemoverFilter(path) {
  return path.replace(/( | |&nbsp|&#160|&#8197|%E2%80%85|%20)/g, "");
}

export function _swexpertacademyRankRemoveFilter(path) {
  return path.replace(/\/D([0-8]+)\//g, "/");
}

/**
 * Utility functions
 */

async function ensureInitialized() {
  if (!globalStorageState.isInitialized) {
    await initializeStorageAdapter();
  }
}

function notifyListeners(changes) {
  storageListeners.forEach((listener) => {
    try {
      listener(globalStorageState, changes);
    } catch (error) {
      log.error("StorageAdapter: Listener error", error);
    }
  });
}

/**
 * Add listener for storage changes
 */
export function addStorageListener(listener) {
  storageListeners.add(listener);

  // Return unsubscribe function
  return () => {
    storageListeners.delete(listener);
  };
}

/**
 * Get current storage state
 */
export function getStorageState() {
  return { ...globalStorageState };
}

/**
 * Get directory name from template (legacy compatibility)
 */
export async function getDirNameByTemplate(basePath, language, problemInfo = {}) {
  await ensureInitialized();

  // If custom template is not enabled, use simple basePath
  if (!globalStorageState.useCustomTemplate || !globalStorageState.dirTemplate) {
    return basePath;
  }

  // Process template variables
  let template = globalStorageState.dirTemplate;

  // Replace template variables
  const variables = {
    language: language || "",
    platform: problemInfo.platform || "baekjoon",
    problemId: problemInfo.problemId || "",
    title: sanitizeFileName(problemInfo.title || ""),
    level: problemInfo.level || "",
    difficulty: problemInfo.difficulty || "",
    category: problemInfo.category || "",
  };

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, "g");
    template = template.replace(regex, value);
  });

  // Handle special functions like removeAfterSpace and safe
  template = template.replace(/{{removeAfterSpace\(([^)]+)\)}}/g, (match, p1) => {
    const value = variables[p1] || "";
    return value.split(" ")[0];
  });

  template = template.replace(/{{safe\(([^)]+)\)}}/g, (match, p1) => {
    const value = variables[p1] || "";
    return sanitizeFileName(value);
  });

  return template || basePath;
}

/**
 * Sanitize filename for safe filesystem usage
 */
function sanitizeFileName(name) {
  return String(name)
    .replace(/[<>:"/\\|?*]/g, "") // Remove invalid characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

/**
 * Export default adapter (legacy compatibility)
 */
const storageAdapter = {
  initializeStorageAdapter,
  getToken,
  getGithubUsername,
  getHook,
  getStats,
  saveStats,
  saveToken,
  getModeType,
  getObjectFromLocalStorage,
  saveObjectInLocalStorage,
  updateStatsSHAfromPath,
  getStatsSHAfromPath,
  getDirNameByTemplate,
  addStorageListener,
  getStorageState,
};

export default storageAdapter;
