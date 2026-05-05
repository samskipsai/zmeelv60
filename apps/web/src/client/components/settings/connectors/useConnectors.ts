import { useState, useCallback, useEffect } from 'react';
import type { McpConnector } from '@zmeel/agent-core/common';
import type { ConnectorAuthStatus, OAuthProviderId } from '@zmeel/agent-core/common';
import { getZmeel } from '@/lib/zmeel';
import { createLogger } from '@/lib/logger';

const logger = createLogger('useConnectors');

export interface SlackMcpAuthState {
  connected: boolean;
  pendingAuthorization: boolean;
}

export function useConnectors() {
  const [connectors, setConnectors] = useState<McpConnector[]>([]);
  const [slackAuth, setSlackAuth] = useState<SlackMcpAuthState>({
    connected: false,
    pendingAuthorization: false,
  });
  const [builtInAuthStates, setBuiltInAuthStates] = useState<Record<string, ConnectorAuthStatus>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConnectors = useCallback(async () => {
    const zmeel = getZmeel();
    try {
      const [connectorsResult, slackStatusResult, builtInStatusResult] = await Promise.allSettled([
        zmeel.getConnectors(),
        zmeel.getSlackMcpOauthStatus(),
        zmeel.getBuiltInConnectorAuthStatus(),
      ]);

      if (connectorsResult.status === 'fulfilled') {
        setConnectors(connectorsResult.value);
      }

      if (slackStatusResult.status === 'fulfilled') {
        setSlackAuth(slackStatusResult.value);
      }

      if (builtInStatusResult.status === 'fulfilled') {
        const statusMap: Record<string, ConnectorAuthStatus> = {};
        for (const status of builtInStatusResult.value) {
          statusMap[status.providerId] = status;
        }
        setBuiltInAuthStates(statusMap);
      }

      if (
        connectorsResult.status === 'rejected' &&
        slackStatusResult.status === 'rejected' &&
        builtInStatusResult.status === 'rejected'
      ) {
        throw connectorsResult.reason;
      }

      setError(null);
    } catch (err) {
      logger.error('Failed to load connectors:', err);
      setError(err instanceof Error ? err.message : 'Failed to load connectors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnectors();
  }, [fetchConnectors]);

  const addConnector = useCallback(async (name: string, url: string) => {
    const zmeel = getZmeel();
    const connector = await zmeel.addConnector(name, url);
    setConnectors((prev) => [connector, ...prev]);
    return connector;
  }, []);

  const deleteConnector = useCallback(async (id: string) => {
    const zmeel = getZmeel();
    await zmeel.deleteConnector(id);
    setConnectors((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const toggleEnabled = useCallback(
    async (id: string) => {
      const connector = connectors.find((c) => c.id === id);
      if (!connector) {
        return;
      }

      const zmeel = getZmeel();
      await zmeel.setConnectorEnabled(id, !connector.isEnabled);
      setConnectors((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isEnabled: !c.isEnabled } : c)),
      );
    },
    [connectors],
  );

  const startOAuth = useCallback(async (connectorId: string) => {
    setConnectors((prev) =>
      prev.map((c) => (c.id === connectorId ? { ...c, status: 'connecting' as const } : c)),
    );

    try {
      const zmeel = getZmeel();
      return await zmeel.startConnectorOAuth(connectorId);
    } catch (err) {
      setConnectors((prev) =>
        prev.map((c) => (c.id === connectorId ? { ...c, status: 'error' as const } : c)),
      );
      throw err;
    }
  }, []);

  const completeOAuth = useCallback(async (state: string, code: string) => {
    const zmeel = getZmeel();
    const updated = await zmeel.completeConnectorOAuth(state, code);
    if (updated) {
      setConnectors((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    }
    return updated;
  }, []);

  const disconnect = useCallback(async (connectorId: string) => {
    const zmeel = getZmeel();
    await zmeel.disconnectConnector(connectorId);
    setConnectors((prev) =>
      prev.map((c) => (c.id === connectorId ? { ...c, status: 'disconnected' as const } : c)),
    );
  }, []);

  // Built-in connector actions
  const authenticateBuiltIn = useCallback(
    async (providerId: OAuthProviderId) => {
      setBuiltInAuthStates((prev) => ({
        ...prev,
        [providerId]: {
          ...(prev[providerId] ?? { providerId, connected: false, pendingAuthorization: false }),
          pendingAuthorization: true,
        },
      }));

      try {
        const zmeel = getZmeel();
        await zmeel.loginBuiltInConnector(providerId);
        await fetchConnectors();
      } catch (err) {
        setBuiltInAuthStates((prev) => ({
          ...prev,
          [providerId]: {
            ...(prev[providerId] ?? { providerId, connected: false, pendingAuthorization: false }),
            pendingAuthorization: false,
          },
        }));
        throw err;
      }
    },
    [fetchConnectors],
  );

  const disconnectBuiltIn = useCallback(async (providerId: OAuthProviderId) => {
    const zmeel = getZmeel();
    await zmeel.logoutBuiltInConnector(providerId);
    setBuiltInAuthStates((prev) => ({
      ...prev,
      [providerId]: {
        providerId,
        connected: false,
        pendingAuthorization: false,
      },
    }));
  }, []);

  const authenticateSlack = useCallback(async () => {
    const zmeel = getZmeel();

    setSlackAuth(() => ({
      connected: false,
      pendingAuthorization: true,
    }));

    try {
      if (slackAuth.pendingAuthorization) {
        await zmeel.logoutSlackMcp();
      }

      await zmeel.loginSlackMcp();
      const status = await zmeel.getSlackMcpOauthStatus();
      setSlackAuth(status);
      return status;
    } catch (err) {
      try {
        const status = await zmeel.getSlackMcpOauthStatus();
        setSlackAuth(status);
      } catch {
        setSlackAuth({ connected: false, pendingAuthorization: false });
      }
      throw err;
    }
  }, [slackAuth.pendingAuthorization]);

  const disconnectSlack = useCallback(async () => {
    const zmeel = getZmeel();
    await zmeel.logoutSlackMcp();
    setSlackAuth({ connected: false, pendingAuthorization: false });
  }, []);

  return {
    connectors,
    slackAuth,
    builtInAuthStates,
    loading,
    error,
    addConnector,
    deleteConnector,
    toggleEnabled,
    startOAuth,
    completeOAuth,
    disconnect,
    authenticateBuiltIn,
    disconnectBuiltIn,
    authenticateSlack,
    disconnectSlack,
    refetch: fetchConnectors,
  };
}
