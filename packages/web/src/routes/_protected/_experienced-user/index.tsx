import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Calendar, BarChart3, CreditCard, Zap, HelpCircle, Star, Tag, ChevronRight } from 'lucide-react';

import { PageLayout, Button, IconButton, Tile } from '../../../components';
import { useDrawerRouterProvider } from '../../../providers/drawer-router';

export const Route = createFileRoute('/_protected/_experienced-user/')({
  component: HomeComponent,
});

// Compact version of accounts overview specifically for home page
function AccountsCompactSummary() {
  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-sage-600">+$5.2K</p>
          <p className="text-xs text-slate-500">Total Net Worth</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-mist-600">+$342</p>
          <p className="text-xs text-slate-500">This Month</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-coral-600">+$78</p>
          <p className="text-xs text-slate-500">This Week</p>
        </div>
      </div>

      {/* Top Active Accounts */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700 mb-2">Most Active</p>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-6 h-6 rounded-full bg-sage-100 flex items-center justify-center">
              <CreditCard className="h-3 w-3 text-sage-600" />
            </div>
            <span className="text-sm text-slate-900 truncate">Main Checking</span>
            <span className="text-xs text-slate-500 flex-shrink-0">Today</span>
          </div>
          <span className="text-sm font-semibold text-sage-600 flex-shrink-0">+$3.2K</span>
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-6 h-6 rounded-full bg-mist-100 flex items-center justify-center">
              <CreditCard className="h-3 w-3 text-mist-600" />
            </div>
            <span className="text-sm text-slate-900 truncate">Savings Account</span>
            <span className="text-xs text-slate-500 flex-shrink-0">2 days ago</span>
          </div>
          <span className="text-sm font-semibold text-sage-600 flex-shrink-0">+$1.8K</span>
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-6 h-6 rounded-full bg-coral-100 flex items-center justify-center">
              <CreditCard className="h-3 w-3 text-coral-600" />
            </div>
            <span className="text-sm text-slate-900 truncate">Credit Card</span>
            <span className="text-xs text-slate-500 flex-shrink-0">1 week ago</span>
          </div>
          <span className="text-sm font-semibold text-coral-600 flex-shrink-0">-$245</span>
        </div>
      </div>
    </div>
  );
}

function HomeComponent() {
  const navigate = useNavigate();
  const { openDrawer } = useDrawerRouterProvider();
  // Quick action handlers
  const handleAddAccount = async () => {
    await openDrawer('add-account');
  };

  const handleViewTransactions = async () => {
    await navigate({ to: '/transactions' });
  };

  const handleViewAnalytics = async () => {
    await navigate({ to: '/analytics' });
  };

  const handleViewCategories = async () => {
    await navigate({ to: '/settings/categories' });
  };

  return (
    <PageLayout background="cream" mainProps={{ padding: 'md' }}>
      <div className="space-y-5">
        {/* Top Branding & Call-to-Action Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          {/* Left: Branding */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-coral-500 rounded-xl shadow-sm">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Spenicle</h1>
              <p className="text-sm text-slate-600">Simplify Spending, Maximize Savings</p>
            </div>
          </div>

          {/* Right: Call-to-Action Elements */}
          <div className="flex items-center justify-between sm:justify-end gap-3">
            {/* Help & Pro Badge */}
            <div className="flex items-center gap-2">
              <IconButton
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:text-mist-600"
                aria-label="Get help"
              >
                <HelpCircle className="h-5 w-5" />
              </IconButton>
            </div>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-6 bg-sage-400 rounded-full"></div>
            <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
            <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">Most Used</div>
          </div>
          <Tile className="p-4">
            {/* Actions Grid - Vertical Icon + Label Design */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* View Transactions */}
              <Button
                variant="ghost"
                className="flex-col h-16 px-3 py-2 hover:bg-white hover:shadow-sm transition-all"
                onClick={handleViewTransactions}
              >
                <div className="p-2 bg-sage-100 rounded-lg mb-1">
                  <Calendar className="h-5 w-5 text-sage-600" />
                </div>
                <span className="text-xs font-medium text-slate-900 text-center leading-tight">Transactions</span>
              </Button>

              {/* Categories */}
              <Button
                variant="ghost"
                className="flex-col h-16 px-3 py-2 hover:bg-white hover:shadow-sm transition-all"
                onClick={handleViewCategories}
              >
                <div className="p-2 bg-coral-100 rounded-lg mb-1">
                  <Tag className="h-5 w-5 text-coral-600" />
                </div>
                <span className="text-xs font-medium text-slate-900 text-center leading-tight">Categories</span>
              </Button>

              {/* Add Account */}
              <Button
                variant="ghost"
                className="flex-col h-16 px-3 py-2 hover:bg-white hover:shadow-sm transition-all"
                onClick={handleAddAccount}
              >
                <div className="p-2 bg-slate-100 rounded-lg mb-1">
                  <CreditCard className="h-5 w-5 text-slate-600" />
                </div>
                <span className="text-xs font-medium text-slate-900 text-center leading-tight">Accounts</span>
              </Button>

              {/* Analytics */}
              <Button
                variant="ghost"
                className="flex-col h-16 px-3 py-2 hover:bg-white hover:shadow-sm transition-all"
                onClick={handleViewAnalytics}
              >
                <div className="p-2 bg-mist-100 rounded-lg mb-1">
                  <BarChart3 className="h-5 w-5 text-mist-600" />
                </div>
                <span className="text-xs font-medium text-slate-900 text-center leading-tight">Analytics</span>
              </Button>
            </div>
          </Tile>
        </div>

        {/* Recent Activity & Insights Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-6 bg-mist-400 rounded-full"></div>
            <h2 className="text-lg font-semibold text-slate-900">Recent Activity & Insights</h2>
            <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">Live Updates</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tracking Progress Card */}
            <Tile className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-mist-100 rounded-lg">
                    <Star className="h-4 w-4 text-mist-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Tracking Streak</p>
                    <p className="text-xs text-slate-500">23 days strong</p>
                  </div>
                </div>
                <IconButton
                  variant="ghost"
                  size="sm"
                  onClick={handleViewAnalytics}
                  className="text-mist-600 hover:text-mist-700"
                  aria-label="View tracking details"
                >
                  <ChevronRight className="h-4 w-4" />
                </IconButton>
              </div>

              <div className="w-full bg-mist-100 rounded-full h-2 mb-2">
                <div
                  className="bg-mist-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: '76%' }}
                ></div>
              </div>

              <div className="flex justify-between text-xs">
                <span className="text-mist-600 font-medium">7 days to milestone</span>
                <span className="text-slate-500">76% complete</span>
              </div>
            </Tile>

            {/* Today's Transactions Card */}
            <Tile className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-coral-100 rounded-lg">
                    <Calendar className="h-4 w-4 text-coral-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Today's Activity</p>
                    <p className="text-xs text-slate-500">3 transactions</p>
                  </div>
                </div>
                <IconButton
                  variant="ghost"
                  size="sm"
                  onClick={handleViewTransactions}
                  className="text-coral-600 hover:text-coral-700"
                  aria-label="View all transactions"
                >
                  <ChevronRight className="h-4 w-4" />
                </IconButton>
              </div>

              <div className="flex flex-row justify-between items-center">
                <p className="text-xs text-slate-500">Total spent today</p>
                <p className="text-md font-bold text-coral-600">-$58.49</p>
              </div>
            </Tile>
          </div>
        </div>

        {/* Account Summary Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-6 bg-slate-400 rounded-full"></div>
            <h2 className="text-lg font-semibold text-slate-900">Account Summary</h2>
            <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">3 Active</div>
          </div>
          <Tile className="p-4">
            <AccountsCompactSummary />
          </Tile>
        </div>
      </div>
    </PageLayout>
  );
}
