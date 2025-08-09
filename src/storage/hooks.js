/**
 * Storage Hooks - React 19 hooks for storage operations
 * Provides easy-to-use hooks for components to interact with storage
 */

import { useActionState, useTransition, useOptimistic } from "react";
import { useStorage, useStorageDispatch } from "./StorageContext.jsx";
import * as actions from "./storageActions.js";
import log from "@scripts/commons/logger.js";

/**
 * Hook for authentication operations
 */
export function useAuthentication() {
  const state = useStorage();
  const dispatch = useStorageDispatch();
  const [isPending, startTransition] = useTransition();

  const authenticate = async (token) => {
    startTransition(async () => {
      dispatch({ type: "SET_LOADING", payload: true });

      const result = await actions.authenticateAction(token);

      if (result.success) {
        dispatch({ type: "SET_TOKEN", payload: token });
        dispatch({ type: "SET_USERNAME", payload: result.username });
      } else {
        dispatch({ type: "SET_ERROR", payload: result.error });
      }

      dispatch({ type: "SET_LOADING", payload: false });
    });
  };

  const logout = () => {
    dispatch({ type: "LOGOUT" });
  };

  return {
    isAuthenticated: !!state.token,
    username: state.username,
    token: state.token,
    isPending,
    authenticate,
    logout,
  };
}

/**
 * Hook for repository operations
 */
export function useRepository() {
  const state = useStorage();
  const dispatch = useStorageDispatch();
  const [isPending, startTransition] = useTransition();

  const setRepository = async (hook, modeType) => {
    startTransition(async () => {
      const result = await actions.setRepositoryAction(hook, modeType);

      if (result.success) {
        dispatch({
          type: "SET_REPOSITORY",
          payload: { hook, modeType },
        });
      } else {
        dispatch({ type: "SET_ERROR", payload: result.error });
      }
    });
  };

  const updateStats = async () => {
    if (!state.hook || !state.token) {
      log.warn("Cannot update stats without hook and token");
      return;
    }

    startTransition(async () => {
      const result = await actions.updateStatsAction(state.hook, state.token);

      if (result.success) {
        dispatch({ type: "UPDATE_STATS", payload: result.stats });
      } else {
        dispatch({ type: "SET_ERROR", payload: result.error });
      }
    });
  };

  return {
    hook: state.hook,
    modeType: state.modeType,
    stats: state.stats,
    isPending,
    setRepository,
    updateStats,
  };
}

/**
 * Hook for settings operations
 */
export function useSettings() {
  const state = useStorage();
  const dispatch = useStorageDispatch();
  const [isPending, startTransition] = useTransition();

  const toggleEnable = async (enabled) => {
    startTransition(async () => {
      const result = await actions.toggleEnableAction(enabled);

      if (result.success) {
        dispatch({ type: "SET_ENABLE", payload: enabled });
      } else {
        dispatch({ type: "SET_ERROR", payload: result.error });
      }
    });
  };

  const updateTemplate = async (enabled, template) => {
    startTransition(async () => {
      const result = await actions.updateTemplateAction(enabled, template);

      if (result.success) {
        dispatch({
          type: "SET_CUSTOM_TEMPLATE",
          payload: { enabled, template },
        });
      } else {
        dispatch({ type: "SET_ERROR", payload: result.error });
      }
    });
  };

  return {
    isEnabled: state.enable,
    useCustomTemplate: state.useCustomTemplate,
    dirTemplate: state.dirTemplate,
    isPending,
    toggleEnable,
    updateTemplate,
  };
}

/**
 * Hook for optimistic updates
 * Allows UI to update immediately while async operation completes
 */
export function useOptimisticStorage(key) {
  const state = useStorage();
  const dispatch = useStorageDispatch();

  const [optimisticValue, setOptimisticValue] = useOptimistic(state[key], (currentValue, newValue) => newValue);

  const updateValue = async (newValue, actionFn) => {
    // Update optimistically
    setOptimisticValue(newValue);

    // Execute actual action
    const result = await actionFn(newValue);

    if (!result.success) {
      // Revert on error
      dispatch({ type: "SET_ERROR", payload: result.error });
    }
  };

  return [optimisticValue, updateValue];
}

/**
 * Hook for batch operations
 */
export function useBatchOperations() {
  const dispatch = useStorageDispatch();
  const [isPending, startTransition] = useTransition();

  const batchUpdateSHA = async (updates) => {
    startTransition(async () => {
      const result = await actions.batchUpdateSHAAction(updates);

      if (result.success) {
        // Update local state
        const submissionUpdates = {};
        updates.forEach(({ path, sha }) => {
          submissionUpdates[path] = sha;
        });

        dispatch({
          type: "UPDATE_SUBMISSION",
          payload: submissionUpdates,
        });
      } else {
        dispatch({ type: "SET_ERROR", payload: result.error });
      }
    });
  };

  return {
    isPending,
    batchUpdateSHA,
  };
}

/**
 * Hook for form submissions with useActionState
 * Provides form action with built-in state management
 */
export function useStorageForm(actionType, actionFn) {
  const dispatch = useStorageDispatch();

  const [formState, formAction, isPending] = useActionState(
    async (previousState, formData) => {
      try {
        const result = await actionFn(formData);

        if (result.success) {
          dispatch({ type: actionType, payload: result.data });
          return { success: true };
        } else {
          return { error: result.error };
        }
      } catch (error) {
        log.error("Form action error:", error);
        return { error: error.message };
      }
    },
    { success: false, error: null }
  );

  return {
    formState,
    formAction,
    isPending,
  };
}

/**
 * Hook for loading states
 */
export function useLoadingState() {
  const state = useStorage();

  return {
    isLoading: state.isLoading,
    error: state.error,
    lastSync: state.lastSync,
  };
}
