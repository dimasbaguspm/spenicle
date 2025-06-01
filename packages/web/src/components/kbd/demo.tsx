import { Kbd } from '.';

export function KbdDemo() {
  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Keyboard Keys</h2>

        <div className="space-y-4">
          {/* Sizes */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Sizes</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Kbd size="sm">⌘</Kbd>
              <Kbd size="md">Ctrl</Kbd>
              <Kbd size="lg">Shift</Kbd>
              <Kbd size="xl">Enter</Kbd>
            </div>
          </div>

          {/* Core Variants */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Core Variants</h3>
            <div className="flex flex-wrap gap-2">
              <Kbd variant="default">⌘</Kbd>
              <Kbd variant="secondary">Ctrl</Kbd>
              <Kbd variant="outline">Alt</Kbd>
              <Kbd variant="ghost">Tab</Kbd>
            </div>
          </div>

          {/* Core Color Variants */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Core Colors</h3>
            <div className="flex flex-wrap gap-2">
              <Kbd variant="coral">⌘</Kbd>
              <Kbd variant="sage">Ctrl</Kbd>
              <Kbd variant="mist">Alt</Kbd>
              <Kbd variant="slate">Tab</Kbd>
            </div>
          </div>

          {/* Outline Variants */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Outline Variants</h3>
            <div className="flex flex-wrap gap-2">
              <Kbd variant="coral-outline">⌘</Kbd>
              <Kbd variant="sage-outline">Ctrl</Kbd>
              <Kbd variant="mist-outline">Alt</Kbd>
              <Kbd variant="slate-outline">Tab</Kbd>
            </div>
          </div>

          {/* Ghost Variants */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Ghost Variants</h3>
            <div className="flex flex-wrap gap-2">
              <Kbd variant="coral-ghost">⌘</Kbd>
              <Kbd variant="sage-ghost">Ctrl</Kbd>
              <Kbd variant="mist-ghost">Alt</Kbd>
              <Kbd variant="slate-ghost">Tab</Kbd>
            </div>
          </div>

          {/* Semantic Variants - Solid */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Semantic - Solid</h3>
            <div className="flex flex-wrap gap-2">
              <Kbd variant="success">✓</Kbd>
              <Kbd variant="info">i</Kbd>
              <Kbd variant="warning">!</Kbd>
              <Kbd variant="danger">✗</Kbd>
            </div>
          </div>

          {/* Semantic Variants - Outline */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Semantic - Outline</h3>
            <div className="flex flex-wrap gap-2">
              <Kbd variant="success-outline">✓</Kbd>
              <Kbd variant="info-outline">i</Kbd>
              <Kbd variant="warning-outline">!</Kbd>
              <Kbd variant="danger-outline">✗</Kbd>
            </div>
          </div>

          {/* Semantic Variants - Ghost */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Semantic - Ghost</h3>
            <div className="flex flex-wrap gap-2">
              <Kbd variant="success-ghost">✓</Kbd>
              <Kbd variant="info-ghost">i</Kbd>
              <Kbd variant="warning-ghost">!</Kbd>
              <Kbd variant="danger-ghost">✗</Kbd>
            </div>
          </div>

          {/* Use Cases */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Use Cases</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Quick save:</span>
                <Kbd>⌘</Kbd>
                <span className="text-gray-400">+</span>
                <Kbd>S</Kbd>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Copy:</span>
                <Kbd variant="sage">Ctrl</Kbd>
                <span className="text-gray-400">+</span>
                <Kbd variant="sage">C</Kbd>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Paste:</span>
                <Kbd variant="mist">Ctrl</Kbd>
                <span className="text-gray-400">+</span>
                <Kbd variant="mist">V</Kbd>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Undo:</span>
                <Kbd variant="coral">Ctrl</Kbd>
                <span className="text-gray-400">+</span>
                <Kbd variant="coral">Z</Kbd>
              </div>
            </div>
          </div>

          {/* Keyboard Navigation */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Navigation</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Navigate:</span>
                <Kbd variant="outline">↑</Kbd>
                <Kbd variant="outline">↓</Kbd>
                <Kbd variant="outline">←</Kbd>
                <Kbd variant="outline">→</Kbd>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Tab navigation:</span>
                <Kbd variant="ghost">Tab</Kbd>
                <span className="text-gray-400">/</span>
                <Kbd variant="ghost">Shift</Kbd>
                <span className="text-gray-400">+</span>
                <Kbd variant="ghost">Tab</Kbd>
              </div>
            </div>
          </div>

          {/* Financial App Shortcuts */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Financial App Shortcuts</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Add transaction:</span>
                <Kbd variant="success">N</Kbd>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Search transactions:</span>
                <Kbd variant="info">/</Kbd>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Filter by category:</span>
                <Kbd variant="warning">F</Kbd>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Delete transaction:</span>
                <Kbd variant="danger">Del</Kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
