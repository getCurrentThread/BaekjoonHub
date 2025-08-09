/**
 * Background Script - Migrated to Centralized Storage
 * Handles Chrome extension background operations with centralized state management
 */

import urls from "@scripts/constants/url.js";
import { STORAGE_KEYS } from "@scripts/constants/registry.js";
import { initializeStorageAdapter, saveObjectInLocalStorage } from "@/storage/storageAdapter.js";
import log from "@scripts/commons/logger.js";

// Initialize storage adapter when background script loads
initializeStorageAdapter().catch((error) => {
  log.error("Background: Failed to initialize storage adapter", error);
});

/**
 * solvedac 문제 데이터를 파싱해오는 함수.
 * @param {int} problemId
 */
export async function SolvedApiCall(problemId) {
  return fetch(`${urls.SOLVED_AC_API_PROBLEM_SHOW_URL}${problemId}`, {
    method: "GET",
  }).then((query) => query.json());
}

/**
 * Handle messages from content scripts and other parts of the extension
 * Now uses centralized storage management
 */
export function handleMessage(request, sender, sendResponse) {
  log.info("background.js: handleMessage called with request:", request);

  if (request && request.closeWebPage === true && request.isSuccess === true) {
    /* Handle successful OAuth authentication */
    handleSuccessfulAuth(request).catch((error) => {
      log.error("background.js: Error handling successful auth:", error);
    });
  } else if (request && request.closeWebPage === true && request.isSuccess === false) {
    /* Handle failed authentication */
    log.error("background.js: Something went wrong while trying to authenticate your profile!");
    chrome.tabs.getCurrent((tab) => {
      chrome.tabs.remove(tab.id);
    });
  } else if (request && request.sender === "baekjoon" && request.task === "SolvedApiCall") {
    /* Handle solved.ac API call */
    SolvedApiCall(request.problemId).then((res) => sendResponse(res));
  } else if (request && request.task === "getStorageState") {
    /* Allow content scripts to access storage state */
    handleStorageStateRequest(request, sendResponse);
  } else if (request && request.task === "updateStorage") {
    /* Allow content scripts to update storage */
    handleStorageUpdateRequest(request, sendResponse);
  }

  return true;
}

/**
 * Handle successful OAuth authentication
 * Uses centralized storage management
 */
async function handleSuccessfulAuth(request) {
  try {
    log.info("background.js: Processing successful authentication");

    // Use centralized storage to save auth data
    await saveObjectInLocalStorage({
      [STORAGE_KEYS.USERNAME]: request.username,
      [STORAGE_KEYS.TOKEN]: request.token,
      [STORAGE_KEYS.PIPE]: false, // Close pipe
    });

    log.info("background.js: Auth data saved to centralized storage");

    // Go to onboarding for UX
    const urlOnboarding = `chrome-extension://${chrome.runtime.id}/settings.html`;
    chrome.tabs.create({ url: urlOnboarding, selected: true });
  } catch (error) {
    log.error("background.js: Error in handleSuccessfulAuth:", error);
    throw error;
  }
}

/**
 * Handle storage state requests from content scripts
 * Provides read access to centralized storage
 */
async function handleStorageStateRequest(request, sendResponse) {
  try {
    const { getStorageState } = await import("@/storage/storageAdapter.js");
    const storageState = getStorageState();

    // Filter requested keys if specified
    if (request.keys && Array.isArray(request.keys)) {
      const filteredState = {};
      request.keys.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(storageState, key)) {
          filteredState[key] = storageState[key];
        }
      });
      sendResponse({ success: true, data: filteredState });
    } else {
      sendResponse({ success: true, data: storageState });
    }
  } catch (error) {
    log.error("background.js: Error handling storage state request:", error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle storage update requests from content scripts
 * Provides write access to centralized storage
 */
async function handleStorageUpdateRequest(request, sendResponse) {
  try {
    if (!request.data || typeof request.data !== "object") {
      throw new Error("Invalid update data");
    }

    await saveObjectInLocalStorage(request.data);

    log.info("background.js: Storage updated via message:", request.data);
    sendResponse({ success: true });
  } catch (error) {
    log.error("background.js: Error handling storage update request:", error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle extension installation and updates
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  log.info("background.js: Extension installed/updated", details);

  try {
    // Initialize storage adapter on install
    await initializeStorageAdapter();
    log.info("background.js: Storage adapter initialized on install");
  } catch (error) {
    log.error("background.js: Failed to initialize storage on install:", error);
  }
});

/**
 * Handle extension startup
 */
chrome.runtime.onStartup.addListener(async () => {
  log.info("background.js: Extension startup");

  try {
    // Ensure storage adapter is initialized on startup
    await initializeStorageAdapter();
    log.info("background.js: Storage adapter initialized on startup");
  } catch (error) {
    log.error("background.js: Failed to initialize storage on startup:", error);
  }
});

// Register message listener
chrome.runtime.onMessage.addListener(handleMessage);
