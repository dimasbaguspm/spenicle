import { Checkbox } from './checkbox';

export function CheckboxDemo() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-mist-200 mb-8">
      <h2 className="text-lg font-semibold text-slate-600 mb-6">Checkbox Components</h2>

      <div className="space-y-8">
        {/* Default States */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Default States</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Checkbox id="default" label="Default Checkbox" helperText="This is a default checkbox" />
            <Checkbox id="disabled" label="Disabled Checkbox" disabled helperText="This checkbox is disabled" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Checkbox
              id="default-checked"
              label="Default Checked"
              defaultChecked
              helperText="This is checked by default"
            />
            <Checkbox
              id="disabled-checked"
              label="Disabled Checked"
              disabled
              defaultChecked
              helperText="This checkbox is disabled and checked"
            />
          </div>
        </div>

        {/* Size Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Size Variants</h3>
          <div className="space-y-3">
            <Checkbox id="small" label="Small Checkbox" size="sm" helperText="Small size checkbox" />
            <Checkbox id="medium" label="Medium Checkbox (Default)" size="md" helperText="Medium size checkbox" />
            <Checkbox id="large" label="Large Checkbox" size="lg" helperText="Large size checkbox" />
            <Checkbox id="extra-large" label="Extra Large Checkbox" size="xl" helperText="Extra large size checkbox" />
          </div>
        </div>

        {/* Core Color Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Core Color Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Checkbox id="coral" label="Coral Checkbox" variant="coral" helperText="Using coral color theme" />
            <Checkbox id="sage" label="Sage Checkbox" variant="sage" helperText="Using sage color theme" />
            <Checkbox id="mist" label="Mist Checkbox" variant="mist" helperText="Using mist color theme" />
            <Checkbox id="slate" label="Slate Checkbox" variant="slate" helperText="Using slate color theme" />
          </div>
        </div>

        {/* Style Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Style Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Checkbox
              id="secondary"
              label="Secondary Style"
              variant="secondary"
              helperText="Secondary style checkbox"
            />
            <Checkbox id="tertiary" label="Tertiary Style" variant="tertiary" helperText="Tertiary style checkbox" />
            <Checkbox id="outline" label="Outline Style" variant="outline" helperText="Outline style checkbox" />
            <Checkbox id="ghost" label="Ghost Style" variant="ghost" helperText="Ghost style checkbox" />
          </div>
        </div>

        {/* Semantic Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Semantic Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Checkbox
              id="success"
              label="✅ Success Checkbox"
              variant="success"
              helperText="This indicates a successful selection"
            />
            <Checkbox
              id="info"
              label="ℹ️ Info Checkbox"
              variant="info"
              helperText="This provides informational context"
            />
            <Checkbox
              id="warning"
              label="⚠️ Warning Checkbox"
              variant="warning"
              helperText="This indicates a warning condition"
            />
            <Checkbox
              id="danger"
              label="🚨 Danger Checkbox"
              variant="danger"
              helperText="This indicates a dangerous condition"
            />
          </div>
        </div>

        {/* Error States */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Error States</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Checkbox id="error-state" label="Checkbox with Error" errorText="This field is required" />
            <Checkbox
              id="error-validation"
              label="Terms and Conditions"
              defaultChecked={false}
              errorText="You must accept the terms and conditions"
            />
          </div>
        </div>

        {/* Label Position */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Label Position</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Checkbox
              id="label-right"
              label="Label on Right (Default)"
              labelPosition="right"
              variant="coral"
              helperText="Label appears on the right side"
            />
            <Checkbox
              id="label-left"
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
            <Checkbox
              id="notifications"
              label="💰 Send transaction notifications"
              variant="coral"
              helperText="Get notified when transactions occur"
            />
            <Checkbox
              id="budget-alerts"
              label="🏦 Enable budget alerts"
              variant="sage"
              helperText="Receive alerts when approaching budget limits"
            />
            <Checkbox
              id="monthly-reports"
              label="📊 Monthly spending reports"
              variant="mist"
              helperText="Get detailed monthly spending analysis"
            />
            <Checkbox
              id="auto-categorize"
              label="📝 Auto-categorize transactions"
              variant="slate"
              helperText="Automatically categorize similar transactions"
            />
            <Checkbox
              id="terms"
              label="I agree to the terms and conditions"
              variant="success"
              helperText="Required to create your account"
            />
            <Checkbox
              id="marketing"
              label="Receive marketing emails"
              variant="info"
              helperText="Optional marketing communications"
            />
          </div>
        </div>

        {/* Complex Use Cases */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Complex Use Cases</h3>
          <div className="space-y-3">
            <div className="border border-mist-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-slate-600 mb-3">Account Settings</h4>
              <div className="space-y-2">
                <Checkbox
                  id="two-factor"
                  label="Enable two-factor authentication"
                  variant="success"
                  size="sm"
                  helperText="Adds an extra layer of security"
                />
                <Checkbox
                  id="email-verification"
                  label="Require email verification for large transactions"
                  variant="warning"
                  size="sm"
                  helperText="Transactions over $1,000 will require email confirmation"
                />
                <Checkbox
                  id="account-locked"
                  label="Account temporarily locked"
                  variant="danger"
                  size="sm"
                  disabled
                  defaultChecked
                  helperText="Contact support to unlock"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
