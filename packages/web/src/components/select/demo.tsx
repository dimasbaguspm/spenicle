import { Select } from './select';

export function SelectDemo() {
  const sampleOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
    { value: 'option4', label: 'Option 4', disabled: true },
  ];

  const categoryOptions = [
    { value: 'food', label: '🍔 Food & Dining' },
    { value: 'transport', label: '🚗 Transportation' },
    { value: 'shopping', label: '🛍️ Shopping' },
    { value: 'entertainment', label: '🎬 Entertainment' },
    { value: 'utilities', label: '⚡ Utilities' },
    { value: 'healthcare', label: '🏥 Healthcare' },
  ];

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-mist-200 mb-8">
      <h2 className="text-lg font-semibold text-slate-600 mb-6">Select Components</h2>

      <div className="space-y-8">
        {/* Default States */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Default States</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              id="default"
              label="Default Select"
              placeholder="Choose an option..."
              options={sampleOptions}
              helperText="This is a default select"
            />
            <Select
              id="disabled"
              label="Disabled Select"
              placeholder="This is disabled"
              disabled
              options={sampleOptions}
              helperText="This select is disabled"
            />
          </div>
        </div>

        {/* Size Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Size Variants</h3>
          <div className="space-y-3">
            <Select
              id="small"
              label="Small"
              size="sm"
              placeholder="Small select"
              options={sampleOptions}
              helperText="Small size select"
            />
            <Select
              id="medium"
              label="Medium (Default)"
              size="md"
              placeholder="Medium select"
              options={sampleOptions}
              helperText="Medium size select"
            />
            <Select
              id="large"
              label="Large"
              size="lg"
              placeholder="Large select"
              options={sampleOptions}
              helperText="Large size select"
            />
            <Select
              id="extra-large"
              label="Extra Large"
              size="xl"
              placeholder="Extra large select"
              options={sampleOptions}
              helperText="Extra large size select"
            />
          </div>
        </div>

        {/* Core Color Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Core Color Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              id="coral"
              label="Coral"
              variant="coral"
              placeholder="Coral variant"
              options={categoryOptions}
              helperText="Primary action select"
            />
            <Select
              id="sage"
              label="Sage"
              variant="sage"
              placeholder="Sage variant"
              options={categoryOptions}
              helperText="Secondary action select"
            />
            <Select
              id="mist"
              label="Mist"
              variant="mist"
              placeholder="Mist variant"
              options={categoryOptions}
              helperText="Tertiary action select"
            />
            <Select
              id="slate"
              label="Slate"
              variant="slate"
              placeholder="Slate variant"
              options={categoryOptions}
              helperText="Ghost action select"
            />
          </div>
        </div>

        {/* Utility Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Utility Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              id="secondary"
              label="Secondary"
              variant="secondary"
              placeholder="Secondary variant"
              options={sampleOptions}
              helperText="Secondary select"
            />
            <Select
              id="outline"
              label="Outline"
              variant="outline"
              placeholder="Outline variant"
              options={sampleOptions}
              helperText="Outline select"
            />
            <Select
              id="ghost"
              label="Ghost"
              variant="ghost"
              placeholder="Ghost variant"
              options={sampleOptions}
              helperText="Ghost select"
            />
          </div>
        </div>

        {/* Semantic Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Semantic Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              id="success"
              label="Success State"
              variant="success"
              placeholder="Success variant"
              options={sampleOptions}
              helperText="Payment method selected successfully"
            />
            <Select
              id="info"
              label="Info State"
              variant="info"
              placeholder="Info variant"
              options={sampleOptions}
              helperText="Account type information"
            />
            <Select
              id="warning"
              label="Warning State"
              variant="warning"
              placeholder="Warning variant"
              options={sampleOptions}
              helperText="Budget category needs attention"
            />
            <Select
              id="danger"
              label="Danger State"
              variant="danger"
              placeholder="Danger variant"
              options={sampleOptions}
              helperText="Critical selection required"
            />
          </div>
        </div>

        {/* Error and Success States */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">State Examples</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              id="error-state"
              label="Error State"
              placeholder="Select a category..."
              options={categoryOptions}
              errorText="Please select a valid category"
            />
            <Select
              id="success-state"
              label="Success State"
              state="success"
              placeholder="Category selected"
              options={categoryOptions}
              defaultValue="food"
              helperText="Category successfully selected"
            />
          </div>
        </div>

        {/* Custom Options using children */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Custom Options (Children)</h3>
          <Select
            id="custom-options"
            label="Payment Method"
            placeholder="Select payment method..."
            helperText="Choose your preferred payment method"
          >
            <optgroup label="Cards">
              <option value="visa">💳 Visa ending in 1234</option>
              <option value="mastercard">💳 Mastercard ending in 5678</option>
              <option value="amex">💳 American Express ending in 9012</option>
            </optgroup>
            <optgroup label="Digital Wallets">
              <option value="paypal">📱 PayPal</option>
              <option value="apple-pay">🍎 Apple Pay</option>
              <option value="google-pay">📱 Google Pay</option>
            </optgroup>
            <optgroup label="Bank">
              <option value="bank-transfer">🏦 Bank Transfer</option>
              <option value="direct-debit" disabled>
                🏦 Direct Debit (Coming Soon)
              </option>
            </optgroup>
          </Select>
        </div>

        {/* Financial App Examples */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Financial App Examples</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              id="account-type"
              label="Account Type"
              variant="sage"
              placeholder="Select account type..."
              helperText="Choose the type of account"
            >
              <option value="checking">💰 Checking Account</option>
              <option value="savings">🏦 Savings Account</option>
              <option value="credit">💳 Credit Card</option>
              <option value="investment">📈 Investment Account</option>
            </Select>
            <Select
              id="time-period"
              label="Time Period"
              variant="mist"
              placeholder="Select time period..."
              options={[
                { value: 'week', label: '📅 This Week' },
                { value: 'month', label: '📅 This Month' },
                { value: 'quarter', label: '📅 This Quarter' },
                { value: 'year', label: '📅 This Year' },
                { value: 'custom', label: '📅 Custom Range' },
              ]}
              helperText="Choose reporting period"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
