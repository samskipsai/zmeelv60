import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getZmeel } from '@/lib/zmeel';
import type {
  ConnectedProvider,
  ZaiCredentials,
  ZaiRegion,
} from '@zmeel/agent-core/common';
import { DEFAULT_PROVIDERS } from '@zmeel/agent-core/common';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ZaiProviderForm');

interface UseZaiProviderConnectOptions {
  connectedProvider?: ConnectedProvider;
  onConnect: (provider: ConnectedProvider) => void;
}

export interface UseZaiProviderConnectResult {
  apiKey: string;
  region: ZaiRegion;
  connecting: boolean;
  error: string | null;
  models: Array<{ id: string; name: string }>;
  isConnected: boolean;
  storedCredentials: ZaiCredentials | undefined;
  setApiKey: (key: string) => void;
  setRegion: (region: ZaiRegion) => void;
  handleConnect: () => Promise<void>;
}

export function useZaiProviderConnect({
  connectedProvider,
  onConnect,
}: UseZaiProviderConnectOptions): UseZaiProviderConnectResult {
  const { t } = useTranslation('settings');
  const [apiKey, setApiKey] = useState('');
  const [region, setRegion] = useState<ZaiRegion>('international');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedModels, setFetchedModels] = useState<Array<{ id: string; name: string }> | null>(
    null,
  );

  const providerConfig = DEFAULT_PROVIDERS.find((p) => p.id === 'zai');
  const staticModels =
    providerConfig?.models.map((m) => ({ id: m.fullId, name: m.displayName })) || [];
  const isConnected = connectedProvider?.connectionStatus === 'connected';
  const storedCredentials = connectedProvider?.credentials as ZaiCredentials | undefined;

  const models = connectedProvider?.availableModels?.length
    ? connectedProvider.availableModels.map((m) => ({ id: m.id, name: m.name }))
    : (fetchedModels ?? staticModels);

  useEffect(() => {
    if (!isConnected) {
      return;
    }
    if (connectedProvider?.availableModels?.length) {
      return;
    }
    if (!providerConfig?.modelsEndpoint) {
      return;
    }

    const zmeel = getZmeel();
    const storedRegion = storedCredentials?.region || 'international';
    zmeel
      .fetchProviderModels('zai', { zaiRegion: storedRegion })
      .then((result) => {
        if (result.success && result.models?.length) {
          setFetchedModels(result.models);
          zmeel
            .setConnectedProvider('zai', {
              ...connectedProvider!,
              availableModels: result.models,
            })
            .catch((err) => logger.error('Operation failed:', err));
        }
      })
      .catch((err) => logger.error('Operation failed:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      setError(t('apiKey.enterKeyRequired'));
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const zmeel = getZmeel();
      const validation = await zmeel.validateApiKeyForProvider('zai', apiKey.trim(), {
        region,
      });

      if (!validation.valid) {
        setError(validation.error || t('apiKey.invalidKey'));
        setConnecting(false);
        return;
      }

      await zmeel.addApiKey('zai', apiKey.trim());

      let dynamicModels: Array<{ id: string; name: string }> | undefined;
      if (providerConfig?.modelsEndpoint) {
        const fetchResult = await zmeel.fetchProviderModels('zai', { zaiRegion: region });
        if (fetchResult.success && fetchResult.models) {
          dynamicModels = fetchResult.models;
        }
      }

      const defaultModelId = providerConfig?.defaultModelId ?? null;
      const trimmedKey = apiKey.trim();

      const provider: ConnectedProvider = {
        providerId: 'zai',
        connectionStatus: 'connected',
        selectedModelId: defaultModelId,
        credentials: {
          type: 'zai',
          keyPrefix:
            trimmedKey.length > 40
              ? trimmedKey.substring(0, 40) + '...'
              : trimmedKey.substring(0, Math.min(trimmedKey.length, 20)) + '...',
          region,
        } as ZaiCredentials,
        lastConnectedAt: new Date().toISOString(),
        ...(dynamicModels ? { availableModels: dynamicModels } : {}),
      };

      onConnect(provider);
      setApiKey('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('status.connectionFailed'));
    } finally {
      setConnecting(false);
    }
  };

  return {
    apiKey,
    region,
    connecting,
    error,
    models,
    isConnected,
    storedCredentials,
    setApiKey,
    setRegion,
    handleConnect,
  };
}
