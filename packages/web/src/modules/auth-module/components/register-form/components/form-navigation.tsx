import { Button, Icon } from '@dimasbaguspm/versaur/primitive';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
          <Button type="button" variant="outline" size="md" onClick={onPrevStep}>
            <Icon as={ChevronLeft} size="md" color="ghost" />
            Previous
          </Button>
        )}
      </div>
      <div>
        {currentStep < totalSteps ? (
          <Button type="button" size="md" onClick={onNextStep} disabled={!isCurrentStepValid()}>
            Next Step
            <Icon as={ChevronRight} size="md" color="neutral" />
          </Button>
        ) : (
          <Button type="submit" size="md" disabled={!isCurrentStepValid() || isPending}>
            {isPending ? 'Creating Account...' : 'Create Account'}
          </Button>
        )}
      </div>
    </div>
  );
}
