import { useState } from 'react';

import { Button } from '../button';

import { LineProgress } from '.';

export function LineProgressDemo() {
  const [progress, setProgress] = useState(75);
  const [stripedProgress, setStripedProgress] = useState(45);

  const incrementProgress = () => {
    setProgress((prev) => Math.min(prev + 10, 100));
  };

  const decrementProgress = () => {
    setProgress((prev) => Math.max(prev - 10, 0));
  };

  const resetProgress = () => {
    setProgress(0);
  };

  const incrementStriped = () => {
    setStripedProgress((prev) => Math.min(prev + 15, 100));
  };

  const decrementStriped = () => {
    setStripedProgress((prev) => Math.max(prev - 15, 0));
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-mist-200 mb-6">
      <h2 className="text-lg font-semibold text-slate-600 mb-6">Line Progress</h2>

      <div className="space-y-8">
        {/* Interactive Demo */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Interactive Demo</h3>
          <div className="space-y-4">
            <LineProgress value={progress} variant="coral" size="lg" showValue showLabel label="Budget Progress" />
            <div className="flex justify-center space-x-2">
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
          <div className="space-y-3">
            <div>
              <div className="text-xs text-slate-400 mb-1">Extra Small (xs)</div>
              <LineProgress value={65} variant="coral" size="xs" />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Small (sm)</div>
              <LineProgress value={75} variant="sage" size="sm" />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Medium (md)</div>
              <LineProgress value={85} variant="mist" size="md" />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Large (lg)</div>
              <LineProgress value={95} variant="slate" size="lg" />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Extra Large (xl)</div>
              <LineProgress value={55} variant="coral" size="xl" />
            </div>
          </div>
        </div>

        {/* Core Color Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Core Colors</h3>
          <div className="space-y-3">
            <LineProgress value={80} variant="coral" size="md" showValue showLabel label="Coral (Primary)" />
            <LineProgress value={65} variant="sage" size="md" showValue showLabel label="Sage (Secondary)" />
            <LineProgress value={90} variant="mist" size="md" showValue showLabel label="Mist (Tertiary)" />
            <LineProgress value={45} variant="slate" size="md" showValue showLabel label="Slate (Ghost)" />
          </div>
        </div>

        {/* Semantic Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Semantic Colors</h3>
          <div className="space-y-3">
            <LineProgress value={85} variant="success" size="md" showValue showLabel label="Payment Completed" />
            <LineProgress value={60} variant="info" size="md" showValue showLabel label="Account Update" />
            <LineProgress value={30} variant="warning" size="md" showValue showLabel label="Low Balance Alert" />
            <LineProgress value={15} variant="danger" size="md" showValue showLabel label="Transaction Failed" />
          </div>
        </div>

        {/* Striped Variant */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Striped Progress</h3>
          <div className="space-y-4">
            <LineProgress
              value={stripedProgress}
              variant="sage"
              size="lg"
              showValue
              showLabel
              label="Savings Goal"
              striped
            />
            <div className="flex justify-center space-x-2">
              <Button onClick={incrementStriped} variant="sage" size="sm">
                +15%
              </Button>
              <Button onClick={decrementStriped} variant="mist" size="sm">
                -15%
              </Button>
            </div>
          </div>
        </div>

        {/* Indeterminate Progress */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Indeterminate Progress</h3>
          <div className="space-y-3">
            <LineProgress
              value={0}
              variant="coral"
              size="md"
              showLabel
              label="Processing Transaction..."
              indeterminate
            />
            <LineProgress value={0} variant="info" size="sm" showLabel label="Syncing Data..." indeterminate />
          </div>
        </div>

        {/* Custom Content */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">With Custom Content</h3>
          <LineProgress value={72} variant="success" size="lg" showValue showLabel label="Monthly Budget">
            <span className="text-xs text-success-600">$720 of $1,000 spent</span>
          </LineProgress>
        </div>

        {/* Financial Use Cases */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Financial App Examples</h3>
          <div className="space-y-4">
            <div className="bg-cream-50 p-4 rounded-lg space-y-3">
              <LineProgress value={67} variant="coral" size="md" showValue showLabel label="Monthly Spending">
                <span className="text-xs text-coral-600">$670 of $1,000 budget</span>
              </LineProgress>

              <LineProgress value={23} variant="sage" size="md" showValue showLabel label="Savings Goal">
                <span className="text-xs text-sage-600">$2,300 of $10,000 goal</span>
              </LineProgress>

              <LineProgress value={89} variant="warning" size="md" showValue showLabel label="Credit Utilization">
                <span className="text-xs text-warning-600">$890 of $1,000 limit</span>
              </LineProgress>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
