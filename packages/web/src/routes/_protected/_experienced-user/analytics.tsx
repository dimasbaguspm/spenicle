import { createFileRoute } from '@tanstack/react-router';

import { PageLayout, Select, Button, Badge, RadialProgress } from '../../../components';

export const Route = createFileRoute('/_protected/_experienced-user/analytics')({
  component: AnalyticsComponent,
});

function AnalyticsComponent() {
  return (
    <PageLayout
      background="cream"
      title="Analytics"
      showBackButton={true}
      rightContent={
        <Select defaultValue="this-month">
          <option value="this-week">This Week</option>
          <option value="this-month">This Month</option>
          <option value="last-month">Last Month</option>
          <option value="this-year">This Year</option>
        </Select>
      }
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-sm font-medium text-slate-500 mb-2">Total Spent</h3>
            <p className="text-2xl font-bold text-red-600">$1,850.00</p>
            <p className="text-sm text-red-500 mt-1">↑ 12% from last month</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-sm font-medium text-slate-500 mb-2">Total Income</h3>
            <p className="text-2xl font-bold text-green-600">$3,200.00</p>
            <p className="text-sm text-green-500 mt-1">→ Same as last month</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-sm font-medium text-slate-500 mb-2">Net Savings</h3>
            <p className="text-2xl font-bold text-blue-600">$1,350.00</p>
            <p className="text-sm text-green-500 mt-1">↑ 25% from last month</p>
          </div>
        </div>

        {/* Spending by Category */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Spending by Category</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="font-medium text-slate-900">Food & Dining</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">$650.00</p>
                  <p className="text-sm text-slate-500">35%</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="font-medium text-slate-900">Transportation</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">$380.00</p>
                  <p className="text-sm text-slate-500">20%</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="font-medium text-slate-900">Shopping</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">$285.00</p>
                  <p className="text-sm text-slate-500">15%</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span className="font-medium text-slate-900">Entertainment</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">$240.00</p>
                  <p className="text-sm text-slate-500">13%</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-purple-500 rounded"></div>
                  <span className="font-medium text-slate-900">Bills & Utilities</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">$295.00</p>
                  <p className="text-sm text-slate-500">17%</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <RadialProgress value={75} size="lg" color="blue">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900">75%</p>
                  <p className="text-sm text-slate-500">of budget used</p>
                </div>
              </RadialProgress>
            </div>
          </div>
        </div>

        {/* Budget Progress */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Budget Progress</h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-slate-900">Food & Dining</span>
                <span className="text-sm text-slate-500">$650 / $800</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full" style={{ width: '81%' }}></div>
              </div>
              <div className="flex justify-between items-center mt-1">
                <Badge variant="warning">81% used</Badge>
                <span className="text-sm text-slate-500">$150 remaining</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-slate-900">Transportation</span>
                <span className="text-sm text-slate-500">$380 / $500</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '76%' }}></div>
              </div>
              <div className="flex justify-between items-center mt-1">
                <Badge variant="success">76% used</Badge>
                <span className="text-sm text-slate-500">$120 remaining</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-slate-900">Entertainment</span>
                <span className="text-sm text-slate-500">$240 / $300</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '80%' }}></div>
              </div>
              <div className="flex justify-between items-center mt-1">
                <Badge variant="warning">80% used</Badge>
                <span className="text-sm text-slate-500">$60 remaining</span>
              </div>
            </div>
          </div>
        </div>

        {/* Spending Trends */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Spending Trends</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-slate-900 mb-3">Daily Average</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">This Month</span>
                  <span className="font-bold text-slate-900">$62.85</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Last Month</span>
                  <span className="font-bold text-slate-900">$58.20</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Difference</span>
                  <span className="font-bold text-red-600">+$4.65</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-slate-900 mb-3">Top Spending Days</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Weekends</span>
                  <span className="font-bold text-slate-900">$85.40</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Weekdays</span>
                  <span className="font-bold text-slate-900">$52.30</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Friday</span>
                  <span className="font-bold text-slate-900">$95.20</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="coral" className="flex-1">
            Export Report
          </Button>
          <Button variant="outline" className="flex-1">
            Set Budget Goals
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
