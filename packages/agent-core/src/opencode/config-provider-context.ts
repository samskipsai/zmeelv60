import type { ProviderSettings } from '../common/types/providerSettings.js';
import type { ProviderConfig } from './config-generator.js';
import type { StorageDeps, ZmeelRuntime } from './zmeel-runtime.js';

/**
 * Shared context passed to each per-provider config builder.
 */
export interface ProviderBuildContext {
  providerSettings: ProviderSettings;
  getApiKey: (provider: string) => string | undefined | null;
  azureFoundryToken?: string;
  /** Active provider/model pair from storage. */
  activeModel: { provider: string; model: string; baseUrl?: string } | null | undefined;
  /** Zmeel AI runtime adapter (noop in OSS, real impl in commercial). */
  zmeelRuntime?: ZmeelRuntime;
  /** Zmeel AI identity storage deps (injected from daemon secure storage). */
  zmeelStorageDeps?: StorageDeps;
}

/**
 * Result returned by each per-provider config builder.
 */
export interface ProviderBuildResult {
  /** Provider configs to append to the global list. */
  configs: ProviderConfig[];
  /** Provider IDs to add to the enabled list (only when not already included). */
  enableToAdd: string[];
  /** Model override to use for this run (last writer wins in the orchestrator). */
  modelOverride?: { model: string; smallModel: string };
}
