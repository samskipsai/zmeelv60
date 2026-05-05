import { useState, useEffect, useCallback, useMemo } from 'react';
import { getZmeel } from '../lib/zmeel';
import { isProviderReady, type ProviderId } from '@zmeel/agent-core/common';
import type { CreditUsage } from '@zmeel/agent-core/common';

export type { CreditUsage };

export function getCreditStatusColor(usage: CreditUsage): string {
  if (usage.remainingCredits <= 0) return 'bg-red-500';
  const pct = usage.totalCredits > 0 ? (usage.spentCredits / usage.totalCredits) * 100 : 0;
  if (pct < 60) return 'bg-emerald-500';
  if (pct < 85) return 'bg-amber-500';
  return 'bg-red-500';
}

export function useCreditsState() {
  const zmeel = useMemo(() => getZmeel(), []);

  const [usage, setUsage] = useState<CreditUsage | null>(null);
  const [isCreditsBlocked, setIsCreditsBlocked] = useState(false);
  const [hasAlternativeReadyProvider, setHasAlternativeReadyProvider] = useState(false);
  const [showQuotaInline, setShowQuotaInline] = useState(false);

  type ProviderSettingsSnapshot = Awaited<ReturnType<typeof zmeel.getProviderSettings>>;

  const applyLiveUsage = useCallback(
    (settings: ProviderSettingsSnapshot, liveUsage: CreditUsage): boolean => {
      const connectedZmeel = settings.connectedProviders['zmeel-ai'];
      const readyAlternativeExists = (
        Object.keys(settings.connectedProviders) as ProviderId[]
      ).some(
        (providerId) =>
          providerId !== 'zmeel-ai' &&
          isProviderReady(settings.connectedProviders[providerId]),
      );
      setHasAlternativeReadyProvider(readyAlternativeExists);

      if (connectedZmeel?.connectionStatus !== 'connected') {
        setUsage(null);
        setIsCreditsBlocked(false);
        setShowQuotaInline(false);
        return false;
      }

      const isExhausted = liveUsage.remainingCredits <= 0;
      const shouldBlock =
        settings.activeProviderId === 'zmeel-ai' &&
        isProviderReady(connectedZmeel) &&
        isExhausted;

      setUsage(liveUsage);
      setIsCreditsBlocked(shouldBlock);

      if (!shouldBlock) {
        setShowQuotaInline(false);
      }
      return shouldBlock;
    },
    [],
  );

  const refreshCreditsState = useCallback(async (): Promise<boolean> => {
    try {
      const settings = await zmeel.getProviderSettings();
      const connectedZmeel = settings.connectedProviders['zmeel-ai'];
      if (connectedZmeel?.connectionStatus !== 'connected') {
        const readyAlternativeExists = (
          Object.keys(settings.connectedProviders) as ProviderId[]
        ).some(
          (providerId) =>
            providerId !== 'zmeel-ai' &&
            isProviderReady(settings.connectedProviders[providerId]),
        );
        setHasAlternativeReadyProvider(readyAlternativeExists);
        setUsage(null);
        setIsCreditsBlocked(false);
        setShowQuotaInline(false);
        return false;
      }
      const liveUsage = await zmeel.zmeelAiGetUsage();
      return applyLiveUsage(settings, liveUsage);
    } catch {
      setHasAlternativeReadyProvider(false);
      setUsage(null);
      setIsCreditsBlocked(false);
      setShowQuotaInline(false);
      return false;
    }
  }, [zmeel, applyLiveUsage]);

  const openQuotaBlockExperience = useCallback(() => {
    setShowQuotaInline(true);
  }, []);

  // Initial fetch — inline to avoid ESLint set-state-in-effect warning
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [usageData, settings] = await Promise.all([
          zmeel.zmeelAiGetUsage?.(),
          zmeel.getProviderSettings(),
        ]);
        if (cancelled || !usageData) return;
        applyLiveUsage(settings, usageData);
      } catch {
        // Zmeel AI not connected — no-op
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [zmeel, applyLiveUsage]);

  // Subscribe to live usage updates
  useEffect(() => {
    const unsubscribe = zmeel.onZmeelAiUsageUpdate?.((liveUsage) => {
      void (async () => {
        try {
          const settings = await zmeel.getProviderSettings();
          applyLiveUsage(settings, liveUsage);
        } catch {
          setHasAlternativeReadyProvider(false);
          setUsage(null);
          setIsCreditsBlocked(false);
          setShowQuotaInline(false);
        }
      })();
    });

    return () => {
      unsubscribe?.();
    };
  }, [zmeel, applyLiveUsage]);

  return {
    usage,
    isCreditsBlocked,
    hasAlternativeReadyProvider,
    showQuotaInline,
    setShowQuotaInline,
    refreshCreditsState,
    openQuotaBlockExperience,
  };
}
