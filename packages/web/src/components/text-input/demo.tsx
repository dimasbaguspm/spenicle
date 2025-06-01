import { TextInput } from './text-input';

export function TextInputDemo() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-mist-200 mb-8">
      <h2 className="text-lg font-semibold text-slate-600 mb-6">Text Input Components</h2>

      <div className="space-y-8">
        {/* Default States */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Default States</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput
              id="default"
              label="Default Input"
              placeholder="Enter your text..."
              helperText="This is a default text input"
            />
            <TextInput
              id="disabled"
              label="Disabled Input"
              placeholder="This is disabled"
              disabled
              helperText="This input is disabled"
            />
          </div>
        </div>

        {/* Size Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Size Variants</h3>
          <div className="space-y-3">
            <TextInput id="small" label="Small" size="sm" placeholder="Small input" helperText="Small size input" />
            <TextInput
              id="medium"
              label="Medium (Default)"
              size="md"
              placeholder="Medium input"
              helperText="Medium size input"
            />
            <TextInput id="large" label="Large" size="lg" placeholder="Large input" helperText="Large size input" />
            <TextInput
              id="extra-large"
              label="Extra Large"
              size="xl"
              placeholder="Extra large input"
              helperText="Extra large size input"
            />
          </div>
        </div>

        {/* Core Color Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Core Color Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput
              id="coral"
              label="Coral"
              variant="coral"
              placeholder="Coral themed input"
              helperText="Using coral color theme"
            />
            <TextInput
              id="sage"
              label="Sage"
              variant="sage"
              placeholder="Sage themed input"
              helperText="Using sage color theme"
            />
            <TextInput
              id="mist"
              label="Mist"
              variant="mist"
              placeholder="Mist themed input"
              helperText="Using mist color theme"
            />
            <TextInput
              id="slate"
              label="Slate"
              variant="slate"
              placeholder="Slate themed input"
              helperText="Using slate color theme"
            />
          </div>
        </div>

        {/* Style Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Style Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput
              id="secondary"
              label="Secondary"
              variant="secondary"
              placeholder="Secondary style"
              helperText="Secondary style input"
            />
            <TextInput
              id="tertiary"
              label="Tertiary"
              variant="tertiary"
              placeholder="Tertiary style"
              helperText="Tertiary style input"
            />
            <TextInput
              id="outline"
              label="Outline"
              variant="outline"
              placeholder="Outline style"
              helperText="Outline style input"
            />
            <TextInput
              id="ghost"
              label="Ghost"
              variant="ghost"
              placeholder="Ghost style"
              helperText="Ghost style input"
            />
          </div>
        </div>

        {/* Semantic Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Semantic Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput
              id="success"
              label="✅ Success Input"
              variant="success"
              placeholder="Success state"
              helperText="This indicates a successful validation"
            />
            <TextInput
              id="info"
              label="ℹ️ Info Input"
              variant="info"
              placeholder="Info state"
              helperText="This provides informational context"
            />
            <TextInput
              id="warning"
              label="⚠️ Warning Input"
              variant="warning"
              placeholder="Warning state"
              helperText="This indicates a warning condition"
            />
            <TextInput
              id="danger"
              label="🚨 Danger Input"
              variant="danger"
              placeholder="Danger state"
              helperText="This indicates a dangerous condition"
            />
          </div>
        </div>

        {/* Error States */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Error States</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput
              id="error-state"
              label="Input with Error"
              placeholder="Invalid input"
              errorText="This field is required"
            />
            <TextInput
              id="error-validation"
              label="Email Validation"
              type="email"
              placeholder="invalid-email"
              defaultValue="invalid-email"
              errorText="Please enter a valid email address"
            />
          </div>
        </div>

        {/* Different Input Types */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Input Types</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput
              id="email"
              label="Email"
              type="email"
              placeholder="Enter your email"
              helperText="We'll never share your email"
            />
            <TextInput
              id="password"
              label="Password"
              type="password"
              placeholder="Enter your password"
              helperText="Must be at least 8 characters"
            />
            <TextInput
              id="number"
              label="Number"
              type="number"
              placeholder="Enter a number"
              helperText="Numeric input only"
            />
            <TextInput id="tel" label="Phone" type="tel" placeholder="(555) 123-4567" helperText="Your phone number" />
          </div>
        </div>

        {/* Complex Examples */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Financial App Examples</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput
              id="amount"
              label="💰 Transaction Amount"
              type="number"
              placeholder="0.00"
              variant="coral"
              helperText="Enter the transaction amount"
            />
            <TextInput
              id="account"
              label="🏦 Account Number"
              placeholder="1234-5678-9012"
              variant="sage"
              helperText="Your account number"
            />
            <TextInput
              id="budget"
              label="📊 Budget Category"
              placeholder="e.g., Groceries, Gas, Entertainment"
              variant="mist"
              helperText="Categorize your spending"
            />
            <TextInput
              id="notes"
              label="📝 Transaction Notes"
              placeholder="Optional notes..."
              variant="ghost"
              helperText="Add any additional details"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
