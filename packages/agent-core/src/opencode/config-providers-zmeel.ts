/**
 * Zmeel AI provider config builder.
 *
 * Delegates to the injected ZmeelRuntime adapter. In OSS the runtime is
 * noopRuntime (isAvailable() === false), so this builder returns empty configs.
 * The private @zmeel/llm-gateway-client package provides the real runtime.
 */

import { createConsoleLogger } from '../utils/logging.js';
import type { ProviderBuildContext, ProviderBuildResult } from './config-provider-context.js';

const log = createConsoleLogger({ prefix: 'ZmeelAiConfigBuilder' });

export async function buildZmeelAiConfig(
  ctx: ProviderBuildContext,
): Promise<ProviderBuildResult> {
  if (!ctx.zmeelRuntime?.isAvailable()) {
    return { configs: [], enableToAdd: [] };
  }
  const provider = ctx.providerSettings.connectedProviders['zmeel-ai'];
  if (provider?.connectionStatus !== 'connected') {
    return { configs: [], enableToAdd: [] };
  }
  if (!ctx.zmeelStorageDeps) {
    log.warn('Zmeel AI connected but storage deps not available — skipping');
    return { configs: [], enableToAdd: [] };
  }
  try {
    return await ctx.zmeelRuntime.buildProviderConfig(ctx.zmeelStorageDeps);
  } catch (err) {
    log.error('Failed to start Zmeel AI proxy', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { configs: [], enableToAdd: [] };
  }
}
