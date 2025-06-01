import { useState } from 'react';

import { Numpad } from './numpad';

export default function NumpadDemo() {
  const [value, setValue] = useState('');
  const [variant, setVariant] = useState<'default' | 'coral' | 'sage' | 'mist' | 'slate'>('default');
  const [size, setSize] = useState<'sm' | 'md' | 'lg'>('md');

  const handleNumberPress = (number: string) => {
    setValue((prev) => prev + number);
  };

  const handleDecimalPress = () => {
    if (!value.includes('.')) {
      setValue((prev) => prev + '.');
    }
  };

  const handleBackspace = () => {
    setValue((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setValue('');
  };

  const handleEnter = () => {
    alert(`Entered value: ${value}`);
  };

  return (
    <div className="p-8 space-y-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-6 text-center">Numpad Component Demo</h1>

        {/* Display */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Current Value:</label>
          <div className="w-full p-4 text-right text-xl font-mono bg-white border border-mist-200 rounded-lg shadow-sm">
            {value || '0'}
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Variant:</label>
            <select
              value={variant}
              onChange={(e) => setVariant(e.target.value as 'default' | 'coral' | 'sage' | 'mist' | 'slate')}
              className="w-full p-2 border border-mist-200 rounded-md"
            >
              <option value="default">Default</option>
              <option value="coral">Coral</option>
              <option value="sage">Sage</option>
              <option value="mist">Mist</option>
              <option value="slate">Slate</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Size:</label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value as 'sm' | 'md' | 'lg')}
              className="w-full p-2 border border-mist-200 rounded-md"
            >
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
            </select>
          </div>
        </div>

        {/* Numpad */}
        <Numpad
          size={size}
          variant={variant}
          buttonVariant={variant}
          onNumberPress={handleNumberPress}
          onDecimalPress={handleDecimalPress}
          onBackspace={handleBackspace}
          onClear={handleClear}
          onEnter={handleEnter}
          showDecimal={true}
          showClear={true}
          showEnter={true}
        />

        {/* Examples */}
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Usage Examples</h2>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-700">Basic Numpad</h3>
            <Numpad
              size="sm"
              onNumberPress={(num) => {
                // Handle number press
                setValue((prev) => prev + num);
              }}
              onEnter={() => {
                // Handle enter
                alert(`Demo: Enter pressed with value: ${value}`);
              }}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-700">Coral Theme (No Decimal)</h3>
            <Numpad
              variant="coral"
              buttonVariant="coral"
              size="sm"
              showDecimal={false}
              onNumberPress={(num) => {
                // Handle number in coral demo
                setValue((prev) => prev + num);
              }}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-700">Sage Theme (Simple)</h3>
            <Numpad
              variant="sage"
              buttonVariant="sage"
              size="sm"
              showClear={false}
              showEnter={false}
              onNumberPress={(num) => {
                // Handle number in sage demo
                setValue((prev) => prev + num);
              }}
              onBackspace={() => {
                // Handle backspace in sage demo
                setValue((prev) => prev.slice(0, -1));
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
