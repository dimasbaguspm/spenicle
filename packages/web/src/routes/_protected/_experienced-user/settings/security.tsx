import { createFileRoute } from '@tanstack/react-router';
import { Shield, Key, Smartphone, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

import { PageLayout, Switch, Button, TextInput, Tile } from '../../../../components';

export const Route = createFileRoute('/_protected/_experienced-user/settings/security')({
  component: SecurityComponent,
});

interface SecuritySettings {
  twoFactorAuth: boolean;
  biometricAuth: boolean;
  loginAlerts: boolean;
  sessionTimeout: string;
}

function SecurityComponent() {
  const [settings, setSettings] = useState<SecuritySettings>({
    twoFactorAuth: true,
    biometricAuth: false,
    loginAlerts: true,
    sessionTimeout: '30',
  });

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const updateSetting = (key: keyof SecuritySettings, value: boolean | string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handlePasswordChange = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    // Handle password change logic here
    alert('Password changed successfully!');
    setShowPasswordForm(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleSave = () => {
    // Handle save logic here
    alert('Security settings saved successfully!');
  };

  return (
    <PageLayout background="cream" title="Security & Privacy" showBackButton={true}>
      <div className="space-y-6">
        {/* Password & Authentication */}
        <Tile>
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">Password & Authentication</h3>
            <p className="text-sm text-slate-600 mt-1">Manage your login credentials and security</p>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-coral-600">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Password</p>
                    <p className="text-sm text-slate-500">Last changed 3 months ago</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowPasswordForm(!showPasswordForm)}>
                  Change Password
                </Button>
              </div>

              {showPasswordForm && (
                <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Current Password</label>
                    <div className="relative">
                      <TextInput
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                      >
                        {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
                    <div className="relative">
                      <TextInput
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      >
                        {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Confirm New Password</label>
                    <div className="relative">
                      <TextInput
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      >
                        {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setShowPasswordForm(false)}>
                      Cancel
                    </Button>
                    <Button variant="coral" size="sm" onClick={handlePasswordChange}>
                      Update Password
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-coral-600">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Two-Factor Authentication</p>
                  <p className="text-sm text-slate-500">Add an extra layer of security</p>
                </div>
              </div>
              <Switch
                checked={settings.twoFactorAuth}
                onCheckedChange={(checked) => updateSetting('twoFactorAuth', checked)}
              />
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-coral-600">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Biometric Authentication</p>
                  <p className="text-sm text-slate-500">Use fingerprint or face recognition</p>
                </div>
              </div>
              <Switch
                checked={settings.biometricAuth}
                onCheckedChange={(checked) => updateSetting('biometricAuth', checked)}
              />
            </div>
          </div>
        </Tile>

        {/* Login Security */}
        <Tile>
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">Login Security</h3>
            <p className="text-sm text-slate-600 mt-1">Control how and when you stay logged in</p>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Login Alerts</p>
                <p className="text-sm text-slate-500">Get notified of new device logins</p>
              </div>
              <Switch
                checked={settings.loginAlerts}
                onCheckedChange={(checked) => updateSetting('loginAlerts', checked)}
              />
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-slate-900">Session Timeout</p>
                  <p className="text-sm text-slate-500">Automatically log out after inactivity</p>
                </div>
              </div>
              <select
                value={settings.sessionTimeout}
                onChange={(e) => updateSetting('sessionTimeout', e.target.value)}
                className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="240">4 hours</option>
                <option value="never">Never</option>
              </select>
            </div>
          </div>
        </Tile>

        {/* Active Sessions */}
        <Tile>
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">Active Sessions</h3>
            <p className="text-sm text-slate-600 mt-1">Manage your logged-in devices</p>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="text-green-600">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Current Device</p>
                  <p className="text-sm text-slate-500">Chrome on Mac • Active now</p>
                </div>
              </div>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Current</span>
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="text-slate-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">iPhone</p>
                  <p className="text-sm text-slate-500">Safari • Last active 2 hours ago</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Sign Out
              </Button>
            </div>

            <div className="pt-4">
              <Button variant="outline" className="text-red-600 hover:text-red-700">
                Sign Out All Other Devices
              </Button>
            </div>
          </div>
        </Tile>

        {/* Privacy Settings */}
        <Tile>
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">Privacy Settings</h3>
            <p className="text-sm text-slate-600 mt-1">Control your data and privacy</p>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900">Data Collection Notice</p>
                <p className="text-sm text-amber-700 mt-1">
                  We collect minimal data necessary for app functionality. You can review and export your data anytime.
                </p>
              </div>
            </div>

            <div className="flex justify-between gap-4">
              <Button variant="outline">View Privacy Policy</Button>
              <Button variant="outline">Download My Data</Button>
            </div>
          </div>
        </Tile>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button variant="coral" onClick={handleSave}>
            Save Security Settings
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
