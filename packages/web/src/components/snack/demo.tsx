import { CheckCircle, Info, AlertCircle, Triangle, DollarSign, CreditCard, TrendingUp } from 'lucide-react';

import { Snack } from '.';

export function SnackDemo() {
  return (
    <div className="p-8 space-y-8 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Snack Components</h2>

        <div className="space-y-6">
          {/* Basic Usage */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Basic Snacks</h3>
            <div className="space-y-3">
              <Snack variant="success" icon={<CheckCircle className="h-4 w-4" />} onClose={() => {}}>
                Payment successfully processed
              </Snack>

              <Snack variant="info" icon={<Info className="h-4 w-4" />} onClose={() => {}}>
                Your account will be updated within 24 hours
              </Snack>

              <Snack variant="warning" icon={<Triangle className="h-4 w-4" />} onClose={() => {}}>
                Account balance is running low
              </Snack>

              <Snack variant="danger" icon={<AlertCircle className="h-4 w-4" />} onClose={() => {}}>
                Transaction failed - please try again
              </Snack>
            </div>
          </div>

          {/* Core Color Variants */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Core Color Variants</h3>
            <div className="space-y-3">
              <Snack variant="coral" icon={<DollarSign className="h-4 w-4" />} onClose={() => {}}>
                Primary action completed successfully
              </Snack>

              <Snack variant="sage" icon={<CreditCard className="h-4 w-4" />} onClose={() => {}}>
                Card payment processed with balanced approach
              </Snack>

              <Snack variant="mist" icon={<Info className="h-4 w-4" />} onClose={() => {}}>
                Professional notification message
              </Snack>

              <Snack variant="slate" icon={<TrendingUp className="h-4 w-4" />} onClose={() => {}}>
                System update completed
              </Snack>
            </div>
          </div>

          {/* Outline Variants */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Outline Variants</h3>
            <div className="space-y-3">
              <Snack variant="success-outline" icon={<CheckCircle className="h-4 w-4" />} onClose={() => {}}>
                Subtle success notification
              </Snack>

              <Snack variant="coral-outline" icon={<DollarSign className="h-4 w-4" />} onClose={() => {}}>
                Primary action with outline styling
              </Snack>
            </div>
          </div>

          {/* Solid Variants */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Solid Variants</h3>
            <div className="space-y-3">
              <Snack variant="success-solid" icon={<CheckCircle className="h-4 w-4" />} onClose={() => {}}>
                Bold success message
              </Snack>

              <Snack variant="coral-solid" icon={<DollarSign className="h-4 w-4" />} onClose={() => {}}>
                Important primary action
              </Snack>
            </div>
          </div>

          {/* Different Sizes */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Sizes</h3>
            <div className="space-y-3">
              <Snack variant="sage" size="sm" icon={<Info className="h-3 w-3" />} onClose={() => {}}>
                Small notification
              </Snack>

              <Snack variant="sage" size="md" icon={<Info className="h-4 w-4" />} onClose={() => {}}>
                Medium notification (default)
              </Snack>

              <Snack variant="sage" size="lg" icon={<Info className="h-5 w-5" />} onClose={() => {}}>
                Large notification for prominent messages
              </Snack>
            </div>
          </div>

          {/* With Actions */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">With Actions</h3>
            <div className="space-y-3">
              <Snack
                variant="info"
                icon={<Info className="h-4 w-4" />}
                action={
                  <button className="text-info-600 hover:text-info-700 font-medium text-sm underline">
                    View Details
                  </button>
                }
                onClose={() => {}}
              >
                New statement available
              </Snack>

              <Snack
                variant="warning"
                icon={<Triangle className="h-4 w-4" />}
                action={
                  <button className="bg-warning-100 hover:bg-warning-200 text-warning-800 px-3 py-1 rounded text-sm font-medium transition-colors">
                    Add Funds
                  </button>
                }
                onClose={() => {}}
              >
                Low balance detected
              </Snack>
            </div>
          </div>

          {/* Financial App Use Cases */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Financial App Examples</h3>
            <div className="space-y-3">
              <Snack
                variant="success"
                icon={<CheckCircle className="h-4 w-4" />}
                action={
                  <button className="text-success-600 hover:text-success-700 font-medium text-sm underline">
                    View Receipt
                  </button>
                }
                onClose={() => {}}
              >
                $250.00 transferred to John's account
              </Snack>

              <Snack
                variant="warning"
                icon={<Triangle className="h-4 w-4" />}
                action={
                  <button className="bg-warning-100 hover:bg-warning-200 text-warning-800 px-3 py-1 rounded text-sm font-medium transition-colors">
                    Set Alert
                  </button>
                }
                onClose={() => {}}
              >
                You've spent 80% of your monthly budget
              </Snack>

              <Snack
                variant="info"
                icon={<Info className="h-4 w-4" />}
                action={
                  <button className="text-info-600 hover:text-info-700 font-medium text-sm underline">Download</button>
                }
                onClose={() => {}}
              >
                Monthly statement is ready for download
              </Snack>

              <Snack
                variant="danger"
                icon={<AlertCircle className="h-4 w-4" />}
                action={
                  <button className="bg-danger-100 hover:bg-danger-200 text-danger-800 px-3 py-1 rounded text-sm font-medium transition-colors">
                    Secure Account
                  </button>
                }
                onClose={() => {}}
              >
                Unusual activity detected on your account
              </Snack>
            </div>
          </div>

          {/* Without Close Button */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Without Close Button</h3>
            <div className="space-y-3">
              <Snack variant="coral" icon={<DollarSign className="h-4 w-4" />}>
                Persistent notification without close option
              </Snack>

              <Snack
                variant="mist-outline"
                icon={<Info className="h-4 w-4" />}
                action={
                  <button className="text-mist-600 hover:text-mist-700 font-medium text-sm underline">
                    Learn More
                  </button>
                }
              >
                System maintenance scheduled for tonight
              </Snack>
            </div>
          </div>

          {/* Without Icons */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Without Icons</h3>
            <div className="space-y-3">
              <Snack variant="coral" onClose={() => {}}>
                Simple notification message
              </Snack>

              <Snack
                variant="sage-outline"
                action={
                  <button className="text-sage-600 hover:text-sage-700 font-medium text-sm underline">Undo</button>
                }
                onClose={() => {}}
              >
                Transaction completed successfully
              </Snack>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
