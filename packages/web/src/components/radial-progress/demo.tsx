import { useState } from 'react';

import { Button } from '../button';

import { RadialProgress } from '.';

export function RadialProgressDemo() {
  const [progress, setProgress] = useState(75);

  const incrementProgress = () => {
    setProgress((prev) => Math.min(prev + 10, 100));
  };

  const decrementProgress = () => {
    setProgress((prev) => Math.max(prev - 10, 0));
  };

  const resetProgress = () => {
    setProgress(0);
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-mist-200 mb-6">
      <h2 className="text-lg font-semibold text-slate-600 mb-6">Radial Progress</h2>

      <div className="space-y-8">
        {/* Interactive Demo */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Interactive Demo</h3>
          <div className="flex items-center justify-center space-x-8">
            <RadialProgress value={progress} variant="coral" size="xl" />
            <div className="flex flex-col space-y-2">
              <Button onClick={incrementProgress} variant="sage" size="sm">
                +10%
              </Button>
              <Button onClick={decrementProgress} variant="mist" size="sm">
                -10%
              </Button>
              <Button onClick={resetProgress} variant="slate-outline" size="sm">
                Reset
              </Button>
            </div>
          </div>
        </div>

        {/* Sizes */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Sizes</h3>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="text-center">
              <RadialProgress value={65} variant="coral" size="sm" />
              <p className="text-xs text-slate-500 mt-2">Small</p>
            </div>
            <div className="text-center">
              <RadialProgress value={75} variant="coral" size="md" />
              <p className="text-xs text-slate-500 mt-2">Medium</p>
            </div>
            <div className="text-center">
              <RadialProgress value={85} variant="coral" size="lg" />
              <p className="text-xs text-slate-500 mt-2">Large</p>
            </div>
            <div className="text-center">
              <RadialProgress value={95} variant="coral" size="xl" />
              <p className="text-xs text-slate-500 mt-2">Extra Large</p>
            </div>
          </div>
        </div>

        {/* Core Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Core Variants</h3>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="text-center">
              <RadialProgress value={80} variant="coral" size="lg" />
              <p className="text-xs text-slate-500 mt-2">Coral (Primary)</p>
            </div>
            <div className="text-center">
              <RadialProgress value={65} variant="sage" size="lg" />
              <p className="text-xs text-slate-500 mt-2">Sage (Secondary)</p>
            </div>
            <div className="text-center">
              <RadialProgress value={45} variant="mist" size="lg" />
              <p className="text-xs text-slate-500 mt-2">Mist (Tertiary)</p>
            </div>
            <div className="text-center">
              <RadialProgress value={30} variant="slate" size="lg" />
              <p className="text-xs text-slate-500 mt-2">Slate (Ghost)</p>
            </div>
          </div>
        </div>

        {/* Semantic Variants for Financial App */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Financial Status Indicators</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <RadialProgress value={90} variant="success" size="lg" />
              <p className="text-xs text-slate-500 mt-2">✅ Budget Goal</p>
              <p className="text-xs text-success-600 font-medium">90% achieved</p>
            </div>
            <div className="text-center">
              <RadialProgress value={70} variant="info" size="lg" />
              <p className="text-xs text-slate-500 mt-2">ℹ️ Account Status</p>
              <p className="text-xs text-info-600 font-medium">70% utilized</p>
            </div>
            <div className="text-center">
              <RadialProgress value={85} variant="warning" size="lg" />
              <p className="text-xs text-slate-500 mt-2">⚠️ Spending Alert</p>
              <p className="text-xs text-warning-600 font-medium">85% of budget</p>
            </div>
            <div className="text-center">
              <RadialProgress value={95} variant="danger" size="lg" />
              <p className="text-xs text-slate-500 mt-2">🚨 Credit Limit</p>
              <p className="text-xs text-danger-600 font-medium">95% reached</p>
            </div>
          </div>
        </div>

        {/* Custom Content */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Custom Content</h3>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="text-center">
              <RadialProgress value={60} variant="sage" size="xl" showValue={false}>
                <div className="text-center">
                  <div className="text-lg font-bold text-sage-600">$2.4K</div>
                  <div className="text-xs text-slate-500">Saved</div>
                </div>
              </RadialProgress>
              <p className="text-xs text-slate-500 mt-2">Savings Goal</p>
            </div>
            <div className="text-center">
              <RadialProgress value={25} variant="coral" size="xl" showValue={false}>
                <div className="text-center">
                  <div className="text-lg font-bold text-coral-600">7</div>
                  <div className="text-xs text-slate-500">Days</div>
                </div>
              </RadialProgress>
              <p className="text-xs text-slate-500 mt-2">Bill Due</p>
            </div>
            <div className="text-center">
              <RadialProgress value={40} variant="mist" size="xl" showValue={false}>
                <div className="text-center">
                  <div className="text-lg font-bold text-mist-600">42%</div>
                  <div className="text-xs text-slate-500">Complete</div>
                </div>
              </RadialProgress>
              <p className="text-xs text-slate-500 mt-2">Investment Plan</p>
            </div>
          </div>
        </div>

        {/* Animation Toggle */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Animation Examples</h3>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="text-center">
              <RadialProgress value={progress} variant="coral" size="lg" animated={true} />
              <p className="text-xs text-slate-500 mt-2">Animated</p>
            </div>
            <div className="text-center">
              <RadialProgress value={progress} variant="sage" size="lg" animated={false} />
              <p className="text-xs text-slate-500 mt-2">Static</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
