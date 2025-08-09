/**
 * Content Script Bridge - Centralized Storage Integration
 * Provides easy access to centralized storage from content scripts
 */

import log from "@/commons/logger.js";

/**
 * Content Script Storage Bridge
 * Provides storage access for content scripts through background script communication
 */
export class ContentScriptStorageBridge {
  constructor() {
    this.messageId = 0;
    this.pendingMessages = new Map();
    this.listeners = new Set();
    this.isInitialized = false;
  }

  /**
   * Initialize the bridge
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Set up message listener for responses from background
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        this.handleMessage(message, sender, sendResponse);
      });

      // Test connection to background script
      await this.testConnection();

      this.isInitialized = true;
      log.info("ContentScriptStorageBridge: Initialized successfully");
    } catch (error) {
      log.error("ContentScriptStorageBridge: Initialization failed:", error);
      throw error;
    }
  }

  /**
   * Test connection to background script
   */
  async testConnection() {
    try {
      const response = await this.sendMessage({
        task: "getStorageState",
        keys: ["token"], // Just test with one key
      });

      if (!response.success) {
        throw new Error(`Background connection failed: ${response.error}`);
      }

      log.debug("ContentScriptStorageBridge: Background connection verified");
    } catch (error) {
      log.error("ContentScriptStorageBridge: Background connection test failed:", error);
      throw error;
    }
  }

  /**
   * Handle messages from background script
   */
  handleMessage(message) {
    // Handle storage change notifications
    if (message.type === "EXTENSION_ENABLE_STATE_CHANGED") {
      this.notifyListeners("enableStateChanged", { enabled: message.enabled });
      return;
    }

    // Handle response messages
    if (message.messageId && this.pendingMessages.has(message.messageId)) {
      const { resolve, reject } = this.pendingMessages.get(message.messageId);
      this.pendingMessages.delete(message.messageId);

      if (message.success) {
        resolve(message);
      } else {
        reject(new Error(message.error || "Unknown error"));
      }
    }
  }

  /**
   * Send message to background script
   */
  async sendMessage(messageData, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const messageId = ++this.messageId;
      const message = { ...messageData, messageId };

      // Store pending message
      this.pendingMessages.set(messageId, { resolve, reject });

      // Set timeout
      const timeoutId = setTimeout(() => {
        if (this.pendingMessages.has(messageId)) {
          this.pendingMessages.delete(messageId);
          reject(new Error("Message timeout"));
        }
      }, timeout);

      // Send message
      chrome.runtime.sendMessage(message, (response) => {
        clearTimeout(timeoutId);

        if (chrome.runtime.lastError) {
          this.pendingMessages.delete(messageId);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        // Handle immediate response (fallback)
        if (response && this.pendingMessages.has(messageId)) {
          const { resolve, reject } = this.pendingMessages.get(messageId);
          this.pendingMessages.delete(messageId);

          if (response.success) {
            resolve(response);
          } else {
            reject(new Error(response.error || "Unknown error"));
          }
        }
      });
    });
  }

  /**
   * Get storage state
   */
  async getStorageState(keys = null) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = await this.sendMessage({
        task: "getStorageState",
        keys,
      });

      return response.data;
    } catch (error) {
      log.error("ContentScriptStorageBridge: Error getting storage state:", error);
      throw error;
    }
  }

  /**
   * Update storage
   */
  async updateStorage(data) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = await this.sendMessage({
        task: "updateStorage",
        data,
      });

      return response.success;
    } catch (error) {
      log.error("ContentScriptStorageBridge: Error updating storage:", error);
      throw error;
    }
  }

  /**
   * Get specific storage value
   */
  async getStorageValue(key) {
    const state = await this.getStorageState([key]);
    return state[key];
  }

  /**
   * Set specific storage value
   */
  async setStorageValue(key, value) {
    return await this.updateStorage({ [key]: value });
  }

  /**
   * Check if extension is enabled
   */
  async isEnabled() {
    const enabled = await this.getStorageValue("enable");
    return enabled !== false; // Default to true if undefined
  }

  /**
   * Check if authenticated
   */
  async isAuthenticated() {
    const state = await this.getStorageState(["token", "hook"]);
    return !!(state.token && state.hook);
  }

  /**
   * Get authentication data
   */
  async getAuthData() {
    return await this.getStorageState(["token", "username", "hook", "modeType"]);
  }

  /**
   * Add storage change listener
   */
  addListener(listener) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Remove storage change listener
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Notify listeners of changes
   */
  notifyListeners(type, data) {
    this.listeners.forEach((listener) => {
      try {
        listener(type, data);
      } catch (error) {
        log.error("ContentScriptStorageBridge: Listener error:", error);
      }
    });
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.listeners.clear();
    this.pendingMessages.clear();
    this.isInitialized = false;
    log.info("ContentScriptStorageBridge: Destroyed");
  }
}

// Create singleton instance
const contentScriptBridge = new ContentScriptStorageBridge();

// Legacy compatibility functions for easy migration
export async function getToken() {
  return await contentScriptBridge.getStorageValue("token");
}

export async function getHook() {
  return await contentScriptBridge.getStorageValue("hook");
}

export async function getUsername() {
  return await contentScriptBridge.getStorageValue("username");
}

export async function getModeType() {
  return await contentScriptBridge.getStorageValue("modeType");
}

export async function isExtensionEnabled() {
  return await contentScriptBridge.isEnabled();
}

export async function isAuthenticated() {
  return await contentScriptBridge.isAuthenticated();
}

export async function getAuthData() {
  return await contentScriptBridge.getAuthData();
}

export async function updateStorageFromContentScript(data) {
  return await contentScriptBridge.updateStorage(data);
}

export function addStorageChangeListener(listener) {
  return contentScriptBridge.addListener(listener);
}

// Export singleton instance
export { contentScriptBridge };
export default contentScriptBridge;
