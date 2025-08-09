/**
 * OAuth2 Handler - Migrated to Centralized Storage
 * Handles GitHub OAuth2 authentication flow with centralized state management
 */

import { saveObjectInLocalStorage } from "@/storage/storageAdapter.js";
import urls from "@scripts/constants/url.js";
import { STORAGE_KEYS } from "@scripts/constants/registry.js";
import log from "./logger.js";

const AUTHORIZATION_URL = urls.GITHUB_AUTHORIZATION_URL;
const CLIENT_ID = urls.GITHUB_CLIENT_ID;
const REDIRECT_URL = urls.GITHUB_REDIRECT_URL;
const SCOPES = ["repo"];

/**
 * Begin OAuth2 authentication flow
 * Uses centralized storage management
 */
export default async function beginOAuth2() {
  try {
    log.info("OAuth2: beginOAuth2 function called");

    // Build authorization URL
    let url = `${AUTHORIZATION_URL}?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URL}&scope=`;

    for (let i = 0; i < SCOPES.length; i += 1) {
      url += SCOPES[i];
    }

    // Use centralized storage to open pipe
    await saveObjectInLocalStorage({
      [STORAGE_KEYS.PIPE]: true,
    });

    log.info("OAuth2: Pipe opened via centralized storage");
    log.info("OAuth2: Attempting to create new tab with URL:", url);

    // Create OAuth tab
    chrome.tabs.create({ url, selected: true }, (tab) => {
      log.info("OAuth2: OAuth tab created successfully", tab?.id);

      // Close current tab (popup)
      chrome.tabs.getCurrent((currentTab) => {
        if (currentTab && currentTab.id) {
          log.info("OAuth2: Closing current tab", currentTab.id);
          // chrome.tabs.remove(currentTab.id); // Uncomment if needed
        }
      });
    });
  } catch (error) {
    log.error("OAuth2: Error in beginOAuth2:", error);

    // Close pipe on error
    try {
      await saveObjectInLocalStorage({
        [STORAGE_KEYS.PIPE]: false,
      });
    } catch (closeError) {
      log.error("OAuth2: Failed to close pipe on error:", closeError);
    }

    throw error;
  }
}

/**
 * Complete OAuth2 authentication flow
 * Called from redirect page or content script
 */
export async function completeOAuth2(authCode) {
  try {
    log.info("OAuth2: Completing OAuth2 flow with auth code");

    // Exchange authorization code for access token
    const tokenResponse = await fetch(urls.GITHUB_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: urls.GITHUB_CLIENT_SECRET,
        code: authCode,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(`GitHub OAuth error: ${tokenData.error_description}`);
    }

    if (!tokenData.access_token) {
      throw new Error("No access token received from GitHub");
    }

    // Get user information
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${tokenData.access_token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!userResponse.ok) {
      throw new Error("Failed to fetch user information from GitHub");
    }

    const userData = await userResponse.json();

    // Save authentication data using centralized storage
    await saveObjectInLocalStorage({
      [STORAGE_KEYS.TOKEN]: tokenData.access_token,
      [STORAGE_KEYS.USERNAME]: userData.login,
      [STORAGE_KEYS.PIPE]: false, // Close pipe
    });

    log.info("OAuth2: Authentication completed successfully", {
      username: userData.login,
    });

    // Send success message to background script
    chrome.runtime.sendMessage({
      closeWebPage: true,
      isSuccess: true,
      token: tokenData.access_token,
      username: userData.login,
    });

    return {
      success: true,
      token: tokenData.access_token,
      username: userData.login,
    };
  } catch (error) {
    log.error("OAuth2: Error completing authentication:", error);

    // Close pipe on error
    try {
      await saveObjectInLocalStorage({
        [STORAGE_KEYS.PIPE]: false,
      });
    } catch (closeError) {
      log.error("OAuth2: Failed to close pipe on error:", closeError);
    }

    // Send failure message to background script
    chrome.runtime.sendMessage({
      closeWebPage: true,
      isSuccess: false,
      error: error.message,
    });

    throw error;
  }
}

/**
 * Check if OAuth2 flow is in progress
 */
export async function isOAuth2InProgress() {
  try {
    const { getObjectFromLocalStorage } = await import("@/storage/storageAdapter.js");
    const pipeStatus = await getObjectFromLocalStorage(STORAGE_KEYS.PIPE);
    return pipeStatus === true;
  } catch (error) {
    log.error("OAuth2: Error checking pipe status:", error);
    return false;
  }
}

/**
 * Cancel OAuth2 flow
 */
export async function cancelOAuth2() {
  try {
    log.info("OAuth2: Cancelling OAuth2 flow");

    await saveObjectInLocalStorage({
      [STORAGE_KEYS.PIPE]: false,
    });

    log.info("OAuth2: OAuth2 flow cancelled");
  } catch (error) {
    log.error("OAuth2: Error cancelling OAuth2:", error);
    throw error;
  }
}
