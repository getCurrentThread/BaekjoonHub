/**
 * Enable/Disable Service - Migrated to Centralized Storage
 * Handles extension enable/disable functionality with centralized state management
 */

import { getObjectFromLocalStorage, saveObjectInLocalStorage, addStorageListener, initializeStorageAdapter } from "@/storage/storageAdapter.js";
import { STORAGE_KEYS } from "@scripts/constants/registry.js";
import log from "@scripts/commons/logger.js";

/**
 * Enable Service Class
 * Manages extension enable/disable state with centralized storage
 */
export class EnableService {
  constructor() {
    this.isInitialized = false;
    this.listeners = new Set();
    this.currentState = true; // Default enabled state
  }

  /**
   * Initialize the enable service
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize storage adapter
      await initializeStorageAdapter();

      // Get current enable state
      const enableState = await getObjectFromLocalStorage(STORAGE_KEYS.ENABLE);
      this.currentState = enableState !== false; // Default to true if undefined

      // Set up storage listener for enable state changes
      this.unsubscribeStorage = addStorageListener((state, changes) => {
        if (changes[STORAGE_KEYS.ENABLE] !== undefined) {
          const newState = changes[STORAGE_KEYS.ENABLE].newValue !== false;
          this.handleEnableStateChange(newState);
        }
      });

      this.isInitialized = true;
      log.info("EnableService: Initialized successfully", { currentState: this.currentState });
    } catch (error) {
      log.error("EnableService: Initialization failed:", error);
      throw error;
    }
  }

  /**
   * Check if extension is enabled
   * @returns {Promise<boolean>}
   */
  async isEnabled() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.currentState;
  }

  /**
   * Enable the extension
   * @returns {Promise<boolean>}
   */
  async enable() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      await saveObjectInLocalStorage({
        [STORAGE_KEYS.ENABLE]: true,
      });

      log.info("EnableService: Extension enabled");
      return true;
    } catch (error) {
      log.error("EnableService: Failed to enable extension:", error);
      throw error;
    }
  }

  /**
   * Disable the extension
   * @returns {Promise<boolean>}
   */
  async disable() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      await saveObjectInLocalStorage({
        [STORAGE_KEYS.ENABLE]: false,
      });

      log.info("EnableService: Extension disabled");
      return false;
    } catch (error) {
      log.error("EnableService: Failed to disable extension:", error);
      throw error;
    }
  }

  /**
   * Toggle extension enable state
   * @returns {Promise<boolean>}
   */
  async toggle() {
    const currentlyEnabled = await this.isEnabled();
    return currentlyEnabled ? await this.disable() : await this.enable();
  }

  /**
   * Handle enable state changes
   * @param {boolean} newState
   */
  handleEnableStateChange(newState) {
    const oldState = this.currentState;
    this.currentState = newState;

    // Notify listeners
    this.listeners.forEach((listener) => {
      try {
        listener(newState, oldState);
      } catch (error) {
        log.error("EnableService: Listener error:", error);
      }
    });

    // Update content scripts and UI
    this.notifyContentScripts(newState);

    log.info("EnableService: State changed", { from: oldState, to: newState });
  }

  /**
   * Notify content scripts about enable state change
   * @param {boolean} enabled
   */
  notifyContentScripts(enabled) {
    // Send message to all tabs to update enable state
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs
          .sendMessage(tab.id, {
            type: "EXTENSION_ENABLE_STATE_CHANGED",
            enabled: enabled,
          })
          .catch(() => {
            // Ignore errors for tabs that don't have content scripts
          });
      });
    });
  }

  /**
   * Add listener for enable state changes
   * @param {Function} listener
   * @returns {Function} Unsubscribe function
   */
  addListener(listener) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Remove listener for enable state changes
   * @param {Function} listener
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.unsubscribeStorage) {
      this.unsubscribeStorage();
    }
    this.listeners.clear();
    this.isInitialized = false;
  }
}

// Create singleton instance
const enableService = new EnableService();

// Legacy compatibility functions
/**
 * Check if extension is enabled (legacy compatibility)
 * @returns {Promise<boolean>}
 */
export async function isExtensionEnabled() {
  return await enableService.isEnabled();
}

/**
 * Enable extension (legacy compatibility)
 * @returns {Promise<void>}
 */
export async function enableExtension() {
  await enableService.enable();
}

/**
 * Disable extension (legacy compatibility)
 * @returns {Promise<void>}
 */
export async function disableExtension() {
  await enableService.disable();
}

/**
 * Toggle extension (legacy compatibility)
 * @returns {Promise<boolean>}
 */
export async function toggleExtension() {
  return await enableService.toggle();
}

/**
 * Add enable state change listener (legacy compatibility)
 * @param {Function} listener
 * @returns {Function} Unsubscribe function
 */
export function addEnableListener(listener) {
  return enableService.addListener(listener);
}

// Export singleton instance and service class
export { enableService };
export default enableService;
