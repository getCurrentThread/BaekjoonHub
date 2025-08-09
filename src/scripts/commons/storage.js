/**
 * Storage - Legacy Compatibility Layer
 * Exports functions from storageAdapter for legacy compatibility
 */

// Re-export all functions from storageAdapter for backward compatibility
export * from "@/storage/storageAdapter.js";

// Import and re-export the main adapter
import storageAdapter from "@/storage/storageAdapter.js";
export default storageAdapter;
