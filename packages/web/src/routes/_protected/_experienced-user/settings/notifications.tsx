import { createFileRoute } from '@tanstack/react-router';
import { Bell, Mail, Smartphone, Volume2 } from 'lucide-react';
import { useState } from 'react';

import { PageLayout, Switch, Button, Tile } from '../../../../components';

export const Route = createFileRoute('/_protected/_experienced-user/settings/notifications')({
  component: NotificationsComponent,
});

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  inAppSounds: boolean;
  transactionAlerts: boolean;
  budgetAlerts: boolean;
  monthlyReports: boolean;
  securityAlerts: boolean;
  marketingEmails: boolean;
  productUpdates: boolean;
}

function NotificationsComponent() {
  const [settings, setSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    inAppSounds: true,
    transactionAlerts: true,
    budgetAlerts: true,
    monthlyReports: false,
    securityAlerts: true,
    marketingEmails: false,
    productUpdates: true,
  });

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    // Handle save logic here
    alert('Notification settings saved successfully!');
  };

  return (
    <PageLayout background="cream" title="Notifications" showBackButton={true}>
      <div className="space-y-6">
        {/* Delivery Methods */}
        <Tile>
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">Delivery Methods</h3>
            <p className="text-sm text-slate-600 mt-1">Choose how you want to receive notifications</p>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-coral-600">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Email Notifications</p>
                  <p className="text-sm text-slate-500">Receive updates via email</p>
                </div>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
              />
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-coral-600">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Push Notifications</p>
                  <p className="text-sm text-slate-500">Get alerts on your device</p>
                </div>
              </div>
              <Switch
                checked={settings.pushNotifications}
                onCheckedChange={(checked) => updateSetting('pushNotifications', checked)}
              />
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-coral-600">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">SMS Notifications</p>
                  <p className="text-sm text-slate-500">Text messages for important alerts</p>
                </div>
              </div>
              <Switch
                checked={settings.smsNotifications}
                onCheckedChange={(checked) => updateSetting('smsNotifications', checked)}
              />
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-coral-600">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">In-App Sounds</p>
                  <p className="text-sm text-slate-500">Play sounds for notifications</p>
                </div>
              </div>
              <Switch
                checked={settings.inAppSounds}
                onCheckedChange={(checked) => updateSetting('inAppSounds', checked)}
              />
            </div>
          </div>
        </Tile>

        {/* Financial Alerts */}
        <Tile>
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">Financial Alerts</h3>
            <p className="text-sm text-slate-600 mt-1">Stay informed about your money</p>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Transaction Alerts</p>
                <p className="text-sm text-slate-500">Get notified when money moves in or out</p>
              </div>
              <Switch
                checked={settings.transactionAlerts}
                onCheckedChange={(checked) => updateSetting('transactionAlerts', checked)}
              />
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Budget Alerts</p>
                <p className="text-sm text-slate-500">Warnings when approaching budget limits</p>
              </div>
              <Switch
                checked={settings.budgetAlerts}
                onCheckedChange={(checked) => updateSetting('budgetAlerts', checked)}
              />
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Monthly Reports</p>
                <p className="text-sm text-slate-500">Automatic monthly spending summaries</p>
              </div>
              <Switch
                checked={settings.monthlyReports}
                onCheckedChange={(checked) => updateSetting('monthlyReports', checked)}
              />
            </div>
          </div>
        </Tile>

        {/* Security & Updates */}
        <Tile>
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">Security & Updates</h3>
            <p className="text-sm text-slate-600 mt-1">Important notifications and updates</p>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Security Alerts</p>
                <p className="text-sm text-slate-500">Critical security notifications (always enabled)</p>
              </div>
              <Switch
                checked={settings.securityAlerts}
                onCheckedChange={(checked) => updateSetting('securityAlerts', checked)}
                disabled
              />
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Marketing Emails</p>
                <p className="text-sm text-slate-500">Tips, offers, and financial insights</p>
              </div>
              <Switch
                checked={settings.marketingEmails}
                onCheckedChange={(checked) => updateSetting('marketingEmails', checked)}
              />
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Product Updates</p>
                <p className="text-sm text-slate-500">New features and app improvements</p>
              </div>
              <Switch
                checked={settings.productUpdates}
                onCheckedChange={(checked) => updateSetting('productUpdates', checked)}
              />
            </div>
          </div>
        </Tile>

        {/* Notification Schedule */}
        <Tile className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Quiet Hours</h3>
          <p className="text-sm text-slate-600 mb-4">
            Set times when you don't want to receive non-urgent notifications
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Start Time</label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500">
                <option value="22:00">10:00 PM</option>
                <option value="23:00">11:00 PM</option>
                <option value="00:00">12:00 AM</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">End Time</label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500">
                <option value="07:00">7:00 AM</option>
                <option value="08:00">8:00 AM</option>
                <option value="09:00">9:00 AM</option>
              </select>
            </div>
          </div>
        </Tile>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button variant="coral" onClick={handleSave}>
            Save Notification Settings
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
