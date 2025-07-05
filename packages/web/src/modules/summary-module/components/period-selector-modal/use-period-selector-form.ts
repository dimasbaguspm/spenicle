import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import type { PeriodType } from '../../hooks/use-desktop-summary-filters';

import {
  canNavigateForward,
  generatePeriodOptions,
  getNavigationTitle,
  getNextNavigationDate,
  type PeriodOption,
} from './helpers';

export interface PeriodSelectorFormData {
  periodType: PeriodType;
  startDate: Date | null;
  endDate: Date | null;
}

export interface UsePeriodSelectorFormProps {
  defaultValues: Partial<PeriodSelectorFormData>;
  onConfirm: (data: PeriodSelectorFormData) => void;
}

/**
 * Custom hook for managing period selector form state and logic
 * Integrates with react-hook-form for better form management and validation
 * Form state remains independent until user confirms, preventing prop sync issues
 * Now self-contained with default values and simplified callback interface
 */
export const usePeriodSelectorForm = ({ defaultValues, onConfirm }: UsePeriodSelectorFormProps) => {
  // track last confirmed state for cancel operations
  const lastConfirmedPropsRef = useRef(defaultValues);

  // navigation state for period browser - separate from selection state
  // this determines what periods are shown, independent of what the user has selected
  const [navigationDate, setNavigationDate] = useState(() => {
    // initialize navigation based on endDate if available, otherwise current date
    return defaultValues.endDate ? dayjs(defaultValues.endDate) : dayjs();
  });

  // react-hook-form setup
  const form = useForm<PeriodSelectorFormData>({
    defaultValues,
    mode: 'onChange',
  });

  const { handleSubmit, watch, setValue } = form;

  // watch form values for reactive updates
  const watchedPeriodType = watch('periodType');
  const watchedStartDate = watch('startDate');
  const watchedEndDate = watch('endDate');

  // sync navigation date with form's endDate when user has a selection
  // this ensures the navigation context always reflects the current selection
  useEffect(() => {
    if (watchedEndDate) {
      setNavigationDate(dayjs(watchedEndDate));
    }
  }, [watchedEndDate]);

  // form is now self-contained - no external prop synchronization needed
  // initialization happens once with defaultValues

  // helper to reset form to last confirmed state (for cancel operations)
  const resetToLastConfirmed = useCallback(() => {
    const lastConfirmed = lastConfirmedPropsRef.current;

    setValue('periodType', lastConfirmed.periodType ?? 'monthly');
    setValue('startDate', lastConfirmed.startDate ?? null);
    setValue('endDate', lastConfirmed.endDate ?? null);

    // sync navigation date with the confirmed endDate or current date
    const navigationRef = lastConfirmed.endDate ? dayjs(lastConfirmed.endDate) : dayjs();
    setNavigationDate(navigationRef);
  }, [setValue, setNavigationDate]);

  // generate period options based on current navigation state
  const periodOptions = useMemo((): PeriodOption[] => {
    return generatePeriodOptions(watchedPeriodType, navigationDate);
  }, [watchedPeriodType, navigationDate]);

  // check if user has selected a valid period after changing period type
  const hasValidPeriodSelection = useMemo(() => {
    // if either date is null, no valid selection has been made
    if (!watchedStartDate || !watchedEndDate) {
      return false;
    }

    // check if current dates match any of the available period options
    const currentStartTime = watchedStartDate.getTime();
    const currentEndTime = watchedEndDate.getTime();

    return periodOptions.some(
      (option) =>
        option.startDate.getTime() === currentStartTime &&
        option.endDate.getTime() === currentEndTime &&
        !option.isFuture // ensure it's not a future period
    );
  }, [watchedStartDate, watchedEndDate, periodOptions]);

  // check if forward navigation is possible
  const canNavigateForwardValue = useMemo(() => {
    return canNavigateForward(watchedPeriodType, navigationDate);
  }, [watchedPeriodType, navigationDate]);

  // get navigation title
  const navigationTitle = useMemo(() => {
    return getNavigationTitle(watchedPeriodType, navigationDate);
  }, [watchedPeriodType, navigationDate]);

  // navigation handlers with useCallback for stable references
  const handleNavigateBack = useCallback(() => {
    const nextDate = getNextNavigationDate(watchedPeriodType, navigationDate, 'back');
    setNavigationDate(nextDate);
  }, [watchedPeriodType, navigationDate]);

  const handleNavigateForward = useCallback(() => {
    if (!canNavigateForwardValue) return;

    const nextDate = getNextNavigationDate(watchedPeriodType, navigationDate, 'forward');
    setNavigationDate(nextDate);
  }, [watchedPeriodType, navigationDate, canNavigateForwardValue]);

  // handle period selection with useCallback
  const handlePeriodSelect = useCallback(
    (option: PeriodOption) => {
      if (option.isFuture) return; // prevent selecting future periods

      // Update form state directly using setValue for better control
      setValue('periodType', watchedPeriodType);
      setValue('startDate', option.startDate);
      setValue('endDate', option.endDate);

      // Sync navigation date with the selected period's endDate
      // This ensures navigation context reflects the current selection
      setNavigationDate(dayjs(option.endDate));
    },
    [setValue, watchedPeriodType, setNavigationDate]
  );

  // handle period type change with useCallback
  // clears selected period dates to force user to select a new period
  const handlePeriodTypeChange = useCallback(
    (newType: PeriodType) => {
      // when period type changes, we need to clear the selected period
      // and require user to make a new selection for better UX
      setValue('periodType', newType);
      // set to null to explicitly indicate no period is selected
      // this triggers the notification to select a period
      setValue('startDate', null);
      setValue('endDate', null);

      // reset navigation to current date for the new period type
      setNavigationDate(dayjs());
    },
    [setValue, setNavigationDate]
  );

  // form submission handler
  // this is the only place where external state is updated
  const onSubmit = handleSubmit((data) => {
    // ensure we have valid dates before submitting
    if (!data.startDate || !data.endDate) {
      return; // should not happen due to validation, but extra safety
    }

    // update last confirmed state for future cancel operations
    lastConfirmedPropsRef.current = data;

    // trigger confirmation callback with form data
    onConfirm(data);
  });

  // period type options for UI
  const typeOptions = useMemo(
    () => [
      { value: 'weekly' as const, label: 'Weekly' },
      { value: 'monthly' as const, label: 'Monthly' },
      { value: 'yearly' as const, label: 'Yearly' },
    ],
    []
  );

  return {
    // form management
    form,
    onSubmit,

    // form values
    periodType: watchedPeriodType,
    startDate: watchedStartDate,
    endDate: watchedEndDate,

    // period options and navigation
    periodOptions,
    navigationTitle,
    canNavigateForward: canNavigateForwardValue,

    // handlers
    handlePeriodSelect,
    handlePeriodTypeChange,
    handleNavigateBack,
    handleNavigateForward,

    // ui options
    typeOptions,

    // form state
    isValid: form.formState.isValid && hasValidPeriodSelection,
    isDirty: form.formState.isDirty,
    hasValidPeriodSelection,

    // utility functions
    resetToLastConfirmed,
  };
};
