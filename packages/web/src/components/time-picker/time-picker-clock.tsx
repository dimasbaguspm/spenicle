import { cn } from '../../libs/utils';

import { useTimePickerContext } from './time-picker-context';

interface TimePickerClockProps {
  className?: string;
}

export function TimePickerClock({ className }: TimePickerClockProps) {
  const {
    pendingTime,
    step,
    onHourSelect,
    onMinuteSelect,
    onNextStep,
    onPreviousStep,
    is24Hour = false,
  } = useTimePickerContext();

  const currentHour = pendingTime?.hour ?? 0;
  const currentMinute = pendingTime?.minute ?? 0;

  // Generate hour numbers based on 12/24 hour format
  const hours = is24Hour
    ? Array.from({ length: 24 }, (_, i) => i)
    : Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i));

  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  const handleHourClick = (hour: number) => {
    // Convert 12-hour to 24-hour if needed
    let adjustedHour = hour;
    if (!is24Hour && hour === 12) {
      adjustedHour = currentHour >= 12 ? 12 : 0;
    } else if (!is24Hour && currentHour >= 12 && hour !== 12) {
      adjustedHour = hour + 12;
    }

    onHourSelect(adjustedHour);
  };

  const handleMinuteClick = (minute: number) => {
    onMinuteSelect(minute);
  };

  const handleClockFaceClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (step !== 'minute') return;

    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = event.clientX - centerX;
    const y = event.clientY - centerY;

    // Calculate angle from center
    let angle = Math.atan2(y, x) * (180 / Math.PI);
    angle = (angle + 90 + 360) % 360; // Normalize to 0-360, with 0 at top

    // Convert angle to minute (0-59)
    const minute = Math.round(angle / 6) % 60;
    onMinuteSelect(minute);
  };

  const renderClockNumbers = (
    numbers: number[],
    selectedValue: number,
    onClick: (value: number) => void,
    isHour = false
  ) => {
    return numbers.map((num, index) => {
      const angle = index * (360 / numbers.length) - 90;
      const radius = 80;
      const x = Math.cos((angle * Math.PI) / 180) * radius;
      const y = Math.sin((angle * Math.PI) / 180) * radius;

      let displayNum = num;
      if (isHour && !is24Hour) {
        displayNum = num === 0 ? 12 : num;
      }

      let isSelected = false;
      if (isHour) {
        if (is24Hour) {
          isSelected = selectedValue === num;
        } else {
          const displayHour = selectedValue === 0 ? 12 : selectedValue > 12 ? selectedValue - 12 : selectedValue;
          isSelected = displayHour === displayNum;
        }
      } else {
        isSelected = selectedValue === num;
      }

      return (
        <button
          key={`${isHour ? 'hour' : 'minute'}-${num}`}
          className={cn(
            'absolute w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
            'hover:bg-coral-100 focus:outline-none focus:ring-2 focus:ring-coral-300',
            isSelected ? 'bg-coral-500 text-white' : 'text-slate-700 hover:text-coral-600'
          )}
          style={{
            transform: `translate(${x}px, ${y}px)`,
            left: '50%',
            top: '50%',
            marginLeft: '-16px',
            marginTop: '-16px',
          }}
          onClick={() => onClick(num)}
        >
          {displayNum.toString().padStart(2, '0')}
        </button>
      );
    });
  };

  return (
    <div className={cn('p-6', className)}>
      {/* Time display - clickable to navigate between steps */}
      <div className="flex justify-center items-center mb-6 space-x-4">
        <div className="text-4xl font-light text-slate-700">
          <button
            onClick={() => (step === 'minute' ? onPreviousStep() : undefined)}
            className={cn(
              'transition-colors focus:outline-none focus:ring-2 focus:ring-coral-300 rounded px-1',
              step === 'hour' ? 'text-coral-500' : 'text-slate-700 hover:text-coral-400 cursor-pointer'
            )}
          >
            {currentHour.toString().padStart(2, '0')}
          </button>
          <span className="mx-1">:</span>
          <button
            onClick={() => (step === 'hour' ? onNextStep() : undefined)}
            className={cn(
              'transition-colors focus:outline-none focus:ring-2 focus:ring-coral-300 rounded px-1',
              step === 'minute' ? 'text-coral-500' : 'text-slate-700 hover:text-coral-400 cursor-pointer'
            )}
          >
            {currentMinute.toString().padStart(2, '0')}
          </button>
        </div>

        {/* AM/PM selector for 12-hour format */}
        {!is24Hour && (
          <div className="flex flex-col space-y-1">
            <button
              className={cn(
                'px-2 py-1 rounded text-xs font-medium transition-colors min-w-[32px]',
                'focus:outline-none focus:ring-1 focus:ring-coral-300',
                currentHour < 12 ? 'bg-coral-500 text-white' : 'bg-mist-100 text-slate-700 hover:bg-mist-200'
              )}
              onClick={() => {
                const newHour = currentHour >= 12 ? currentHour - 12 : currentHour;
                onHourSelect(newHour);
              }}
            >
              AM
            </button>
            <button
              className={cn(
                'px-2 py-1 rounded text-xs font-medium transition-colors min-w-[32px]',
                'focus:outline-none focus:ring-1 focus:ring-coral-300',
                currentHour >= 12 ? 'bg-coral-500 text-white' : 'bg-mist-100 text-slate-700 hover:bg-mist-200'
              )}
              onClick={() => {
                const newHour = currentHour < 12 ? currentHour + 12 : currentHour;
                onHourSelect(newHour);
              }}
            >
              PM
            </button>
          </div>
        )}
      </div>

      {/* Clock face */}
      <div
        className="relative w-48 h-48 mx-auto mb-6"
        onClick={handleClockFaceClick}
        style={{ cursor: step === 'minute' ? 'pointer' : 'default' }}
      >
        {/* Clock circle */}
        <div className="absolute inset-0 rounded-full border-2 border-mist-200"></div>

        {/* Minute hand indicator - shows exact minute position */}
        {step === 'minute' && (
          <div
            className="absolute w-0.5 bg-sage-500 origin-bottom z-5"
            style={{
              height: '70px', // Length of the minute hand
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -100%) rotate(${currentMinute * 6}deg)`, // 6 degrees per minute, starting from 12 o'clock
              transformOrigin: 'bottom center',
            }}
          />
        )}

        {/* Hour hand indicator - shows exact hour position */}
        {step === 'hour' && (
          <div
            className="absolute w-0.5 bg-coral-500 origin-bottom z-5"
            style={{
              height: '50px', // Shorter length for hour hand
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -100%) rotate(${(currentHour % 12) * 30}deg)`, // 30 degrees per hour, starting from 12 o'clock
              transformOrigin: 'bottom center',
            }}
          />
        )}

        {/* Clock center dot */}
        <div
          className={cn(
            'absolute w-2 h-2 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10',
            step === 'hour' ? 'bg-coral-500' : 'bg-sage-500'
          )}
        ></div>

        {/* Numbers based on current step */}
        {step === 'hour'
          ? renderClockNumbers(hours, currentHour, handleHourClick, true)
          : renderClockNumbers(minutes, currentMinute, handleMinuteClick)}
      </div>
    </div>
  );
}
