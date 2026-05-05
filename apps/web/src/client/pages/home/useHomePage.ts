import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useTaskStore } from '@/stores/taskStore';
import { getZmeel } from '@/lib/zmeel';
import { createLogger } from '@/lib/logger';
import { hasAnyReadyProvider } from '@zmeel/agent-core/common';
import { USE_CASE_KEYS, FAVORITES_PREVIEW_COUNT } from './homeConstants';
import { usePromptAttachments } from './usePromptAttachments';
import { useHomePageSettings } from './useHomePageSettings';

export { FAVORITES_PREVIEW_COUNT } from './homeConstants';

const logger = createLogger('Home');

export function useHomePage() {
  const [prompt, setPrompt] = useState('');
  const [showAllFavorites, setShowAllFavorites] = useState(false);
  const [workingDirectory, setWorkingDirectory] = useState<string | undefined>(undefined);

  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation('home');

  const favorites = useTaskStore((state) => state.favorites);
  const favoritesList = Array.isArray(favorites) ? favorites : [];
  const loadFavorites = useTaskStore((state) => state.loadFavorites);
  const removeFavorite = useTaskStore((state) => state.removeFavorite);
  const startTask = useTaskStore((state) => state.startTask);
  const interruptTask = useTaskStore((state) => state.interruptTask);
  const isLoading = useTaskStore((state) => state.isLoading);
  const addTaskUpdate = useTaskStore((state) => state.addTaskUpdate);
  const setPermissionRequest = useTaskStore((state) => state.setPermissionRequest);

  const zmeel = useMemo(() => getZmeel(), []);

  const useCaseExamples = useMemo(
    () =>
      USE_CASE_KEYS.map(({ key, icons }) => ({
        key,
        title: t(`useCases.${key}.title`),
        description: t(`useCases.${key}.description`),
        prompt: t(`useCases.${key}.prompt`),
        icons,
      })),
    [t],
  );

  useEffect(() => {
    if (location.pathname === '/' && typeof loadFavorites === 'function') {
      void loadFavorites();
    }
  }, [location.pathname, loadFavorites]);

  useEffect(() => {
    const unsubscribeTask = zmeel.onTaskUpdate((event) => {
      addTaskUpdate(event);
    });
    const unsubscribePermission = zmeel.onPermissionRequest((request) => {
      setPermissionRequest(request);
    });
    return () => {
      unsubscribeTask();
      unsubscribePermission();
    };
  }, [addTaskUpdate, setPermissionRequest, zmeel]);

  const {
    attachments,
    attachmentError,
    setAttachments,
    buildPromptWithAttachments,
    handleExampleClick,
    handleSkillSelect,
    handleAttachFiles,
    addFiles,
    MAX_FILES,
  } = usePromptAttachments({ setPrompt });

  const executeTask = useCallback(async () => {
    if ((!prompt.trim() && attachments.length === 0) || isLoading) {
      return;
    }
    const taskId = `task_${Date.now()}`;
    const enrichedPrompt = buildPromptWithAttachments(prompt.trim(), attachments);
    const task = await startTask({
      prompt: enrichedPrompt,
      taskId,
      files: attachments,
      workingDirectory,
    });
    if (task) {
      setAttachments([]);
      setWorkingDirectory(undefined);
      navigate(`/execution/${task.id}`);
    }
  }, [
    prompt,
    attachments,
    workingDirectory,
    isLoading,
    startTask,
    setAttachments,
    navigate,
    buildPromptWithAttachments,
  ]);

  const {
    showSettingsDialog,
    settingsInitialTab,
    setResumeAfterSettingsSave,
    setSettingsInitialTab,
    setShowSettingsDialog,
    handleSettingsDialogChange,
    handleOpenSpeechSettings,
    handleOpenModelSettings,
    handleOpenSettings,
    handleApiKeySaved,
  } = useHomePageSettings({ onResume: executeTask });

  const handleSubmit = useCallback(async () => {
    if (isLoading) {
      void interruptTask();
      return;
    }
    if (!prompt.trim() && attachments.length === 0) {
      return;
    }
    try {
      const isE2EMode = await zmeel.isE2EMode();
      if (!isE2EMode) {
        const settings = await zmeel.getProviderSettings();
        if (!hasAnyReadyProvider(settings)) {
          setResumeAfterSettingsSave(true);
          setSettingsInitialTab('providers');
          setShowSettingsDialog(true);
          return;
        }
      }
      await executeTask();
    } catch (err) {
      logger.error('Failed to submit task:', err);
    }
  }, [
    isLoading,
    prompt,
    attachments,
    zmeel,
    executeTask,
    interruptTask,
    setResumeAfterSettingsSave,
    setSettingsInitialTab,
    setShowSettingsDialog,
  ]);

  const displayedFavorites = showAllFavorites
    ? favoritesList
    : favoritesList.slice(0, FAVORITES_PREVIEW_COUNT);
  const hasMoreFavorites = favoritesList.length > FAVORITES_PREVIEW_COUNT;

  return {
    prompt,
    setPrompt,
    showAllFavorites,
    setShowAllFavorites,
    attachments,
    attachmentError,
    setAttachments,
    workingDirectory,
    setWorkingDirectory,
    showSettingsDialog,
    settingsInitialTab,
    favoritesList,
    removeFavorite,
    isLoading,
    useCaseExamples,
    displayedFavorites,
    hasMoreFavorites,
    handleSubmit,
    handleSettingsDialogChange,
    handleOpenSpeechSettings,
    handleOpenModelSettings,
    handleOpenSettings,
    handleApiKeySaved,
    handleExampleClick,
    handleSkillSelect,
    handleAttachFiles,
    addFiles,
    MAX_FILES,
  };
}
