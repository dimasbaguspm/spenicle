import { cn } from '../../libs/utils';
import { Button } from '../button';

import { useTimePickerContext } from './time-picker-context';

interface TimePickerFooterProps {
  className?: string;
  showNowButton?: boolean;
  showClearButton?: boolean;
  nowButtonText?: string;
  clearButtonText?: string;
}

export function TimePickerFooter({
  className,
  showNowButton = true,
  showClearButton = true,
  nowButtonText = 'Now',
  clearButtonText = 'Clear',
}: TimePickerFooterProps) {
  const { step, onTimeSelect, onConfirm, onNextStep } = useTimePickerContext();

  const handleNowClick = () => {
    const now = new Date();
    onTimeSelect({ hour: now.getHours(), minute: now.getMinutes() });
  };

  const handleClearClick = () => {
    onTimeSelect(null);
  };

  const handleNextOrDone = () => {
    if (step === 'hour') {
      onNextStep();
    } else {
      onConfirm();
    }
  };

  return (
    <div className={cn('flex items-center justify-between p-3 border-t border-mist-200 bg-cream-50', className)}>
      <div className="flex gap-2">
        {showNowButton && (
          <Button variant="success-ghost" size="sm" onClick={handleNowClick} className="text-xs">
            {nowButtonText}
          </Button>
        )}

        {showClearButton && (
          <Button variant="ghost" size="sm" onClick={handleClearClick} className="text-xs">
            {clearButtonText}
          </Button>
        )}
      </div>

      <Button variant="coral" size="sm" onClick={handleNextOrDone} className="text-xs">
        {step === 'hour' ? 'Next' : 'Done'}
      </Button>
    </div>
  );
}
