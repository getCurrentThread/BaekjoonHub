/**
 * BaekjoonHub Popup - Migrated to React 19 Centralized Storage
 * Example of how to use the new storage system
 */

import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { StorageProvider } from '@/storage/StorageContext.jsx';
import { useAuthentication, useRepository, useSettings } from '@/storage/hooks.js';
import { PopupApp } from '@components/PopupApp.jsx';
import beginOAuth2 from "@scripts/commons/oauth2.js";
import log from "@scripts/commons/logger.js";

/**
 * Popup component using centralized storage hooks
 */
const PopupMain = () => {
  // Use centralized storage hooks instead of local state
  const { isAuthenticated, username, token, authenticate, logout, isPending: isAuthPending } = useAuthentication();
  const { hook, modeType, setRepository, isPending: isRepoPending } = useRepository();
  const { isEnabled, toggleEnable, isPending: isSettingsPending } = useSettings();
  
  // Derive auth mode from state
  const getAuthMode = () => {
    if (!isAuthenticated) return 'auth';
    if (modeType === 'commit' && hook) return 'commit';
    return 'hook';
  };
  
  /**
   * Handle authentication button click
   */
  const handleAuthenticate = () => {
    log.info('Starting OAuth2 flow');
    beginOAuth2();
  };
  
  /**
   * Handle enable toggle change
   * Now uses centralized storage action
   */
  const handleToggleChange = async (event) => {
    const isChecked = event.target.checked;
    log.info(`Toggle changed to ${isChecked}`);
    await toggleEnable(isChecked);
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
  
  const urls = getUrls();
  const authMode = getAuthMode();
  const isLoading = isAuthPending || isRepoPending || isSettingsPending;
  
  return (
    <PopupApp
      onAuthenticate={handleAuthenticate}
      authMode={authMode}
      repoName={hook || ''}
      isEnabled={isEnabled}
      onToggleChange={handleToggleChange}
      settingsUrl={urls.settingsUrl}
      hookUrl={urls.hookUrl}
      isLoading={isLoading}
    />
  );
};

/**
 * Root component with StorageProvider
 */
const App = () => {
  return (
    <StorageProvider>
      <PopupMain />
    </StorageProvider>
  );
};

// Initialize React app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  log.info("Initializing React popup with centralized storage");
  
  const container = document.body;
  const root = createRoot(container);
  
  root.render(<App />);
});