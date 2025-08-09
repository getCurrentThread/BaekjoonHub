/**
 * Baekjoon Storage - Migrated to Centralized Storage
 * Platform-specific storage functions using centralized state management
 */

import { getObjectFromLocalStorage, saveObjectInLocalStorage, addStorageListener, initializeStorageAdapter } from "@/storage/storageAdapter.js";
import log from "@scripts/commons/logger.js";

// Storage keys for Baekjoon-specific data
const BAEKJOON_STORAGE_KEYS = {
  PROBLEM_DATA: "baekjoon_problem_data",
  SUBMIT_CODE_DATA: "baekjoon_submit_code_data",
  SOLVED_AC_DATA: "baekjoon_solved_ac_data",
  USER_DATA: "baekjoon_user_data",
};

/**
 * Baekjoon Storage Manager
 * Handles platform-specific storage with centralized state management
 */
export class BaekjoonStorage {
  constructor() {
    this.isInitialized = false;
    this.cache = {
      problemData: new Map(),
      submitCodeData: new Map(),
      solvedACData: new Map(),
      userData: new Map(),
    };
  }

  /**
   * Initialize Baekjoon storage
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize centralized storage adapter
      await initializeStorageAdapter();

      // Load cached data
      await this.loadCachedData();

      // Set up storage listener
      this.unsubscribeStorage = addStorageListener((state, changes) => {
        this.handleStorageChange(changes);
      });

      this.isInitialized = true;
      log.info("BaekjoonStorage: Initialized successfully");
    } catch (error) {
      log.error("BaekjoonStorage: Initialization failed:", error);
      throw error;
    }
  }

  /**
   * Load cached data from storage
   */
  async loadCachedData() {
    try {
      const data = await getObjectFromLocalStorage([BAEKJOON_STORAGE_KEYS.PROBLEM_DATA, BAEKJOON_STORAGE_KEYS.SUBMIT_CODE_DATA, BAEKJOON_STORAGE_KEYS.SOLVED_AC_DATA, BAEKJOON_STORAGE_KEYS.USER_DATA]);

      // Load problem data
      if (data[BAEKJOON_STORAGE_KEYS.PROBLEM_DATA]) {
        Object.entries(data[BAEKJOON_STORAGE_KEYS.PROBLEM_DATA]).forEach(([key, value]) => {
          this.cache.problemData.set(key, value);
        });
      }

      // Load submit code data
      if (data[BAEKJOON_STORAGE_KEYS.SUBMIT_CODE_DATA]) {
        Object.entries(data[BAEKJOON_STORAGE_KEYS.SUBMIT_CODE_DATA]).forEach(([key, value]) => {
          this.cache.submitCodeData.set(key, value);
        });
      }

      // Load solved.ac data
      if (data[BAEKJOON_STORAGE_KEYS.SOLVED_AC_DATA]) {
        Object.entries(data[BAEKJOON_STORAGE_KEYS.SOLVED_AC_DATA]).forEach(([key, value]) => {
          this.cache.solvedACData.set(key, value);
        });
      }

      // Load user data
      if (data[BAEKJOON_STORAGE_KEYS.USER_DATA]) {
        Object.entries(data[BAEKJOON_STORAGE_KEYS.USER_DATA]).forEach(([key, value]) => {
          this.cache.userData.set(key, value);
        });
      }

      log.debug("BaekjoonStorage: Cached data loaded", {
        problemData: this.cache.problemData.size,
        submitCodeData: this.cache.submitCodeData.size,
        solvedACData: this.cache.solvedACData.size,
        userData: this.cache.userData.size,
      });
    } catch (error) {
      log.error("BaekjoonStorage: Error loading cached data:", error);
    }
  }

  /**
   * Handle storage changes
   */
  handleStorageChange(changes) {
    // Update cache when storage changes
    if (changes[BAEKJOON_STORAGE_KEYS.PROBLEM_DATA]) {
      const newData = changes[BAEKJOON_STORAGE_KEYS.PROBLEM_DATA].newValue || {};
      this.cache.problemData.clear();
      Object.entries(newData).forEach(([key, value]) => {
        this.cache.problemData.set(key, value);
      });
    }

    // Similar for other data types...
    log.debug("BaekjoonStorage: Cache updated from storage changes");
  }

  /**
   * Save cache to persistent storage
   */
  async persistCache(cacheType) {
    try {
      let data = {};
      let storageKey = "";

      switch (cacheType) {
        case "problemData":
          data = Object.fromEntries(this.cache.problemData);
          storageKey = BAEKJOON_STORAGE_KEYS.PROBLEM_DATA;
          break;
        case "submitCodeData":
          data = Object.fromEntries(this.cache.submitCodeData);
          storageKey = BAEKJOON_STORAGE_KEYS.SUBMIT_CODE_DATA;
          break;
        case "solvedACData":
          data = Object.fromEntries(this.cache.solvedACData);
          storageKey = BAEKJOON_STORAGE_KEYS.SOLVED_AC_DATA;
          break;
        case "userData":
          data = Object.fromEntries(this.cache.userData);
          storageKey = BAEKJOON_STORAGE_KEYS.USER_DATA;
          break;
        default:
          throw new Error(`Unknown cache type: ${cacheType}`);
      }

      await saveObjectInLocalStorage({
        [storageKey]: data,
      });

      log.debug(`BaekjoonStorage: ${cacheType} persisted to storage`);
    } catch (error) {
      log.error(`BaekjoonStorage: Error persisting ${cacheType}:`, error);
      throw error;
    }
  }

  /**
   * Ensure storage is initialized
   */
  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.unsubscribeStorage) {
      this.unsubscribeStorage();
      this.unsubscribeStorage = null;
    }

    // Clear caches
    this.cache.problemData.clear();
    this.cache.submitCodeData.clear();
    this.cache.solvedACData.clear();
    this.cache.userData.clear();

    this.isInitialized = false;
    log.info("BaekjoonStorage: Destroyed");
  }
}

// Create singleton instance
const baekjoonStorage = new BaekjoonStorage();

/**
 * Problem data functions
 */

export async function getProblemData(problemId) {
  await baekjoonStorage.ensureInitialized();
  return baekjoonStorage.cache.problemData.get(problemId) || null;
}

export async function updateProblemData(problemId, data) {
  await baekjoonStorage.ensureInitialized();

  // Add metadata
  const problemData = {
    ...data,
    problemId,
    updatedAt: Date.now(),
    platform: "baekjoon",
  };

  baekjoonStorage.cache.problemData.set(problemId, problemData);
  await baekjoonStorage.persistCache("problemData");

  log.debug("BaekjoonStorage: Problem data updated", { problemId });
  return problemData;
}

export async function getAllProblemData() {
  await baekjoonStorage.ensureInitialized();
  return Object.fromEntries(baekjoonStorage.cache.problemData);
}

/**
 * Submit code data functions
 */

export async function getSubmitCodeData(submissionId) {
  await baekjoonStorage.ensureInitialized();
  return baekjoonStorage.cache.submitCodeData.get(submissionId) || null;
}

export async function updateSubmitCodeData(submissionId, code) {
  await baekjoonStorage.ensureInitialized();

  const submitData = {
    submissionId,
    code,
    updatedAt: Date.now(),
    platform: "baekjoon",
  };

  baekjoonStorage.cache.submitCodeData.set(submissionId, submitData);
  await baekjoonStorage.persistCache("submitCodeData");

  log.debug("BaekjoonStorage: Submit code data updated", { submissionId });
  return submitData;
}

export async function getAllSubmitCodeData() {
  await baekjoonStorage.ensureInitialized();
  return Object.fromEntries(baekjoonStorage.cache.submitCodeData);
}

/**
 * Solved.ac data functions
 */

export async function getSolvedACData(problemId) {
  await baekjoonStorage.ensureInitialized();
  return baekjoonStorage.cache.solvedACData.get(problemId) || null;
}

export async function updateSolvedACData(problemId, data) {
  await baekjoonStorage.ensureInitialized();

  const solvedData = {
    ...data,
    problemId,
    updatedAt: Date.now(),
    platform: "baekjoon",
  };

  baekjoonStorage.cache.solvedACData.set(problemId, solvedData);
  await baekjoonStorage.persistCache("solvedACData");

  log.debug("BaekjoonStorage: Solved.ac data updated", { problemId });
  return solvedData;
}

export async function getAllSolvedACData() {
  await baekjoonStorage.ensureInitialized();
  return Object.fromEntries(baekjoonStorage.cache.solvedACData);
}

/**
 * User data functions
 */

export async function getUserData(username) {
  await baekjoonStorage.ensureInitialized();
  return baekjoonStorage.cache.userData.get(username) || null;
}

export async function updateUserData(username, data) {
  await baekjoonStorage.ensureInitialized();

  const userData = {
    ...data,
    username,
    updatedAt: Date.now(),
    platform: "baekjoon",
  };

  baekjoonStorage.cache.userData.set(username, userData);
  await baekjoonStorage.persistCache("userData");

  log.debug("BaekjoonStorage: User data updated", { username });
  return userData;
}

export async function getAllUserData() {
  await baekjoonStorage.ensureInitialized();
  return Object.fromEntries(baekjoonStorage.cache.userData);
}

/**
 * Utility functions
 */

export async function clearBaekjoonCache() {
  await baekjoonStorage.ensureInitialized();

  baekjoonStorage.cache.problemData.clear();
  baekjoonStorage.cache.submitCodeData.clear();
  baekjoonStorage.cache.solvedACData.clear();
  baekjoonStorage.cache.userData.clear();

  // Clear from persistent storage
  await saveObjectInLocalStorage({
    [BAEKJOON_STORAGE_KEYS.PROBLEM_DATA]: {},
    [BAEKJOON_STORAGE_KEYS.SUBMIT_CODE_DATA]: {},
    [BAEKJOON_STORAGE_KEYS.SOLVED_AC_DATA]: {},
    [BAEKJOON_STORAGE_KEYS.USER_DATA]: {},
  });

  log.info("BaekjoonStorage: Cache cleared");
}

export async function getBaekjoonStats() {
  await baekjoonStorage.ensureInitialized();

  return {
    problemCount: baekjoonStorage.cache.problemData.size,
    submissionCount: baekjoonStorage.cache.submitCodeData.size,
    solvedACCount: baekjoonStorage.cache.solvedACData.size,
    userCount: baekjoonStorage.cache.userData.size,
    lastUpdate: Math.max(
      ...Array.from(baekjoonStorage.cache.problemData.values()).map((p) => p.updatedAt || 0),
      ...Array.from(baekjoonStorage.cache.submitCodeData.values()).map((s) => s.updatedAt || 0),
      ...Array.from(baekjoonStorage.cache.solvedACData.values()).map((sa) => sa.updatedAt || 0),
      ...Array.from(baekjoonStorage.cache.userData.values()).map((u) => u.updatedAt || 0)
    ),
  };
}

/**
 * Legacy compatibility - matches original storage.js API
 */

export function isNull(value) {
  return value === null || value === undefined;
}

export function isEmpty(value) {
  return isNull(value) || value === "" || (Array.isArray(value) && value.length === 0);
}

// Export storage instance for advanced usage
export { baekjoonStorage };
export default baekjoonStorage;
