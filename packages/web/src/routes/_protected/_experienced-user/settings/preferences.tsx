import { createFileRoute } from '@tanstack/react-router';
import { Settings, Palette, Globe, Moon, Sun, Monitor } from 'lucide-react';
import { useState } from 'react';

import { PageLayout, Switch, Button, Tile } from '../../../../components';

export const Route = createFileRoute('/_protected/_experienced-user/settings/preferences')({
  component: PreferencesComponent,
});

interface AppPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  currency: string;
  dateFormat: string;
  startOfWeek: string;
  compactMode: boolean;
  animationsEnabled: boolean;
  soundEnabled: boolean;
  budgetWarnings: boolean;
  categoryIcons: boolean;
  quickActions: boolean;
  chartType: 'bar' | 'pie' | 'line';
}

function PreferencesComponent() {
  const [preferences, setPreferences] = useState<AppPreferences>({
    theme: 'system',
    language: 'en',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    startOfWeek: 'sunday',
    compactMode: false,
    animationsEnabled: true,
    soundEnabled: true,
    budgetWarnings: true,
    categoryIcons: true,
    quickActions: true,
    chartType: 'bar',
  });

  const updatePreference = <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    // Handle save logic here
    alert('Preferences saved successfully!');
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all preferences to default?')) {
      setPreferences({
        theme: 'system',
        language: 'en',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        startOfWeek: 'sunday',
        compactMode: false,
        animationsEnabled: true,
        soundEnabled: true,
        budgetWarnings: true,
        categoryIcons: true,
        quickActions: true,
        chartType: 'bar',
      });
    }
  };

  return (
    <PageLayout background="cream" title="App Preferences" showBackButton={true}>
      <div className="space-y-6">
        {/* Appearance */}
        <Tile>
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Palette className="w-5 h-5 text-coral-600" />
              Appearance
            </h3>
            <p className="text-sm text-slate-600 mt-1">Customize how the app looks</p>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-slate-900">Theme</p>
                  <p className="text-sm text-slate-500">Choose your preferred theme</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <button
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    preferences.theme === 'light'
                      ? 'border-coral-500 bg-coral-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => updatePreference('theme', 'light')}
                >
                  <Sun className="w-5 h-5 mx-auto mb-2 text-yellow-600" />
                  <p className="text-sm font-medium">Light</p>
                </button>
                <button
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    preferences.theme === 'dark'
                      ? 'border-coral-500 bg-coral-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => updatePreference('theme', 'dark')}
                >
                  <Moon className="w-5 h-5 mx-auto mb-2 text-slate-600" />
                  <p className="text-sm font-medium">Dark</p>
                </button>
                <button
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    preferences.theme === 'system'
                      ? 'border-coral-500 bg-coral-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => updatePreference('theme', 'system')}
                >
                  <Monitor className="w-5 h-5 mx-auto mb-2 text-slate-600" />
                  <p className="text-sm font-medium">System</p>
                </button>
              </div>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Compact Mode</p>
                <p className="text-sm text-slate-500">Show more content in less space</p>
              </div>
              <Switch
                checked={preferences.compactMode}
                onCheckedChange={(checked) => updatePreference('compactMode', checked)}
              />
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Animations</p>
                <p className="text-sm text-slate-500">Enable smooth transitions and animations</p>
              </div>
              <Switch
                checked={preferences.animationsEnabled}
                onCheckedChange={(checked) => updatePreference('animationsEnabled', checked)}
              />
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Category Icons</p>
                <p className="text-sm text-slate-500">Show icons for spending categories</p>
              </div>
              <Switch
                checked={preferences.categoryIcons}
                onCheckedChange={(checked) => updatePreference('categoryIcons', checked)}
              />
            </div>
          </div>
        </Tile>

        {/* Localization */}
        <Tile>
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-coral-600" />
              Localization
            </h3>
            <p className="text-sm text-slate-600 mt-1">Language and regional settings</p>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-slate-900">Language</p>
                  <p className="text-sm text-slate-500">Choose your language</p>
                </div>
              </div>
              <select
                value={preferences.language}
                onChange={(e) => updatePreference('language', e.target.value)}
                className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="it">Italiano</option>
                <option value="pt">Português</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
                <option value="zh">中文</option>
              </select>
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-slate-900">Currency</p>
                  <p className="text-sm text-slate-500">Default currency for display</p>
                </div>
              </div>
              <select
                value={preferences.currency}
                onChange={(e) => updatePreference('currency', e.target.value)}
                className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="JPY">JPY - Japanese Yen</option>
                <option value="CAD">CAD - Canadian Dollar</option>
                <option value="AUD">AUD - Australian Dollar</option>
                <option value="CHF">CHF - Swiss Franc</option>
                <option value="CNY">CNY - Chinese Yuan</option>
              </select>
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-slate-900">Date Format</p>
                  <p className="text-sm text-slate-500">How dates are displayed</p>
                </div>
              </div>
              <select
                value={preferences.dateFormat}
                onChange={(e) => updatePreference('dateFormat', e.target.value)}
                className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (UK)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                <option value="DD.MM.YYYY">DD.MM.YYYY (German)</option>
              </select>
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-slate-900">Start of Week</p>
                  <p className="text-sm text-slate-500">First day of the week in calendars</p>
                </div>
              </div>
              <select
                value={preferences.startOfWeek}
                onChange={(e) => updatePreference('startOfWeek', e.target.value)}
                className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
              >
                <option value="sunday">Sunday</option>
                <option value="monday">Monday</option>
                <option value="saturday">Saturday</option>
              </select>
            </div>
          </div>
        </Tile>

        {/* Functionality */}
        <Tile>
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-coral-600" />
              Functionality
            </h3>
            <p className="text-sm text-slate-600 mt-1">Control app behavior and features</p>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Sound Effects</p>
                <p className="text-sm text-slate-500">Play sounds for actions and notifications</p>
              </div>
              <Switch
                checked={preferences.soundEnabled}
                onCheckedChange={(checked) => updatePreference('soundEnabled', checked)}
              />
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Budget Warnings</p>
                <p className="text-sm text-slate-500">Show warnings when approaching budget limits</p>
              </div>
              <Switch
                checked={preferences.budgetWarnings}
                onCheckedChange={(checked) => updatePreference('budgetWarnings', checked)}
              />
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Quick Actions</p>
                <p className="text-sm text-slate-500">Show quick action buttons in lists</p>
              </div>
              <Switch
                checked={preferences.quickActions}
                onCheckedChange={(checked) => updatePreference('quickActions', checked)}
              />
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-slate-900">Default Chart Type</p>
                  <p className="text-sm text-slate-500">Preferred chart style for reports</p>
                </div>
              </div>
              <select
                value={preferences.chartType}
                onChange={(e) => updatePreference('chartType', e.target.value as 'bar' | 'pie' | 'line')}
                className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
              >
                <option value="bar">Bar Chart</option>
                <option value="pie">Pie Chart</option>
                <option value="line">Line Chart</option>
              </select>
            </div>
          </div>
        </Tile>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button variant="coral" onClick={handleSave}>
            Save Preferences
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
