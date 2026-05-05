/**
 * Narrow type-only entrypoint for @zmeel/llm-gateway-client.
 *
 * The private gateway client package imports types from agent-core for
 * the ZmeelRuntime interface. This entrypoint re-exports ONLY the
 * types needed — it does NOT pull in storage, database, or validation
 * modules that would require better-sqlite3/zod at type-resolution time.
 *
 * Usage in llm-gateway-client:
 *   import type { ZmeelRuntime } from '@zmeel/agent-core/runtime-types';
 *
 * Exposed via package.json exports:
 *   "./runtime-types": "./dist/zmeel-runtime-types.js"
 */

export type {
  ZmeelRuntime,
  StorageDeps,
  ZmeelConnectResult,
} from './opencode/zmeel-runtime.js';

export type { CreditUsage } from './common/types/gateway.js';

export type { ProviderBuildResult } from './opencode/config-provider-context.js';
