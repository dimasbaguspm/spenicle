import { createFileRoute } from '@tanstack/react-router';
import { Download, FileText, Database, Trash2, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useState } from 'react';

import { PageLayout, Button, Switch, Tile } from '../../../../components';

export const Route = createFileRoute('/_protected/_experienced-user/settings/data-export')({
  component: DataExportComponent,
});

interface ExportRequest {
  id: string;
  type: string;
  format: string;
  dateRange: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  downloadUrl?: string;
}

interface DataSettings {
  autoBackup: boolean;
  backupFrequency: string;
  retentionPeriod: string;
}

function DataExportComponent() {
  const [exportRequests, setExportRequests] = useState<ExportRequest[]>([
    {
      id: '1',
      type: 'All Data',
      format: 'JSON',
      dateRange: 'All time',
      status: 'completed',
      createdAt: '2024-01-15',
      downloadUrl: '#',
    },
    {
      id: '2',
      type: 'Transactions',
      format: 'CSV',
      dateRange: 'Last 6 months',
      status: 'processing',
      createdAt: '2024-01-14',
    },
  ]);

  const [settings, setSettings] = useState<DataSettings>({
    autoBackup: true,
    backupFrequency: 'monthly',
    retentionPeriod: '7years',
  });

  const [exportForm, setExportForm] = useState({
    dataType: 'all',
    format: 'json',
    dateRange: 'all',
    customStartDate: '',
    customEndDate: '',
  });

  const handleRequestExport = () => {
    const newRequest: ExportRequest = {
      id: Date.now().toString(),
      type: exportForm.dataType === 'all' ? 'All Data' : 'Transactions',
      format: exportForm.format.toUpperCase(),
      dateRange:
        exportForm.dateRange === 'custom'
          ? `${exportForm.customStartDate} to ${exportForm.customEndDate}`
          : exportForm.dateRange === 'all'
            ? 'All time'
            : exportForm.dateRange,
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0],
    };

    setExportRequests((prev) => [newRequest, ...prev]);
    alert('Export request submitted successfully!');
  };

  const handleDownload = (requestId: string) => {
    // Handle download logic here
    alert(`Downloading export ${requestId}...`);
  };

  const handleDeleteAccount = () => {
    if (
      window.confirm(
        'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.'
      )
    ) {
      alert('Account deletion process initiated. You will receive an email with next steps.');
    }
  };

  const getStatusIcon = (status: ExportRequest['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <PageLayout background="cream" title="Data & Export" showBackButton={true}>
      <div className="space-y-6">
        {/* Export Data */}
        <Tile className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Download className="w-5 h-5 text-coral-600" />
              Export Your Data
            </h3>
            <p className="text-sm text-slate-600 mt-1">Download your personal data in various formats</p>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Data Type</label>
                <select
                  value={exportForm.dataType}
                  onChange={(e) => setExportForm({ ...exportForm, dataType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                >
                  <option value="all">All Data</option>
                  <option value="transactions">Transactions Only</option>
                  <option value="budgets">Budgets Only</option>
                  <option value="categories">Categories Only</option>
                  <option value="profile">Profile Information</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Format</label>
                <select
                  value={exportForm.format}
                  onChange={(e) => setExportForm({ ...exportForm, format: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                >
                  <option value="json">JSON (Machine readable)</option>
                  <option value="csv">CSV (Spreadsheet)</option>
                  <option value="pdf">PDF (Human readable)</option>
                  <option value="xlsx">Excel (XLSX)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Date Range</label>
              <select
                value={exportForm.dateRange}
                onChange={(e) => setExportForm({ ...exportForm, dateRange: e.target.value })}
                className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
              >
                <option value="all">All time</option>
                <option value="Last 30 days">Last 30 days</option>
                <option value="Last 3 months">Last 3 months</option>
                <option value="Last 6 months">Last 6 months</option>
                <option value="Last year">Last year</option>
                <option value="custom">Custom range</option>
              </select>
            </div>

            {exportForm.dateRange === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={exportForm.customStartDate}
                    onChange={(e) => setExportForm({ ...exportForm, customStartDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={exportForm.customEndDate}
                    onChange={(e) => setExportForm({ ...exportForm, customEndDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                  />
                </div>
              </div>
            )}

            <div className="pt-4">
              <Button variant="coral" onClick={handleRequestExport}>
                Request Export
              </Button>
            </div>
          </div>
        </Tile>

        {/* Export History */}
        <Tile className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">Export History</h3>
            <p className="text-sm text-slate-600 mt-1">Your recent data export requests</p>
          </div>

          <div className="divide-y divide-slate-100">
            {exportRequests.map((request) => (
              <div key={request.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getStatusIcon(request.status)}
                  <div>
                    <p className="font-medium text-slate-900">
                      {request.type} ({request.format})
                    </p>
                    <p className="text-sm text-slate-500">
                      {request.dateRange} • Requested {request.createdAt}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      request.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : request.status === 'processing'
                          ? 'bg-blue-100 text-blue-800'
                          : request.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                  {request.status === 'completed' && (
                    <Button variant="outline" size="sm" onClick={() => handleDownload(request.id)}>
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {exportRequests.length === 0 && (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No export requests yet</p>
                <p className="text-sm text-slate-400 mt-2">Your export history will appear here</p>
              </div>
            )}
          </div>
        </Tile>

        {/* Data Backup Settings */}
        <Tile className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-coral-600" />
              Backup Settings
            </h3>
            <p className="text-sm text-slate-600 mt-1">Automatic backup and data retention preferences</p>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Automatic Backups</p>
                <p className="text-sm text-slate-500">Automatically create backups of your data</p>
              </div>
              <Switch
                checked={settings.autoBackup}
                onCheckedChange={(checked) => setSettings({ ...settings, autoBackup: checked })}
              />
            </div>

            {settings.autoBackup && (
              <>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-slate-900">Backup Frequency</p>
                      <p className="text-sm text-slate-500">How often to create backups</p>
                    </div>
                  </div>
                  <select
                    value={settings.backupFrequency}
                    onChange={(e) => setSettings({ ...settings, backupFrequency: e.target.value })}
                    className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-slate-900">Backup Retention</p>
                      <p className="text-sm text-slate-500">How long to keep backup files</p>
                    </div>
                  </div>
                  <select
                    value={settings.retentionPeriod}
                    onChange={(e) => setSettings({ ...settings, retentionPeriod: e.target.value })}
                    className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                  >
                    <option value="30days">30 days</option>
                    <option value="6months">6 months</option>
                    <option value="1year">1 year</option>
                    <option value="7years">7 years</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </Tile>

        {/* Data Usage */}
        <Tile className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">Data Usage</h3>
            <p className="text-sm text-slate-600 mt-1">Overview of your stored data</p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border border-slate-200 rounded-lg">
                <p className="text-2xl font-bold text-coral-600">1,247</p>
                <p className="text-sm text-slate-600">Transactions</p>
              </div>
              <div className="text-center p-4 border border-slate-200 rounded-lg">
                <p className="text-2xl font-bold text-coral-600">15</p>
                <p className="text-sm text-slate-600">Categories</p>
              </div>
              <div className="text-center p-4 border border-slate-200 rounded-lg">
                <p className="text-2xl font-bold text-coral-600">2.4 MB</p>
                <p className="text-sm text-slate-600">Total Storage</p>
              </div>
            </div>
          </div>
        </Tile>

        {/* Account Deletion */}
        <Tile className="bg-red-50 border border-red-200 rounded-lg">
          <div className="p-6 border-b border-red-200">
            <h3 className="text-lg font-semibold text-red-900 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Delete Account
            </h3>
            <p className="text-sm text-red-700 mt-1">Permanently delete your account and all associated data</p>
          </div>

          <div className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Warning: This action cannot be undone</p>
                <ul className="text-sm text-red-700 mt-2 space-y-1">
                  <li>• All your transaction data will be permanently deleted</li>
                  <li>• Your account will be immediately deactivated</li>
                  <li>• You will lose access to all premium features</li>
                  <li>• This action cannot be reversed or undone</li>
                </ul>
              </div>
            </div>

            <p className="text-sm text-red-700 mb-4">
              Before deleting your account, we recommend exporting your data. You have 30 days to change your mind after
              initiating deletion.
            </p>

            <Button
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
              onClick={handleDeleteAccount}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </Tile>
      </div>
    </PageLayout>
  );
}
