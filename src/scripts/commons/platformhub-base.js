/**
 * PlatformHub Base - Migrated to Centralized Storage
 * Base class for platform-specific implementations with centralized state management
 */

import { getToken, getHook, getStats, saveStats, updateStatsSHAfromPath, getStatsSHAfromPath, initializeStorageAdapter, addStorageListener } from "@/storage/storageAdapter.js";
import { isExtensionEnabled } from "./enable.js";
import UploadService from "./uploadservice.js";
import { LoaderFactory } from "./loader-service.js";
import log from "@scripts/commons/logger.js";

/**
 * Base class for all platform implementations
 * Provides common functionality with centralized storage management
 */
// Import real Toast for UI notifications
import { Toast as RealToast } from "./toast.js";

// Toast utility for notifications
export const Toast = {
  info: (message, duration) => {
    log.info(`🔔 ${message}`);
    return RealToast.info(message, duration);
  },
  success: (message, duration) => {
    log.info(`✅ ${message}`);
    return RealToast.success(message, duration);
  },
  warning: (message, duration) => {
    log.warn(`⚠️ ${message}`);
    return RealToast.warning(message, duration);
  },
  error: (message, duration) => {
    log.error(`❌ ${message}`);
    return RealToast.danger(message, duration);
  },
  danger: (message, duration) => {
    log.error(`❌ ${message}`);
    return RealToast.danger(message, duration);
  },
};

// Export log and Toast for compatibility
export { log };

export default class PlatformHubBase {
  constructor(platformName) {
    this.platformName = platformName;
    this.isInitialized = false;
    this.storageState = null;
    this.unsubscribeStorage = null;
  }

  /**
   * Initialize platform with centralized storage
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize storage adapter
      await initializeStorageAdapter();

      // Set up storage listener
      this.unsubscribeStorage = addStorageListener((state, changes) => {
        this.storageState = state;
        this.onStorageChange(changes);
      });

      // Get initial storage state
      const { getStorageState } = await import("@/storage/storageAdapter.js");
      this.storageState = getStorageState();

      this.isInitialized = true;
      log.info(`PlatformHubBase[${this.platformName}]: Initialized successfully`);
    } catch (error) {
      log.error(`PlatformHubBase[${this.platformName}]: Initialization failed:`, error);
      throw error;
    }
  }

  /**
   * Handle storage state changes
   * Override in subclasses for platform-specific behavior
   */
  onStorageChange(changes) {
    log.debug(`PlatformHubBase[${this.platformName}]: Storage changed`, Object.keys(changes));
  }

  /**
   * Initialize platform hub
   * @returns {Promise<boolean>} True if initialization successful and extension is enabled
   */
  async init() {
    log.info(`Initializing ${this.platformName} hub`);

    // Check if extension is enabled globally
    const enabled = await isExtensionEnabled();
    if (!enabled) {
      log.info(`${this.platformName} hub is disabled, skipping initialization`);
      return false;
    }

    // Initialize the storage adapter if not already done
    if (!this.isInitialized) {
      await this.initialize();
    }

    return true;
  }

  /**
   * Check if platform should be active based on storage state
   */
  async shouldBeActive() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Check if extension is enabled
    const isEnabled = await isExtensionEnabled();
    if (!isEnabled) {
      return false;
    }

    // Check if authentication is complete
    const hasToken = !!this.storageState?.token;
    const hasHook = !!this.storageState?.hook;

    return hasToken && hasHook;
  }

  /**
   * Get authentication data from centralized storage
   */
  async getAuthData() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const token = await getToken();
    const hook = await getHook();

    return {
      token,
      hook,
      username: this.storageState?.username,
      isAuthenticated: !!(token && hook),
    };
  }

  /**
   * Get platform statistics
   */
  async getPlatformStats() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const stats = await getStats();
    const platformStats = stats.problems?.[this.platformName] || {};

    return {
      totalSolved: Object.keys(platformStats).length,
      lastSolved: this.getLastSolvedTime(platformStats),
      submissions: stats.submission || {},
      branches: stats.branches || {},
    };
  }

  /**
   * Update problem statistics
   */
  async updateProblemStats(problemId, problemData) {
    try {
      const stats = await getStats();

      if (!stats.problems) {
        stats.problems = {};
      }

      if (!stats.problems[this.platformName]) {
        stats.problems[this.platformName] = {};
      }

      stats.problems[this.platformName][problemId] = {
        ...problemData,
        solvedAt: Date.now(),
        platform: this.platformName,
      };

      await saveStats(stats);

      log.info(`PlatformHubBase[${this.platformName}]: Problem stats updated`, {
        problemId,
        title: problemData.title,
      });
    } catch (error) {
      log.error(`PlatformHubBase[${this.platformName}]: Failed to update problem stats:`, error);
    }
  }

  /**
   * Check if problem was already uploaded
   */
  async isProblemUploaded(filePath) {
    try {
      const sha = await getStatsSHAfromPath(filePath);
      return !!sha;
    } catch (error) {
      log.error(`PlatformHubBase[${this.platformName}]: Error checking upload status:`, error);
      return false;
    }
  }

  /**
   * Mark problem as uploaded
   */
  async markProblemAsUploaded(filePath, sha) {
    try {
      await updateStatsSHAfromPath(filePath, sha);
      log.debug(`PlatformHubBase[${this.platformName}]: Problem marked as uploaded`, {
        filePath,
        sha: sha.substring(0, 8) + "...",
      });
    } catch (error) {
      log.error(`PlatformHubBase[${this.platformName}]: Failed to mark as uploaded:`, error);
    }
  }

  /**
   * Upload problem using centralized upload service
   */
  async uploadProblem(problemData, callback) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Check if platform should be active
      if (!(await this.shouldBeActive())) {
        log.warn(`PlatformHubBase[${this.platformName}]: Platform not active, skipping upload`);
        return;
      }

      // Add platform information to problem data
      const enrichedProblemData = {
        ...problemData,
        platform: this.platformName,
        timestamp: Date.now(),
      };

      // Use centralized upload service
      await UploadService.uploadProblem(enrichedProblemData, callback);

      // Update problem statistics
      if (problemData.problemInfo) {
        await this.updateProblemStats(problemData.problemInfo.problemId || problemData.problemInfo.id, problemData.problemInfo);
      }

      log.info(`PlatformHubBase[${this.platformName}]: Problem uploaded successfully`, {
        directory: problemData.directory,
        fileName: problemData.fileName,
      });
    } catch (error) {
      log.error(`PlatformHubBase[${this.platformName}]: Upload failed:`, error);
      throw error;
    }
  }

  /**
   * Get file directory template
   */
  async getDirectoryTemplate(problemData, language) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const useCustomTemplate = this.storageState?.useCustomTemplate || false;
    const dirTemplate = this.storageState?.dirTemplate;

    if (useCustomTemplate && dirTemplate) {
      return this.processTemplate(dirTemplate, problemData, language);
    }

    // Default template: language/platform/problemId.title
    const { problemId, title } = problemData;
    const safeTitle = this.sanitizeFileName(title || "Problem");

    return `${language}/${this.platformName}/${problemId}. ${safeTitle}`;
  }

  /**
   * Process template string with problem data
   */
  processTemplate(template, problemData, language) {
    let processed = template;

    // Replace template variables
    const variables = {
      language: language,
      platform: this.platformName,
      problemId: problemData.problemId || problemData.id,
      title: this.sanitizeFileName(problemData.title || "Problem"),
      level: problemData.level || "",
      difficulty: problemData.difficulty || "",
      category: problemData.category || "",
    };

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      processed = processed.replace(regex, value);
    });

    return processed;
  }

  /**
   * Sanitize file name for safe file system usage
   */
  sanitizeFileName(name) {
    return name
      .replace(/[<>:"/\\|?*]/g, "") // Remove invalid characters
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
  }

  /**
   * Get last solved time from platform stats
   */
  getLastSolvedTime(platformStats) {
    let lastTime = 0;

    Object.values(platformStats).forEach((problem) => {
      if (problem.solvedAt && problem.solvedAt > lastTime) {
        lastTime = problem.solvedAt;
      }
    });

    return lastTime || null;
  }

  /**
   * Show notification to user
   */
  showNotification(message, type = "info") {
    // Create notification element
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      padding: 12px 16px;
      border-radius: 4px;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;

    // Set background color based on type
    const colors = {
      info: "#007bff",
      success: "#28a745",
      warning: "#ffc107",
      error: "#dc3545",
    };

    notification.style.backgroundColor = colors[type] || colors.info;
    notification.textContent = `[${this.platformName}] ${message}`;

    // Add to page
    document.body.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  /**
   * Generic submission monitoring setup using LoaderService
   * @param {Function|Object} checker - Checker function or SubmissionChecker instance
   * @param {Function} onSuccess - Success callback
   */
  setupSubmissionMonitoring(checker, onSuccess) {
    const loader = LoaderFactory.create(this.platformName, {
      interval: 2000, // Default interval
    });
    loader.start(checker, onSuccess);
    this.loaderService = loader;
  }

  /**
   * Generic upload handler creation and execution
   * @param {Function} parseDataFn - Data parsing function
   * @param {Function} uploadFn - Upload function
   * @param {Function} markFn - Mark uploaded function
   * @param {Function} startUploadFn - Start upload function (optional)
   * @returns {Promise<Object>} Parsed data
   */
  async createAndExecuteUploadHandler(parseDataFn, uploadFn, markFn, startUploadFn) {
    if (startUploadFn) startUploadFn();

    try {
      const data = await parseDataFn();
      if (data) {
        log.debug(`${this.platformName}: Parsed data successfully`, data);
        return data;
      } else {
        log.warn(`${this.platformName}: No data parsed`);
        return null;
      }
    } catch (error) {
      log.error(`${this.platformName}: Error in upload handler:`, error);
      throw error;
    }
  }

  /**
   * Begin upload process
   * @param {Object} data - Problem data to upload
   * @param {Function} uploadFn - Upload function
   * @param {Function} markFn - Mark uploaded function
   */
  async beginUpload(data, uploadFn, markFn) {
    try {
      await uploadFn(data, markFn);
      log.info(`${this.platformName}: Upload completed successfully`);
    } catch (error) {
      log.error(`${this.platformName}: Upload failed:`, error);
      throw error;
    }
  }

  /**
   * Create platform-specific upload function
   * Factory method that generates optimized upload functions for different platforms
   * This eliminates code duplication across platform upload functions
   * @param {string} platformName - Platform display name
   * @param {Function} problemInfoMapper - Function to map problem data to platform-specific format
   * @returns {Function} Upload function
   */
  static createUploadFunction(platformName, problemInfoMapper) {
    return async function uploadOneSolveProblemOnGit(problemData, callback) {
      try {
        const enhancedData = {
          ...problemData,
          platform: platformName,
          problemInfo: problemInfoMapper ? problemInfoMapper(problemData) : problemData.problemInfo,
        };
        return await UploadService.uploadProblem(enhancedData, callback);
      } catch (error) {
        log.error(`Error in ${platformName} upload function:`, error);
        throw error;
      }
    };
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.unsubscribeStorage) {
      this.unsubscribeStorage();
      this.unsubscribeStorage = null;
    }

    this.isInitialized = false;
    this.storageState = null;

    log.info(`PlatformHubBase[${this.platformName}]: Destroyed`);
  }
}
