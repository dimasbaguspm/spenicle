import { Badge } from '.';

export function BadgeDemo() {
  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Badges</h2>

        <div className="space-y-4">
          {/* Sizes */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Sizes</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Badge size="sm">Small</Badge>
              <Badge size="md">Medium</Badge>
              <Badge size="lg">Large</Badge>
              <Badge size="xl">Extra Large</Badge>
            </div>
          </div>

          {/* Core Variants */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Core Variants</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="tertiary">Tertiary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="ghost">Ghost</Badge>
            </div>
          </div>

          {/* Core Color Variants */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Core Colors</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="coral">Coral</Badge>
              <Badge variant="sage">Sage</Badge>
              <Badge variant="mist">Mist</Badge>
              <Badge variant="slate">Slate</Badge>
            </div>
          </div>

          {/* Outline Variants */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Outline Variants</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="coral-outline">Coral Outline</Badge>
              <Badge variant="sage-outline">Sage Outline</Badge>
              <Badge variant="mist-outline">Mist Outline</Badge>
              <Badge variant="slate-outline">Slate Outline</Badge>
            </div>
          </div>

          {/* Ghost Variants */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Ghost Variants</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="coral-ghost">Coral Ghost</Badge>
              <Badge variant="sage-ghost">Sage Ghost</Badge>
              <Badge variant="mist-ghost">Mist Ghost</Badge>
              <Badge variant="slate-ghost">Slate Ghost</Badge>
            </div>
          </div>

          {/* Semantic Variants - Solid */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Semantic - Solid</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">Payment Complete</Badge>
              <Badge variant="info">Account Updated</Badge>
              <Badge variant="warning">Low Balance</Badge>
              <Badge variant="danger">Transaction Failed</Badge>
            </div>
          </div>

          {/* Semantic Variants - Outline */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Semantic - Outline</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success-outline">Success</Badge>
              <Badge variant="info-outline">Info</Badge>
              <Badge variant="warning-outline">Warning</Badge>
              <Badge variant="danger-outline">Danger</Badge>
            </div>
          </div>

          {/* Semantic Variants - Ghost */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Semantic - Ghost</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success-ghost">Success</Badge>
              <Badge variant="info-ghost">Info</Badge>
              <Badge variant="warning-ghost">Warning</Badge>
              <Badge variant="danger-ghost">Danger</Badge>
            </div>
          </div>

          {/* Use Cases */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Use Cases</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">Paid</Badge>
              <Badge variant="warning">Pending</Badge>
              <Badge variant="danger">Overdue</Badge>
              <Badge variant="info">Processing</Badge>
              <Badge variant="sage">Recurring</Badge>
              <Badge variant="mist-outline">Category</Badge>
              <Badge variant="slate-ghost">Count: 42</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
