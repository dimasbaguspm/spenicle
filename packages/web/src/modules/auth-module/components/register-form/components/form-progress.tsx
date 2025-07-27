import { ProgressIndicator } from '@dimasbaguspm/versaur/feedbacks';
import { Text } from '@dimasbaguspm/versaur/primitive';

interface FormProgressProps {
  currentStep: number;
  totalSteps: number;
  progress: number;
}

export function FormProgress({ currentStep, totalSteps, progress }: FormProgressProps) {
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <Text as="span" color="gray" fontSize="sm" fontWeight="medium">
          Step {currentStep} of {totalSteps}
        </Text>
        <Text as="span" color="gray" fontSize="sm" fontWeight="medium">
          {Math.round(progress)}% Complete
        </Text>
      </div>
      <ProgressIndicator value={progress} color="primary" />
    </div>
  );
}
