/**
 * Storage Actions - React 19 Server Actions pattern
 * Async actions for storage operations with built-in loading states
 */

import { STORAGE_KEYS } from "@scripts/constants/registry.js";
import { GitHub } from "@scripts/commons/github.js";
import StorageBatcher from "@scripts/commons/storage-batcher.js";
import log from "@scripts/commons/logger.js";

/**
 * Authenticate with GitHub
 * Uses React 19 action pattern for async operations
 */
export async function authenticateAction(token) {
  "use server";

  try {
    const response = await fetch("https://api.github.com/user", {
      headers: { Authorization: `token ${token}` },
    });

    if (!response.ok) {
      return { error: "Authentication failed" };
    }

    const userData = await response.json();

    // Save to Chrome storage
    await chrome.storage.local.set({
      [STORAGE_KEYS.TOKEN]: token,
      [STORAGE_KEYS.USERNAME]: userData.login,
    });

    return {
      success: true,
      username: userData.login,
    };
  } catch (error) {
    log.error("authenticateAction error:", error);
    return { error: error.message };
  }
}

/**
 * Set repository configuration
 */
export async function setRepositoryAction(hook, modeType = "commit") {
  "use server";

  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.HOOK]: hook,
      [STORAGE_KEYS.MODE_TYPE]: modeType,
    });

    return { success: true };
  } catch (error) {
    log.error("setRepositoryAction error:", error);
    return { error: error.message };
  }
}

/**
 * Update statistics from GitHub
 */
export async function updateStatsAction(hook, token) {
  "use server";

  try {
    const git = new GitHub(hook, token);
    const tree = await git.getTree();
    const defaultBranch = await git.getDefaultBranchOnRepo();

    const stats = {
      submission: {},
      branches: { [hook]: defaultBranch },
    };

    // Process tree items
    tree.forEach((item) => {
      if (item.type === "blob") {
        updateObjectDataFromPath(stats.submission, `${hook}/${item.path}`, item.sha);
      }
    });

    await chrome.storage.local.set({
      [STORAGE_KEYS.STATS]: stats,
    });

    return { success: true, stats };
  } catch (error) {
    log.error("updateStatsAction error:", error);
    return { error: error.message };
  }
}

/**
 * Toggle extension enable state
 */
export async function toggleEnableAction(enabled) {
  "use server";

  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.ENABLE]: enabled,
    });

    return { success: true };
  } catch (error) {
    log.error("toggleEnableAction error:", error);
    return { error: error.message };
  }
}

/**
 * Update custom template settings
 */
export async function updateTemplateAction(enabled, template) {
  "use server";

  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.USE_CUSTOM_TEMPLATE]: enabled,
      [STORAGE_KEYS.DIR_TEMPLATE]: template,
    });

    return { success: true };
  } catch (error) {
    log.error("updateTemplateAction error:", error);
    return { error: error.message };
  }
}

/**
 * Batch update SHA values
 * Utilizes StorageBatcher for optimized operations
 */
export async function batchUpdateSHAAction(updates) {
  "use server";

  try {
    // Schedule updates through batcher
    updates.forEach(({ path, sha }) => {
      StorageBatcher.scheduleSHAUpdate(path, sha);
    });

    // Force flush for immediate update
    await StorageBatcher.forceFlush();

    return { success: true };
  } catch (error) {
    log.error("batchUpdateSHAAction error:", error);
    return { error: error.message };
  }
}

/**
 * Clear all storage data
 */
export async function clearStorageAction() {
  "use server";

  try {
    await chrome.storage.local.clear();
    return { success: true };
  } catch (error) {
    log.error("clearStorageAction error:", error);
    return { error: error.message };
  }
}

/**
 * Get repositories for current user
 */
export async function fetchRepositoriesAction(token) {
  "use server";

  try {
    const response = await fetch("https://api.github.com/user/repos?per_page=100", {
      headers: { Authorization: `token ${token}` },
    });

    if (!response.ok) {
      return { error: "Failed to fetch repositories" };
    }

    const repositories = await response.json();
    return { success: true, repositories };
  } catch (error) {
    log.error("fetchRepositoriesAction error:", error);
    return { error: error.message };
  }
}

/**
 * Helper function to update nested objects from path
 */
function updateObjectDataFromPath(obj, path, data) {
  let current = obj;
  const pathArray = path.split("/").filter((p) => p !== "");

  for (const p of pathArray.slice(0, -1)) {
    if (!current[p]) {
      current[p] = {};
    }
    current = current[p];
  }

  const lastKey = pathArray.pop();
  if (lastKey) {
    current[lastKey] = data;
  }
}
