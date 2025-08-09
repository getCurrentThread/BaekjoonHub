/**
 * Storage Reducer - Central state management logic
 * Handles all storage-related state mutations
 */

import { STORAGE_KEYS } from "@scripts/constants/registry.js";
import log from "@scripts/commons/logger.js";

// Initial state structure
export const initialState = {
  // Authentication
  token: null,
  username: null,

  // Repository
  hook: null,
  modeType: null,

  // Settings
  enable: true,
  useCustomTemplate: false,
  dirTemplate: "{{language}}/{{removeAfterSpace(level)}}/{{problemId}}. {{safe(title)}}",

  // Statistics
  stats: {
    version: "0.0.0",
    branches: {},
    submission: {},
    problems: {},
  },

  // UI State
  isLoading: false,
  error: null,
  lastSync: null,
};

/**
 * Storage reducer function
 * Handles all state mutations with immutability
 */
export function storageReducer(state, action) {
  log.debug("storageReducer:", action.type, action.payload);

  switch (action.type) {
    // Authentication actions
    case "SET_TOKEN":
      return {
        ...state,
        token: action.payload,
        error: null,
      };

    case "SET_USERNAME":
      return {
        ...state,
        username: action.payload,
      };

    case "LOGOUT":
      return {
        ...state,
        token: null,
        username: null,
        hook: null,
        modeType: null,
      };

    // Repository actions
    case "SET_REPOSITORY":
      return {
        ...state,
        hook: action.payload.hook,
        modeType: action.payload.modeType || "commit",
      };

    case "UPDATE_REPOSITORY":
      return {
        ...state,
        hook: action.payload,
      };

    // Settings actions
    case "SET_ENABLE":
      return {
        ...state,
        enable: action.payload,
      };

    case "SET_CUSTOM_TEMPLATE":
      return {
        ...state,
        useCustomTemplate: action.payload.enabled,
        dirTemplate: action.payload.template || state.dirTemplate,
      };

    // Statistics actions
    case "UPDATE_STATS":
      return {
        ...state,
        stats: {
          ...state.stats,
          ...action.payload,
        },
      };

    case "UPDATE_SUBMISSION":
      return {
        ...state,
        stats: {
          ...state.stats,
          submission: {
            ...state.stats.submission,
            ...action.payload,
          },
        },
      };

    case "UPDATE_BRANCHES":
      return {
        ...state,
        stats: {
          ...state.stats,
          branches: {
            ...state.stats.branches,
            ...action.payload,
          },
        },
      };

    // Batch update from Chrome storage
    case "SYNC_FROM_CHROME":
      return {
        ...state,
        ...mapChromeStorageToState(action.payload),
        lastSync: Date.now(),
      };

    // Chrome storage change listener
    case "CHROME_STORAGE_CHANGED":
      return handleChromeStorageChanges(state, action.payload);

    // Loading states
    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };

    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
      };

    // Reset state
    case "RESET":
      return initialState;

    default:
      log.warn("Unknown action type:", action.type);
      return state;
  }
}

/**
 * Map Chrome storage keys to state structure
 */
function mapChromeStorageToState(chromeData) {
  const mappedState = {};

  if (chromeData[STORAGE_KEYS.TOKEN] !== undefined) {
    mappedState.token = chromeData[STORAGE_KEYS.TOKEN];
  }

  if (chromeData[STORAGE_KEYS.USERNAME] !== undefined) {
    mappedState.username = chromeData[STORAGE_KEYS.USERNAME];
  }

  if (chromeData[STORAGE_KEYS.HOOK] !== undefined) {
    mappedState.hook = chromeData[STORAGE_KEYS.HOOK];
  }

  if (chromeData[STORAGE_KEYS.MODE_TYPE] !== undefined) {
    mappedState.modeType = chromeData[STORAGE_KEYS.MODE_TYPE];
  }

  if (chromeData[STORAGE_KEYS.ENABLE] !== undefined) {
    mappedState.enable = chromeData[STORAGE_KEYS.ENABLE];
  }

  if (chromeData[STORAGE_KEYS.USE_CUSTOM_TEMPLATE] !== undefined) {
    mappedState.useCustomTemplate = chromeData[STORAGE_KEYS.USE_CUSTOM_TEMPLATE];
  }

  if (chromeData[STORAGE_KEYS.DIR_TEMPLATE] !== undefined) {
    mappedState.dirTemplate = chromeData[STORAGE_KEYS.DIR_TEMPLATE];
  }

  if (chromeData[STORAGE_KEYS.STATS] !== undefined) {
    mappedState.stats = chromeData[STORAGE_KEYS.STATS];
  }

  return mappedState;
}

/**
 * Handle Chrome storage changes
 */
function handleChromeStorageChanges(state, changes) {
  let newState = { ...state };

  Object.keys(changes).forEach((key) => {
    const { newValue } = changes[key];

    switch (key) {
      case STORAGE_KEYS.TOKEN:
        newState.token = newValue;
        break;
      case STORAGE_KEYS.USERNAME:
        newState.username = newValue;
        break;
      case STORAGE_KEYS.HOOK:
        newState.hook = newValue;
        break;
      case STORAGE_KEYS.MODE_TYPE:
        newState.modeType = newValue;
        break;
      case STORAGE_KEYS.ENABLE:
        newState.enable = newValue;
        break;
      case STORAGE_KEYS.USE_CUSTOM_TEMPLATE:
        newState.useCustomTemplate = newValue;
        break;
      case STORAGE_KEYS.DIR_TEMPLATE:
        newState.dirTemplate = newValue;
        break;
      case STORAGE_KEYS.STATS:
        newState.stats = newValue;
        break;
    }
  });

  return newState;
}
