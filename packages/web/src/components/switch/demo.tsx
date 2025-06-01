import { useState } from 'react';

import { Switch } from './switch';

export function SwitchDemo() {
  const [basicSwitch, setBasicSwitch] = useState(false);
  const [disabledChecked, setDisabledChecked] = useState(true);
  const [notificationSwitch, setNotificationSwitch] = useState(true);
  const [darkModeSwitch, setDarkModeSwitch] = useState(false);
  const [autoSaveSwitch, setAutoSaveSwitch] = useState(true);
  const [biometricSwitch, setBiometricSwitch] = useState(false);

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-mist-200 mb-8">
      <h2 className="text-lg font-semibold text-slate-600 mb-6">Switch Components</h2>

      <div className="space-y-8">
        {/* Default States */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Default States</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Switch
              id="default"
              label="Default Switch"
              checked={basicSwitch}
              onCheckedChange={setBasicSwitch}
              helperText="This is a default switch"
            />
            <Switch id="disabled" label="Disabled Switch" disabled helperText="This switch is disabled" />
            <Switch
              id="disabled-checked"
              label="Disabled Checked"
              disabled
              checked={disabledChecked}
              onCheckedChange={setDisabledChecked}
              helperText="Disabled in checked state"
            />
          </div>
        </div>

        {/* Size Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Size Variants</h3>
          <div className="space-y-3">
            <Switch id="small" label="Small" size="sm" checked={false} helperText="Small size switch" />
            <Switch id="medium" label="Medium (Default)" size="md" checked={true} helperText="Medium size switch" />
            <Switch id="large" label="Large" size="lg" checked={false} helperText="Large size switch" />
            <Switch
              id="extra-large"
              label="Extra Large"
              size="xl"
              checked={true}
              helperText="Extra large size switch"
            />
          </div>
        </div>

        {/* Core Color Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Core Color Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Switch id="coral" label="Coral" variant="coral" checked={true} helperText="Using coral color theme" />
            <Switch id="sage" label="Sage" variant="sage" checked={true} helperText="Using sage color theme" />
            <Switch id="mist" label="Mist" variant="mist" checked={true} helperText="Using mist color theme" />
            <Switch id="slate" label="Slate" variant="slate" checked={true} helperText="Using slate color theme" />
          </div>
        </div>

        {/* Style Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Style Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Switch
              id="secondary"
              label="Secondary"
              variant="secondary"
              checked={true}
              helperText="Secondary style switch"
            />
            <Switch
              id="tertiary"
              label="Tertiary"
              variant="tertiary"
              checked={true}
              helperText="Tertiary style switch"
            />
            <Switch id="outline" label="Outline" variant="outline" checked={true} helperText="Outline style switch" />
            <Switch id="ghost" label="Ghost" variant="ghost" checked={true} helperText="Ghost style switch" />
          </div>
        </div>

        {/* Semantic Variants */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Semantic Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Switch
              id="success"
              label="✅ Success Switch"
              variant="success"
              checked={true}
              helperText="This indicates a successful state"
            />
            <Switch
              id="info"
              label="ℹ️ Info Switch"
              variant="info"
              checked={true}
              helperText="This provides informational context"
            />
            <Switch
              id="warning"
              label="⚠️ Warning Switch"
              variant="warning"
              checked={true}
              helperText="This indicates a warning condition"
            />
            <Switch
              id="danger"
              label="🚨 Danger Switch"
              variant="danger"
              checked={true}
              helperText="This indicates a dangerous condition"
            />
          </div>
        </div>

        {/* Error States */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Error States</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Switch id="error-state" label="Switch with Error" checked={false} errorText="This setting is required" />
            <Switch
              id="error-validation"
              label="Permission Required"
              checked={false}
              errorText="You need administrator permission to enable this"
            />
          </div>
        </div>

        {/* Financial App Examples */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Financial App Examples</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Switch
              id="notifications"
              label="💰 Transaction Notifications"
              variant="coral"
              checked={notificationSwitch}
              onCheckedChange={setNotificationSwitch}
              helperText="Get notified when transactions occur"
            />
            <Switch
              id="dark-mode"
              label="🌙 Dark Mode"
              variant="sage"
              checked={darkModeSwitch}
              onCheckedChange={setDarkModeSwitch}
              helperText="Enable dark theme for better viewing"
            />
            <Switch
              id="auto-save"
              label="💾 Auto-save Drafts"
              variant="mist"
              checked={autoSaveSwitch}
              onCheckedChange={setAutoSaveSwitch}
              helperText="Automatically save transaction drafts"
            />
            <Switch
              id="biometric"
              label="🔒 Biometric Authentication"
              variant="success"
              checked={biometricSwitch}
              onCheckedChange={setBiometricSwitch}
              helperText="Use fingerprint or face ID for login"
            />
            <Switch
              id="budget-alerts"
              label="📊 Budget Alerts"
              variant="warning"
              checked={true}
              helperText="Alert when approaching budget limits"
            />
            <Switch
              id="location-tracking"
              label="📍 Location-based Categorization"
              variant="info"
              checked={false}
              helperText="Auto-categorize based on transaction location"
            />
          </div>
        </div>

        {/* Advanced Use Cases */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-500">Advanced Settings</h3>
          <div className="space-y-3">
            <Switch
              id="api-access"
              label="🔌 API Access"
              variant="danger"
              checked={false}
              helperText="Enable third-party API access to your financial data"
            />
            <Switch
              id="data-sharing"
              label="🔄 Anonymous Data Sharing"
              variant="outline"
              checked={false}
              helperText="Help improve our services by sharing anonymous usage data"
            />
            <Switch
              id="experimental"
              label="🧪 Experimental Features"
              variant="ghost"
              checked={false}
              helperText="Enable beta features and experimental functionality"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
