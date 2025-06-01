import { AlertCircle, CheckCircle, Info, Triangle } from 'lucide-react';

import { Alert } from '.';

export function AlertDemo() {
  return (
    <div className="p-8 space-y-8 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Alert Components</h2>

        <div className="space-y-6">
          {/* Basic Usage */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Basic Alerts</h3>
            <div className="space-y-3">
              <Alert variant="success">
                <Alert.Icon>
                  <CheckCircle className="h-4 w-4" />
                </Alert.Icon>
                <Alert.Content>
                  <Alert.Title>Success</Alert.Title>
                  <Alert.Description>Your payment has been processed successfully.</Alert.Description>
                </Alert.Content>
              </Alert>

              <Alert variant="info">
                <Alert.Icon>
                  <Info className="h-4 w-4" />
                </Alert.Icon>
                <Alert.Content>
                  <Alert.Title>Information</Alert.Title>
                  <Alert.Description>Your account will be updated within 24 hours.</Alert.Description>
                </Alert.Content>
              </Alert>

              <Alert variant="warning">
                <Alert.Icon>
                  <Triangle className="h-4 w-4" />
                </Alert.Icon>
                <Alert.Content>
                  <Alert.Title>Warning</Alert.Title>
                  <Alert.Description>Your account balance is running low. Consider adding funds.</Alert.Description>
                </Alert.Content>
              </Alert>

              <Alert variant="danger">
                <Alert.Icon>
                  <AlertCircle className="h-4 w-4" />
                </Alert.Icon>
                <Alert.Content>
                  <Alert.Title>Error</Alert.Title>
                  <Alert.Description>Transaction failed. Please check your payment details.</Alert.Description>
                </Alert.Content>
              </Alert>
            </div>
          </div>

          {/* Core Color Variants */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Core Color Variants</h3>
            <div className="space-y-3">
              <Alert variant="coral">
                <Alert.Content>
                  <Alert.Title>Coral Alert</Alert.Title>
                  <Alert.Description>
                    This is a coral-colored alert for primary actions and highlights.
                  </Alert.Description>
                </Alert.Content>
              </Alert>

              <Alert variant="sage">
                <Alert.Content>
                  <Alert.Title>Sage Alert</Alert.Title>
                  <Alert.Description>
                    This is a sage-colored alert for balanced, trustworthy information.
                  </Alert.Description>
                </Alert.Content>
              </Alert>

              <Alert variant="mist">
                <Alert.Content>
                  <Alert.Title>Mist Alert</Alert.Title>
                  <Alert.Description>
                    This is a mist-colored alert for professional, subtle notifications.
                  </Alert.Description>
                </Alert.Content>
              </Alert>

              <Alert variant="slate">
                <Alert.Content>
                  <Alert.Title>Slate Alert</Alert.Title>
                  <Alert.Description>
                    This is a slate-colored alert for serious, professional messages.
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            </div>
          </div>

          {/* Outline Variants */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Outline Variants</h3>
            <div className="space-y-3">
              <Alert variant="success-outline">
                <Alert.Icon>
                  <CheckCircle className="h-4 w-4" />
                </Alert.Icon>
                <Alert.Content>
                  <Alert.Title>Success Outline</Alert.Title>
                  <Alert.Description>Subtle success notification with outline styling.</Alert.Description>
                </Alert.Content>
              </Alert>

              <Alert variant="coral-outline">
                <Alert.Icon>
                  <Info className="h-4 w-4" />
                </Alert.Icon>
                <Alert.Content>
                  <Alert.Title>Coral Outline</Alert.Title>
                  <Alert.Description>Coral outline alert for highlighted information.</Alert.Description>
                </Alert.Content>
              </Alert>
            </div>
          </div>

          {/* Dismissible Alerts */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Dismissible Alerts</h3>
            <div className="space-y-3">
              <Alert
                variant="info"
                onClose={() => {
                  /* Handle close */
                }}
              >
                <Alert.Icon>
                  <Info className="h-4 w-4" />
                </Alert.Icon>
                <Alert.Content>
                  <Alert.Title>Dismissible Alert</Alert.Title>
                  <Alert.Description>This alert can be dismissed by clicking the close button.</Alert.Description>
                </Alert.Content>
                <Alert.CloseButton />
              </Alert>

              <Alert
                variant="warning"
                onClose={() => {
                  /* Handle warning dismiss */
                }}
              >
                <Alert.Icon>
                  <Triangle className="h-4 w-4" />
                </Alert.Icon>
                <Alert.Content>
                  <Alert.Title>Budget Warning</Alert.Title>
                  <Alert.Description>
                    You've spent 80% of your monthly budget. Consider reviewing your expenses.
                  </Alert.Description>
                </Alert.Content>
                <Alert.CloseButton />
              </Alert>
            </div>
          </div>

          {/* Different Sizes */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Sizes</h3>
            <div className="space-y-3">
              <Alert variant="sage" size="sm">
                <Alert.Content>
                  <Alert.Title>Small Alert</Alert.Title>
                  <Alert.Description>Compact size for minimal space usage.</Alert.Description>
                </Alert.Content>
              </Alert>

              <Alert variant="sage" size="md">
                <Alert.Content>
                  <Alert.Title>Medium Alert</Alert.Title>
                  <Alert.Description>Default size for most use cases.</Alert.Description>
                </Alert.Content>
              </Alert>

              <Alert variant="sage" size="lg">
                <Alert.Content>
                  <Alert.Title>Large Alert</Alert.Title>
                  <Alert.Description>
                    Larger size for prominent notifications that need more attention.
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            </div>
          </div>

          {/* Financial App Use Cases */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Financial App Examples</h3>
            <div className="space-y-3">
              <Alert
                variant="success"
                onClose={() => {
                  /* Handle close */
                }}
              >
                <Alert.Icon>
                  <CheckCircle className="h-4 w-4" />
                </Alert.Icon>
                <Alert.Content>
                  <Alert.Title>Payment Successful</Alert.Title>
                  <Alert.Description>
                    $250.00 has been transferred to John's account. Transaction ID: #TXN-2024-001
                  </Alert.Description>
                </Alert.Content>
                <Alert.CloseButton />
              </Alert>

              <Alert
                variant="warning"
                onClose={() => {
                  /* Handle close */
                }}
              >
                <Alert.Icon>
                  <Triangle className="h-4 w-4" />
                </Alert.Icon>
                <Alert.Content>
                  <Alert.Title>Low Balance Alert</Alert.Title>
                  <Alert.Description>
                    Your checking account balance is below $100. Consider transferring funds or setting up
                    auto-transfer.
                  </Alert.Description>
                </Alert.Content>
                <Alert.CloseButton />
              </Alert>

              <Alert
                variant="info"
                onClose={() => {
                  /* Handle close */
                }}
              >
                <Alert.Icon>
                  <Info className="h-4 w-4" />
                </Alert.Icon>
                <Alert.Content>
                  <Alert.Title>Account Update</Alert.Title>
                  <Alert.Description>
                    Your monthly statement is now available. View it in the Documents section.
                  </Alert.Description>
                </Alert.Content>
                <Alert.CloseButton />
              </Alert>

              <Alert
                variant="danger"
                onClose={() => {
                  /* Handle close */
                }}
              >
                <Alert.Icon>
                  <AlertCircle className="h-4 w-4" />
                </Alert.Icon>
                <Alert.Content>
                  <Alert.Title>Security Alert</Alert.Title>
                  <Alert.Description>
                    Unusual activity detected on your account. Please verify your recent transactions and update your
                    password.
                  </Alert.Description>
                </Alert.Content>
                <Alert.CloseButton />
              </Alert>
            </div>
          </div>

          {/* Without Icons */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Without Icons</h3>
            <div className="space-y-3">
              <Alert variant="coral">
                <Alert.Content>
                  <Alert.Title>Simple Alert</Alert.Title>
                  <Alert.Description>Sometimes you don't need an icon, just clear messaging.</Alert.Description>
                </Alert.Content>
              </Alert>

              <Alert
                variant="mist-outline"
                onClose={() => {
                  /* Handle close */
                }}
              >
                <Alert.Content>
                  <Alert.Description>
                    You can also have alerts with just a description, no title needed.
                  </Alert.Description>
                </Alert.Content>
                <Alert.CloseButton />
              </Alert>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
