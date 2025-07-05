import React from 'react';

import { Button } from '../../../../components/button/button';
import { Drawer } from '../../../../components/drawer';
import { useDesktopSummaryFilters } from '../../hooks/use-desktop-summary-filters';

import { PeriodNavigation, PeriodOptionsGrid, PeriodTypeSelector } from './presentation';
import { usePeriodSelectorForm, type PeriodSelectorFormData } from './use-period-selector-form';

export interface PeriodSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: PeriodSelectorFormData) => void;
}

/**
 * Mobile-optimized period selector drawer for analytics views.
 * Enhanced with React Hook Form integration and improved component architecture.
 * Provides intuitive period type selection and pre-defined period options
 * with touch-friendly interface and clear visual hierarchy.
 *
 * Now self-contained - derives default values from desktop summary filters
 * and only communicates final results through onConfirm callback.
 */
export const PeriodSelectorModal: React.FC<PeriodSelectorModalProps> = ({ isOpen, onClose, onConfirm }) => {
  // get current filter state for default values
  const { state } = useDesktopSummaryFilters();

  // use form hook for state management with current filter state as defaults
  const {
    onSubmit,
    periodOptions,
    navigationTitle,
    canNavigateForward,
    handlePeriodSelect,
    handlePeriodTypeChange,
    handleNavigateBack,
    handleNavigateForward,
    typeOptions,
    isValid,
    hasValidPeriodSelection,
    periodType: formPeriodType,
    startDate: formStartDate,
    endDate: formEndDate,
    resetToLastConfirmed,
  } = usePeriodSelectorForm({
    defaultValues: {
      periodType: state.currentPeriodType,
      startDate: state.periodStartDate,
      endDate: state.periodEndDate,
    },
    onConfirm,
  });

  // handle cancel - reset form to last confirmed state and close
  const handleCancel = () => {
    resetToLastConfirmed();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Drawer size="md" onClose={handleCancel} closeOnOverlayClick closeOnEscape>
      <Drawer.Header>
        <Drawer.Title>Select Period</Drawer.Title>
        <Drawer.CloseButton />
      </Drawer.Header>

      <Drawer.Content>
        <form onSubmit={onSubmit} id="period-selector-form" className="space-y-6">
          {/* period type selector */}
          <PeriodTypeSelector value={formPeriodType} onChange={handlePeriodTypeChange} options={typeOptions} />

          {/* helper message when period selection is required */}
          {!hasValidPeriodSelection && (
            <div className="px-4 py-3 rounded-lg bg-coral-50 border border-coral-200">
              <p className="text-sm text-coral-700 font-medium">
                Please select a {formPeriodType.toLowerCase()} period below to continue
              </p>
            </div>
          )}

          {/* period navigation and options */}
          <div className="space-y-5">
            <PeriodNavigation
              title={navigationTitle}
              canNavigateForward={canNavigateForward}
              onNavigateBack={handleNavigateBack}
              onNavigateForward={handleNavigateForward}
            />

            <PeriodOptionsGrid
              periodType={formPeriodType}
              options={periodOptions}
              selectedStartDate={formStartDate}
              selectedEndDate={formEndDate}
              onSelect={handlePeriodSelect}
            />
          </div>
        </form>
      </Drawer.Content>

      <Drawer.Footer>
        <div className="flex gap-3 justify-end">
          <Button variant="slate-outline" onClick={handleCancel} size="md">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="coral"
            size="md"
            disabled={!isValid}
            form="period-selector-form"
            title={!hasValidPeriodSelection ? 'Please select a period first' : undefined}
          >
            Apply
          </Button>
        </div>
      </Drawer.Footer>
    </Drawer>
  );
};
