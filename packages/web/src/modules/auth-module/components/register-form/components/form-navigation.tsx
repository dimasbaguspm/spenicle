import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '../../../../../components';

interface FormNavigationProps {
  currentStep: number;
  totalSteps: number;
  isCurrentStepValid: () => boolean;
  isPending: boolean;
  onPrevStep: () => void;
  onNextStep: () => void;
}

export function FormNavigation({
  currentStep,
  totalSteps,
  isCurrentStepValid,
  isPending,
  onPrevStep,
  onNextStep,
}: FormNavigationProps) {
  return (
    <div className="flex justify-between pt-6">
      <div>
        {currentStep > 1 && (
          <Button type="button" variant="outline" size="lg" onClick={onPrevStep} iconLeft={<ChevronLeft size={20} />}>
            Previous
          </Button>
        )}
      </div>
      <div>
        {currentStep < totalSteps ? (
          <Button
            type="button"
            variant="coral"
            size="lg"
            onClick={onNextStep}
            disabled={!isCurrentStepValid()}
            iconRight={<ChevronRight size={20} />}
          >
            Next Step
          </Button>
        ) : (
          <Button
            type="submit"
            variant="coral"
            size="lg"
            disabled={!isCurrentStepValid() || isPending}
            busy={isPending}
          >
            {isPending ? 'Creating Account...' : 'Create Account'}
          </Button>
        )}
      </div>
    </div>
  );
}
