import { Radio } from './radio';

export function RadioDemo() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-mist-200 mb-8">
      <h2 className="text-lg font-semibold text-slate-600 mb-6">Radio Components</h2>

      <div className="space-y-8">
        {/* Default States */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Default States</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Radio
              id="default"
              name="default-group"
              label="Default Radio"
              helperText="This is a default radio button"
            />
            <Radio
              id="disabled"
              name="disabled-group"
              label="Disabled Radio"
              disabled
              helperText="This radio is disabled"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Radio
              id="default-checked"
              name="default-checked-group"
              label="Default Checked"
              defaultChecked
              helperText="This is checked by default"
            />
            <Radio
              id="disabled-checked"
              name="disabled-checked-group"
              label="Disabled Checked"
              disabled
              defaultChecked
              helperText="This radio is disabled and checked"
            />
          </div>
        </div>

        {/* Size Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Size Variants</h3>
          <div className="space-y-3">
            <Radio id="small" name="size-group" label="Small Radio" size="sm" helperText="Small size radio" />
            <Radio
              id="medium"
              name="size-group"
              label="Medium Radio (Default)"
              size="md"
              helperText="Medium size radio"
            />
            <Radio id="large" name="size-group" label="Large Radio" size="lg" helperText="Large size radio" />
            <Radio
              id="extra-large"
              name="size-group"
              label="Extra Large Radio"
              size="xl"
              helperText="Extra large size radio"
            />
          </div>
        </div>

        {/* Core Color Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Core Color Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Radio
              id="coral"
              name="color-group"
              label="Coral Radio"
              variant="coral"
              helperText="Using coral color theme"
            />
            <Radio id="sage" name="color-group" label="Sage Radio" variant="sage" helperText="Using sage color theme" />
            <Radio id="mist" name="color-group" label="Mist Radio" variant="mist" helperText="Using mist color theme" />
            <Radio
              id="slate"
              name="color-group"
              label="Slate Radio"
              variant="slate"
              helperText="Using slate color theme"
            />
          </div>
        </div>

        {/* Style Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Style Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Radio
              id="secondary"
              name="style-group"
              label="Secondary Style"
              variant="secondary"
              helperText="Secondary style radio"
            />
            <Radio
              id="tertiary"
              name="style-group"
              label="Tertiary Style"
              variant="tertiary"
              helperText="Tertiary style radio"
            />
            <Radio
              id="outline"
              name="style-group"
              label="Outline Style"
              variant="outline"
              helperText="Outline style radio"
            />
            <Radio id="ghost" name="style-group" label="Ghost Style" variant="ghost" helperText="Ghost style radio" />
          </div>
        </div>

        {/* Semantic Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Semantic Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Radio
              id="success"
              name="semantic-group"
              label="✅ Success Radio"
              variant="success"
              helperText="This indicates a successful selection"
            />
            <Radio
              id="info"
              name="semantic-group"
              label="ℹ️ Info Radio"
              variant="info"
              helperText="This provides informational context"
            />
            <Radio
              id="warning"
              name="semantic-group"
              label="⚠️ Warning Radio"
              variant="warning"
              helperText="This indicates a warning condition"
            />
            <Radio
              id="danger"
              name="semantic-group"
              label="🚨 Danger Radio"
              variant="danger"
              helperText="This indicates a dangerous condition"
            />
          </div>
        </div>

        {/* Error States */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Error States</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Radio id="error-state" name="error-group" label="Radio with Error" errorText="This field is required" />
            <Radio
              id="error-validation"
              name="error-group"
              label="Payment Method"
              defaultChecked={false}
              errorText="Please select a payment method"
            />
          </div>
        </div>

        {/* Label Position */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Label Position</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Radio
              id="label-right"
              name="position-group"
              label="Label on Right (Default)"
              labelPosition="right"
              variant="coral"
              helperText="Label appears on the right side"
            />
            <Radio
              id="label-left"
              name="position-group"
              label="Label on Left"
              labelPosition="left"
              variant="sage"
              helperText="Label appears on the left side"
            />
          </div>
        </div>

        {/* Financial App Examples */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Financial App Examples</h3>
          <div className="space-y-3">
            <div className="border border-mist-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-slate-600 mb-3">Payment Method</h4>
              <div className="space-y-2">
                <Radio
                  id="credit-card"
                  name="payment-method"
                  label="💳 Credit Card"
                  variant="coral"
                  helperText="Pay with your credit card"
                />
                <Radio
                  id="debit-card"
                  name="payment-method"
                  label="🏦 Debit Card"
                  variant="sage"
                  helperText="Pay directly from your bank account"
                />
                <Radio
                  id="bank-transfer"
                  name="payment-method"
                  label="🏛️ Bank Transfer"
                  variant="mist"
                  helperText="Transfer funds from your bank"
                />
                <Radio
                  id="digital-wallet"
                  name="payment-method"
                  label="📱 Digital Wallet"
                  variant="slate"
                  helperText="Use Apple Pay, Google Pay, etc."
                />
              </div>
            </div>

            <div className="border border-mist-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-slate-600 mb-3">Transaction Frequency</h4>
              <div className="space-y-2">
                <Radio
                  id="daily"
                  name="frequency"
                  label="Daily"
                  variant="success"
                  size="sm"
                  helperText="Process transactions daily"
                />
                <Radio
                  id="weekly"
                  name="frequency"
                  label="Weekly"
                  variant="info"
                  size="sm"
                  defaultChecked
                  helperText="Process transactions weekly"
                />
                <Radio
                  id="monthly"
                  name="frequency"
                  label="Monthly"
                  variant="warning"
                  size="sm"
                  helperText="Process transactions monthly"
                />
                <Radio
                  id="quarterly"
                  name="frequency"
                  label="Quarterly"
                  variant="danger"
                  size="sm"
                  helperText="Process transactions quarterly"
                />
              </div>
            </div>

            <div className="border border-mist-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-slate-600 mb-3">Account Type</h4>
              <div className="space-y-2">
                <Radio
                  id="checking"
                  name="account-type"
                  label="Checking Account"
                  variant="coral"
                  helperText="For daily transactions and expenses"
                />
                <Radio
                  id="savings"
                  name="account-type"
                  label="Savings Account"
                  variant="sage"
                  helperText="For long-term savings and goals"
                />
                <Radio
                  id="investment"
                  name="account-type"
                  label="Investment Account"
                  variant="mist"
                  helperText="For investment and portfolio management"
                />
                <Radio
                  id="business"
                  name="account-type"
                  label="Business Account"
                  variant="slate"
                  disabled
                  helperText="Contact support to enable business features"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
