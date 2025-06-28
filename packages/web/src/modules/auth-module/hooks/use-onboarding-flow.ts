import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Building2, CheckCircle, FolderOpen, Hand } from 'lucide-react';
import { useState } from 'react';

import { DRAWER_IDS } from '../../../constants/drawer-id';
import { useApiUpdateCurrentUserMutation } from '../../../hooks';
import { QUERY_KEYS } from '../../../hooks/use-api/constants';
import { useDrawerDispatchListener, useDrawerRouterProvider } from '../../../providers/drawer-router';

export type OnboardingStep = 'welcome' | 'account' | 'categories' | 'complete';

export interface StepProgress {
  welcome: boolean;
  account: boolean;
  categories: boolean;
  complete: boolean;
}

export interface OnboardingConfig {
  autoProgress: boolean;
  progressDelay: number;
}

/**
 * Custom hook for managing onboarding flow state and logic
 * Handles step progression, drawer interactions, and completion
 */
export function useOnboardingFlow() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [progress, setProgress] = useState<StepProgress>({
    welcome: false,
    account: false,
    categories: false,
    complete: false,
  });
  const [updateUser, , { isPending: isCompletingOnboarding }] = useApiUpdateCurrentUserMutation();
  const { openDrawer } = useDrawerRouterProvider();

  // listen for drawer submissions and auto-progress through steps
  useDrawerDispatchListener({
    onSubmit: (drawerId) => {
      if (drawerId === DRAWER_IDS.ADD_ACCOUNT) {
        setProgress((prev) => ({ ...prev, account: true }));
        setCurrentStep('categories');
      }
      if (drawerId === DRAWER_IDS.ADD_CATEGORY) {
        setProgress((prev) => ({ ...prev, categories: true }));
        setCurrentStep('complete');
      }
    },
  });

  const actions = {
    startOnboarding: () => {
      setProgress((prev) => ({ ...prev, welcome: true }));
      setCurrentStep('account');
    },

    goToStep: (step: OnboardingStep) => {
      setCurrentStep(step);
    },

    openAccountDrawer: () => openDrawer('add-account'),
    openCategoryDrawer: () => openDrawer('add-category'),

    completeOnboarding: async () => {
      // remove users query to ensure fresh data after onboarding
      queryClient.removeQueries({ queryKey: QUERY_KEYS.USERS.current(), exact: false });
      await updateUser({ isOnboard: true });
      await navigate({ to: '/' });
    },

    // manual progress control for custom flows
    markStepComplete: (step: keyof StepProgress) => {
      setProgress((prev) => ({ ...prev, [step]: true }));
    },

    resetOnboarding: () => {
      setCurrentStep('welcome');
      setProgress({
        welcome: false,
        account: false,
        categories: false,
        complete: false,
      });
    },
  };

  const stepMetadata = [
    { key: 'welcome', label: 'Welcome', icon: Hand },
    { key: 'account', label: 'Add Payment Method', icon: Building2 },
    { key: 'categories', label: 'Create Categories', icon: FolderOpen },
    { key: 'complete', label: 'Complete', icon: CheckCircle },
  ] as const;

  const currentStepIndex = stepMetadata.findIndex((step) => step.key === currentStep);

  return {
    // state
    currentStep,
    progress,
    stepMetadata,
    currentStepIndex,
    isCompletingOnboarding,

    // actions
    ...actions,
  };
}

export type UseOnboardingFlowReturn = ReturnType<typeof useOnboardingFlow>;
