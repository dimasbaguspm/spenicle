import { Button } from '../button';

import { Tooltip } from './tooltip';

export function TooltipDemo() {
  return (
    <div className="p-8 space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-600 mb-4">Tooltip Showcase</h2>
        <p className="text-slate-500 mb-8">Hover or focus on the elements below to see tooltips in action</p>
      </div>

      {/* Basic Tooltips */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-slate-600">Basic Tooltips</h3>
        <div className="flex gap-4 flex-wrap">
          <Tooltip placement="top">
            <Tooltip.Trigger>
              <Button variant="coral">Hover me (Top)</Button>
            </Tooltip.Trigger>
            <Tooltip.Content>This is a top tooltip</Tooltip.Content>
          </Tooltip>

          <Tooltip placement="bottom">
            <Tooltip.Trigger>
              <Button variant="sage">Hover me (Bottom)</Button>
            </Tooltip.Trigger>
            <Tooltip.Content>This is a bottom tooltip</Tooltip.Content>
          </Tooltip>

          <Tooltip placement="left">
            <Tooltip.Trigger>
              <Button variant="mist">Hover me (Left)</Button>
            </Tooltip.Trigger>
            <Tooltip.Content>This is a left tooltip</Tooltip.Content>
          </Tooltip>

          <Tooltip placement="right">
            <Tooltip.Trigger>
              <Button variant="slate">Hover me (Right)</Button>
            </Tooltip.Trigger>
            <Tooltip.Content>This is a right tooltip</Tooltip.Content>
          </Tooltip>
        </div>
      </div>

      {/* Color Variants */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-slate-600">Color Variants</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Tooltip>
            <Tooltip.Trigger>
              <Button variant="coral-outline">Default</Button>
            </Tooltip.Trigger>
            <Tooltip.Content variant="default">Default slate tooltip</Tooltip.Content>
          </Tooltip>

          <Tooltip>
            <Tooltip.Trigger>
              <Button variant="coral">Coral</Button>
            </Tooltip.Trigger>
            <Tooltip.Content variant="coral">Coral themed tooltip</Tooltip.Content>
          </Tooltip>

          <Tooltip>
            <Tooltip.Trigger>
              <Button variant="sage">Sage</Button>
            </Tooltip.Trigger>
            <Tooltip.Content variant="sage">Sage themed tooltip</Tooltip.Content>
          </Tooltip>

          <Tooltip>
            <Tooltip.Trigger>
              <Button variant="mist">Mist</Button>
            </Tooltip.Trigger>
            <Tooltip.Content variant="mist">Mist themed tooltip</Tooltip.Content>
          </Tooltip>
        </div>
      </div>

      {/* Light Variants */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-slate-600">Light Variants</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Tooltip>
            <Tooltip.Trigger>
              <Button variant="coral-outline">Light</Button>
            </Tooltip.Trigger>
            <Tooltip.Content variant="light">Light tooltip with dark text</Tooltip.Content>
          </Tooltip>

          <Tooltip>
            <Tooltip.Trigger>
              <Button variant="coral-outline">Coral Light</Button>
            </Tooltip.Trigger>
            <Tooltip.Content variant="coral-light">Light coral tooltip</Tooltip.Content>
          </Tooltip>

          <Tooltip>
            <Tooltip.Trigger>
              <Button variant="sage-outline">Sage Light</Button>
            </Tooltip.Trigger>
            <Tooltip.Content variant="sage-light">Light sage tooltip</Tooltip.Content>
          </Tooltip>

          <Tooltip>
            <Tooltip.Trigger>
              <Button variant="mist-outline">Mist Light</Button>
            </Tooltip.Trigger>
            <Tooltip.Content variant="mist-light">Light mist tooltip</Tooltip.Content>
          </Tooltip>
        </div>
      </div>

      {/* Semantic Variants */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-slate-600">Semantic Variants</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Tooltip>
            <Tooltip.Trigger>
              <Button variant="success">Success</Button>
            </Tooltip.Trigger>
            <Tooltip.Content variant="success">✅ Operation completed successfully</Tooltip.Content>
          </Tooltip>

          <Tooltip>
            <Tooltip.Trigger>
              <Button variant="info">Info</Button>
            </Tooltip.Trigger>
            <Tooltip.Content variant="info">ℹ️ This is helpful information</Tooltip.Content>
          </Tooltip>

          <Tooltip>
            <Tooltip.Trigger>
              <Button variant="warning">Warning</Button>
            </Tooltip.Trigger>
            <Tooltip.Content variant="warning">⚠️ Please review your budget</Tooltip.Content>
          </Tooltip>

          <Tooltip>
            <Tooltip.Trigger>
              <Button variant="danger">Danger</Button>
            </Tooltip.Trigger>
            <Tooltip.Content variant="danger">🚨 This action cannot be undone</Tooltip.Content>
          </Tooltip>
        </div>
      </div>

      {/* Interactive Elements */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-slate-600">Interactive Elements</h3>
        <div className="space-y-4">
          <div className="flex gap-4 items-center">
            <Tooltip>
              <Tooltip.Trigger>
                <span className="text-slate-600 cursor-help underline decoration-dotted">What is Spendless?</span>
              </Tooltip.Trigger>
              <Tooltip.Content variant="light">
                Spendless is a beautiful financial app to help you track expenses and manage your budget effectively.
              </Tooltip.Content>
            </Tooltip>
          </div>

          <div className="flex gap-4 items-center">
            <Tooltip placement="right">
              <Tooltip.Trigger>
                <input
                  type="text"
                  placeholder="Focus me for tooltip"
                  className="px-3 py-2 border border-mist-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral-300"
                />
              </Tooltip.Trigger>
              <Tooltip.Content variant="info">💡 Start typing to enter your expense amount</Tooltip.Content>
            </Tooltip>
          </div>

          <div className="flex gap-4 items-center">
            <Tooltip placement="bottom">
              <Tooltip.Trigger>
                <div className="w-12 h-12 bg-sage-500 rounded-full cursor-pointer flex items-center justify-center text-white font-bold">
                  $
                </div>
              </Tooltip.Trigger>
              <Tooltip.Content variant="sage">💰 Your current balance: $1,234.56</Tooltip.Content>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
