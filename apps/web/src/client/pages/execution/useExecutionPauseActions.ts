import { useCallback, useMemo } from 'react';
import { hasAnyReadyProvider, getOAuthProviderDisplayName } from '@zmeel/agent-core/common';
import type { useExecutionCore } from './useExecutionCore';

type CoreState = ReturnType<typeof useExecutionCore>;

export function useExecutionPauseActions(s: CoreState) {
  const { zmeel, t } = s;

  const resumePausedTask = useCallback(
    async (message: string): Promise<boolean> => {
      const isE2EMode = await zmeel.isE2EMode();
      if (!isE2EMode) {
        const settings = await zmeel.getProviderSettings();
        if (!hasAnyReadyProvider(settings)) {
          s.setPendingFollowUp(message);
          s.setSettingsInitialTab('providers');
          s.setShowSettingsDialog(true);
          return false;
        }
      }
      return await s.sendFollowUp(message, []);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- s is a stable hook result; individual actions are listed
    [
      zmeel,
      s.setPendingFollowUp,
      s.setSettingsInitialTab,
      s.setShowSettingsDialog,
      s.sendFollowUp,
    ],
  );

  const handleContinue = useCallback(async () => {
    return await resumePausedTask('continue');
  }, [resumePausedTask]);

  const { pauseAction, setTaskActionError, setIsTaskActionRunning } = s;

  const handlePauseAction = useCallback(async () => {
    if (!pauseAction || pauseAction.type !== 'oauth-connect') {
      return;
    }
    const providerName = getOAuthProviderDisplayName(pauseAction.providerId);
    setTaskActionError(null);
    setIsTaskActionRunning(true);
    try {
      // Slack MCP is currently the only supported oauth-connect provider.
      const status = await zmeel.getSlackMcpOauthStatus();
      if (status.pendingAuthorization) {
        await zmeel.logoutSlackMcp();
      }
      if (!status.connected) {
        await zmeel.loginSlackMcp();
      }
      const refreshed = await zmeel.getSlackMcpOauthStatus();
      if (!refreshed.connected) {
        throw new Error(t('questionPrompt.oauthStillDisconnected', { provider: providerName }));
      }
      return await resumePausedTask(pauseAction.successText ?? `${providerName} is connected.`);
    } catch (error) {
      setTaskActionError(
        error instanceof Error
          ? error.message
          : t('questionPrompt.oauthFailed', { provider: providerName }),
      );
      return false;
    } finally {
      setIsTaskActionRunning(false);
    }
  }, [zmeel, t, resumePausedTask, pauseAction, setTaskActionError, setIsTaskActionRunning]);

  const handleTaskAction = useMemo(
    () => (s.isConnectorAuthPause ? handlePauseAction : handleContinue),
    [s.isConnectorAuthPause, handlePauseAction, handleContinue],
  );

  return { handleContinue, handlePauseAction, handleTaskAction, resumePausedTask };
}
