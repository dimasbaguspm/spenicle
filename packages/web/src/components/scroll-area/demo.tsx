import { Button } from '../button';

import { ScrollArea } from './scroll-area';

export function ScrollAreaDemo() {
  const generateContent = (lines: number) => {
    return Array.from({ length: lines }, (_, i) => (
      <div key={i} className={`p-3 border-b border-gray-200 ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
        <h4 className="font-medium text-slate-700">Item {i + 1}</h4>
        <p className="text-sm text-slate-500 mt-1">
          This is some sample content for item {i + 1}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
      </div>
    ));
  };

  const generateWideContent = () => {
    return (
      <div className="flex gap-4 p-4 min-w-[800px]">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex-shrink-0 w-48 p-4 bg-white border border-gray-200 rounded-lg">
            <h4 className="font-medium text-slate-700">Card {i + 1}</h4>
            <p className="text-sm text-slate-500 mt-2">
              This is a wide card that requires horizontal scrolling to view completely.
            </p>
            <Button variant="coral" size="sm" className="mt-3">
              Action
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-8 space-y-8 max-w-6xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Scroll Area Component</h2>
        <p className="text-slate-600 mb-8">
          A customizable scroll area component with smooth scrolling, consistent scrollbar placement, and support for
          both vertical and horizontal scrolling.
        </p>
      </div>

      <div className="space-y-8">
        {/* Basic Vertical Scrolling */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-700">Basic Vertical Scrolling</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-slate-600">Default (hover to show scrollbar)</p>
              <ScrollArea className="h-64 border border-gray-200 rounded-lg">{generateContent(20)}</ScrollArea>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-slate-600">Always visible scrollbar</p>
              <ScrollArea type="always" className="h-64 border border-gray-200 rounded-lg">
                {generateContent(20)}
              </ScrollArea>
            </div>
          </div>
        </div>

        {/* Horizontal Scrolling */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-700">Horizontal Scrolling</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-slate-600">Horizontal scroll with cards</p>
              <ScrollArea orientation="horizontal" type="always" className="w-full border border-gray-200 rounded-lg">
                {generateWideContent()}
              </ScrollArea>
            </div>
          </div>
        </div>

        {/* Both Directions */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-700">Both Directions</h3>
          <div className="space-y-2">
            <p className="text-sm text-slate-600">Scroll both vertically and horizontally</p>
            <ScrollArea orientation="both" type="auto" className="h-64 border border-gray-200 rounded-lg">
              <div className="min-w-[800px] min-h-[600px] p-4">
                <div className="grid grid-cols-4 gap-4">
                  {Array.from({ length: 20 }, (_, i) => (
                    <div key={i} className="w-48 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <h4 className="font-medium text-slate-700">Cell {i + 1}</h4>
                      <p className="text-sm text-slate-500 mt-2">
                        This content requires both vertical and horizontal scrolling to view completely.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Color Variants */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-700">Color Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-slate-600">🔥 Coral Theme</p>
              <ScrollArea
                variant="coral"
                colorScheme="coral"
                type="always"
                className="h-48 border border-coral-200 rounded-lg"
              >
                {generateContent(12)}
              </ScrollArea>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-slate-600">🌿 Sage Theme</p>
              <ScrollArea
                variant="sage"
                colorScheme="sage"
                type="always"
                className="h-48 border border-sage-200 rounded-lg"
              >
                {generateContent(12)}
              </ScrollArea>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-slate-600">🌫️ Mist Theme</p>
              <ScrollArea
                variant="mist"
                colorScheme="mist"
                type="always"
                className="h-48 border border-mist-200 rounded-lg"
              >
                {generateContent(12)}
              </ScrollArea>
            </div>
          </div>
        </div>

        {/* Scroll Types */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-700">Scroll Types</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Auto (appears on scroll, fades out)</p>
                <ScrollArea type="auto" className="h-48 border border-gray-200 rounded-lg">
                  {generateContent(15)}
                </ScrollArea>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Hover (appears on hover)</p>
                <ScrollArea type="hover" className="h-48 border border-gray-200 rounded-lg">
                  {generateContent(15)}
                </ScrollArea>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Always visible</p>
                <ScrollArea type="always" className="h-48 border border-gray-200 rounded-lg">
                  {generateContent(15)}
                </ScrollArea>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Scroll (native behavior)</p>
                <ScrollArea type="scroll" className="h-48 border border-gray-200 rounded-lg">
                  {generateContent(15)}
                </ScrollArea>
              </div>
            </div>
          </div>
        </div>

        {/* Thumb Sizes */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-700">Thumb Sizes</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-slate-600">Small thumb</p>
              <ScrollArea
                thumbSize="sm"
                type="always"
                colorScheme="coral"
                className="h-48 border border-gray-200 rounded-lg"
              >
                {generateContent(12)}
              </ScrollArea>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-slate-600">Medium thumb (default)</p>
              <ScrollArea
                thumbSize="md"
                type="always"
                colorScheme="sage"
                className="h-48 border border-gray-200 rounded-lg"
              >
                {generateContent(12)}
              </ScrollArea>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-slate-600">Large thumb</p>
              <ScrollArea
                thumbSize="lg"
                type="always"
                colorScheme="mist"
                className="h-48 border border-gray-200 rounded-lg"
              >
                {generateContent(12)}
              </ScrollArea>
            </div>
          </div>
        </div>

        {/* Financial App Use Cases */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-700">Financial App Use Cases</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-slate-600">💳 Transaction History</p>
              <ScrollArea variant="coral" colorScheme="coral" className="h-64 border border-coral-200 rounded-lg">
                {Array.from({ length: 15 }, (_, i) => (
                  <div key={i} className="p-4 border-b border-coral-100 hover:bg-coral-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-slate-700">
                          {i % 4 === 0
                            ? 'Grocery Store'
                            : i % 4 === 1
                              ? 'Coffee Shop'
                              : i % 4 === 2
                                ? 'Online Purchase'
                                : 'ATM Withdrawal'}
                        </h4>
                        <p className="text-sm text-slate-500">
                          {new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="font-medium text-coral-600">${(Math.random() * 200 + 10).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-slate-600">💰 Budget Categories</p>
              <ScrollArea variant="sage" colorScheme="sage" className="h-64 border border-sage-200 rounded-lg">
                {[
                  'Food & Dining',
                  'Transportation',
                  'Shopping',
                  'Entertainment',
                  'Bills & Utilities',
                  'Travel',
                  'Health & Fitness',
                  'Education',
                  'Gifts & Donations',
                  'Personal Care',
                  'Fees & Charges',
                  'Business Services',
                  'Taxes',
                  'Insurance',
                ].map((category, i) => (
                  <div key={i} className="p-4 border-b border-sage-100 hover:bg-sage-50 transition-colors">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-700">{category}</span>
                      <div className="text-right">
                        <div className="text-sm font-medium text-sage-600">
                          ${(Math.random() * 500 + 100).toFixed(0)}
                        </div>
                        <div className="text-xs text-slate-500">of $1,000</div>
                      </div>
                    </div>
                    <div className="mt-2 bg-sage-100 rounded-full h-2">
                      <div
                        className="bg-sage-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.random() * 80 + 10}%` }}
                      />
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>
        </div>

        {/* Rounded Variants */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-700">Border Radius Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-slate-600">No radius</p>
              <ScrollArea rounded="none" type="always" className="h-32 border border-gray-200">
                {generateContent(8)}
              </ScrollArea>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-slate-600">Medium radius (default)</p>
              <ScrollArea rounded="md" type="always" className="h-32 border border-gray-200">
                {generateContent(8)}
              </ScrollArea>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-slate-600">Large radius</p>
              <ScrollArea rounded="xl" type="always" className="h-32 border border-gray-200">
                {generateContent(8)}
              </ScrollArea>
            </div>
          </div>
        </div>

        {/* Performance Features */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-700">Performance Features</h3>
          <div className="bg-mist-50 p-6 rounded-lg border border-mist-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-slate-700 mb-3">✨ Features</h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• Smooth scrolling with CSS scroll-behavior</li>
                  <li>• Custom scrollbar styling and positioning</li>
                  <li>• Responsive scrollbar thumb sizing</li>
                  <li>• Auto-hide scrollbars with configurable delay</li>
                  <li>• Drag-to-scroll thumb interaction</li>
                  <li>• Support for both directions</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-slate-700 mb-3">🎨 Customization</h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• Multiple color schemes matching design system</li>
                  <li>• Configurable scrollbar visibility (auto, hover, always)</li>
                  <li>• Variable thumb sizes (sm, md, lg)</li>
                  <li>• Consistent with component library patterns</li>
                  <li>• Background color variants</li>
                  <li>• Border radius options</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
