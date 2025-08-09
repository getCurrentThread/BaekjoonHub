/**
 * BaekjoonHub Popup - React version
 * Chrome extension popup with React components and hooks
 */

import React, { useState, useEffect, useActionState, useOptimistic, startTransition } from 'react';
import { createRoot } from 'react-dom/client';
import beginOAuth2 from "@/commons/oauth2.js";
import log from "@/commons/logger.js";
import { STORAGE_KEYS } from "@/constants/registry.js";
import { getObjectFromLocalStorage, saveObjectInLocalStorage } from "@/commons/storage.js";
import { PopupApp } from "@components/PopupApp.jsx";

/**
 * Main Popup Component with React Hooks
 */
const PopupMain = () => {
  const [authMode, setAuthMode] = useState('auth');
  const [repoName, setRepoName] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [isAuthActionAllowed, setIsAuthActionAllowed] = useState(false);

  /**
   * Handle authentication flow and determine UI state
   */
  const handleAuthentication = async () => {
    log.info("handleAuthentication: Starting GitHub authentication flow.");
    const token = await getObjectFromLocalStorage(STORAGE_KEYS.TOKEN);
    log.info(`handleAuthentication: Token status - ${token ? "exists" : "null"}`);

    if (token === null || token === undefined) {
      log.info("handleAuthentication: Token is null or undefined, showing authorization mode.");
      setAuthMode('auth');
      setIsAuthActionAllowed(true);
      return;
    }

    log.info("handleAuthentication: Token exists, attempting to verify with GitHub API.");
    const AUTHENTICATION_URL = "https://api.github.com/user";
    
    try {
      const response = await fetch(AUTHENTICATION_URL, {
        method: "GET",
        headers: {
          Authorization: `token ${token}`,
        },
      });

      log.info(`handleAuthentication: GitHub API response status: ${response.status}`);
      
      if (response.ok) {
        log.info("handleAuthentication: Token verified successfully.");
        const data = await getObjectFromLocalStorage([STORAGE_KEYS.MODE_TYPE, STORAGE_KEYS.HOOK, STORAGE_KEYS.ENABLE]);
        const modeType = data[STORAGE_KEYS.MODE_TYPE];
        const baekjoonHubHook = data[STORAGE_KEYS.HOOK];
        const enableStatus = data[STORAGE_KEYS.ENABLE];
        
        log.info(`handleAuthentication: Retrieved modeType=${modeType}, baekjoonHubHook=${baekjoonHubHook}`);

        if (modeType === "commit") {
          log.info("handleAuthentication: Mode is 'commit', showing commit mode UI.");
          
          // Set enable status with default fallback
          const enabledStatus = enableStatus !== undefined ? enableStatus : true;
          if (enableStatus === undefined) {
            await saveObjectInLocalStorage({ [STORAGE_KEYS.ENABLE]: true });
          }
          
          setAuthMode('commit');
          setRepoName(baekjoonHubHook || '');
          setIsEnabled(enabledStatus);
        } else {
          log.info("handleAuthentication: Mode is not 'commit', showing hook mode UI.");
          setAuthMode('hook');
        }
      } else if (response.status === 401) {
        log.info("handleAuthentication: Bad OAuth token (401), resetting and re-authenticating.");
        // Bad OAuth token, reset and re-authenticate
        await saveObjectInLocalStorage({ [STORAGE_KEYS.TOKEN]: null });
        log.info("BAD oAuth!!! Redirecting back to oAuth process");
        
        setAuthMode('auth');
        setIsAuthActionAllowed(true);
      } else {
        log.error("handleAuthentication: Authentication failed with status:", response.status);
      }
    } catch (error) {
      log.error("handleAuthentication: Error during authentication:", error);
    }
  };

  /**
   * Handle authentication button click
   */
  const handleAuthenticate = () => {
    log.info(`handleAuthenticate: Authenticate button clicked. isAuthActionAllowed: ${isAuthActionAllowed}`);
    if (isAuthActionAllowed) {
      beginOAuth2();
    }
  };

  /**
   * Handle enable toggle change
   */
  const handleToggleChange = async (event) => {
    const isChecked = event.target.checked;
    log.info(`handleToggleChange: Enable popup switch changed to ${isChecked}`);
    
    await saveObjectInLocalStorage({ [STORAGE_KEYS.ENABLE]: isChecked });
    setIsEnabled(isChecked);
  };

  /**
   * Get settings and hook URLs
   */
  const getUrls = () => {
    const extensionId = chrome.runtime.id;
    return {
      settingsUrl: `chrome-extension://${extensionId}/settings.html`,
      hookUrl: `chrome-extension://${extensionId}/settings.html`
    };
  };

  // Effect for initial authentication check
  useEffect(() => {
    handleAuthentication();
  }, []);

  // Effect for Chrome storage changes
  useEffect(() => {
    const handleStorageChange = (changes, namespace) => {
      log.info("chrome.storage.onChanged: Storage change detected.", changes);
      if (namespace === "local" && (changes[STORAGE_KEYS.TOKEN] || changes[STORAGE_KEYS.MODE_TYPE])) {
        log.info("chrome.storage.onChanged: Relevant storage key changed, re-running authentication handler.");
        handleAuthentication();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    // Cleanup listener
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const urls = getUrls();

  return (
    <PopupApp
      onAuthenticate={handleAuthenticate}
      authMode={authMode}
      repoName={repoName}
      isEnabled={isEnabled}
      onToggleChange={handleToggleChange}
      settingsUrl={urls.settingsUrl}
      hookUrl={urls.hookUrl}
    />
  );
};

// Initialize React app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  log.info("DOMContentLoaded: Initializing React popup page.");
  
  const container = document.body;
  const root = createRoot(container);
  
  root.render(<PopupMain />);
});