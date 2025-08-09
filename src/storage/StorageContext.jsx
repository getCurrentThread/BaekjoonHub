/**
 * StorageContext - React 19 centralized state management
 * Provides global storage state and dispatch to all components
 */

import React, { createContext, useReducer, useEffect, use } from 'react';
import { storageReducer, initialState } from './storageReducer.js';
import { syncWithChromeStorage } from './chromeBridge.js';
import log from '@scripts/commons/logger.js';

// Create contexts for state and dispatch
export const StorageContext = createContext(null);
export const StorageDispatchContext = createContext(null);

/**
 * StorageProvider component
 * Wraps the application with storage context
 */
export function StorageProvider({ children }) {
  const [state, dispatch] = useReducer(storageReducer, initialState);

  // Sync with Chrome storage on mount
  useEffect(() => {
    log.info('StorageProvider: Initializing Chrome storage sync');
    syncWithChromeStorage(dispatch);
  }, []);

  // Listen for Chrome storage changes
  useEffect(() => {
    const handleStorageChange = (changes, namespace) => {
      if (namespace === 'local') {
        log.debug('StorageProvider: Chrome storage changed', changes);
        dispatch({
          type: 'CHROME_STORAGE_CHANGED',
          payload: changes
        });
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  return (
    <StorageContext.Provider value={state}>
      <StorageDispatchContext.Provider value={dispatch}>
        {children}
      </StorageDispatchContext.Provider>
    </StorageContext.Provider>
  );
}

/**
 * Custom hook to use storage state
 * Can be called conditionally with React 19's use() hook
 */
export function useStorage() {
  const context = use(StorageContext);
  if (!context) {
    throw new Error('useStorage must be used within StorageProvider');
  }
  return context;
}

/**
 * Custom hook to use storage dispatch
 */
export function useStorageDispatch() {
  const context = use(StorageDispatchContext);
  if (!context) {
    throw new Error('useStorageDispatch must be used within StorageProvider');
  }
  return context;
}

/**
 * Hook for conditional storage access
 * Leverages React 19's use() for conditional context reading
 */
export function useStorageConditional(condition) {
  if (condition) {
    return use(StorageContext);
  }
  return null;
}