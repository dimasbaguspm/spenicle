import { LineProgress } from '../../../../../components';

interface FormProgressProps {
  currentStep: number;
  totalSteps: number;
  progress: number;
}

export function FormProgress({ currentStep, totalSteps, progress }: FormProgressProps) {
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-medium text-slate-600">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm text-slate-500">{Math.round(progress)}% Complete</span>
      </div>
      <LineProgress value={progress} variant="coral" size="md" />
    </div>
  );
}
