import { createFileRoute } from '@tanstack/react-router';

import { Button, PageLayout, TextInput, Select, TextArea } from '../../../components';

export const Route = createFileRoute('/_protected/_experienced-user/add')({
  component: AddTransactionComponent,
});

function AddTransactionComponent() {
  return (
    <PageLayout background="cream" title="Add Transaction" showBackButton={true}>
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <form className="space-y-6">
            {/* Amount Input */}
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-2">
                Amount
              </label>
              <TextInput id="amount" type="number" placeholder="0.00" step="0.01" className="text-lg font-semibold" />
            </div>

            {/* Transaction Type */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-slate-700 mb-2">
                Transaction Type
              </label>
              <Select id="type" placeholder="Select type">
                <option value="expense">💸 Expense</option>
                <option value="income">💰 Income</option>
                <option value="transfer">🔄 Transfer</option>
              </Select>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-2">
                Category
              </label>
              <Select id="category" placeholder="Select category">
                <option value="food">🍽️ Food & Dining</option>
                <option value="transport">🚗 Transportation</option>
                <option value="shopping">🛍️ Shopping</option>
                <option value="entertainment">🎬 Entertainment</option>
                <option value="bills">📄 Bills & Utilities</option>
                <option value="health">🏥 Healthcare</option>
                <option value="education">📚 Education</option>
                <option value="travel">✈️ Travel</option>
                <option value="other">📦 Other</option>
              </Select>
            </div>

            {/* Account */}
            <div>
              <label htmlFor="account" className="block text-sm font-medium text-slate-700 mb-2">
                Account
              </label>
              <Select id="account" placeholder="Select account">
                <option value="checking">🏦 Checking Account</option>
                <option value="savings">💰 Savings Account</option>
                <option value="credit">💳 Credit Card</option>
                <option value="cash">💵 Cash</option>
              </Select>
            </div>

            {/* Date */}
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-slate-700 mb-2">
                Date
              </label>
              <TextInput id="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <TextArea id="description" placeholder="Enter transaction description..." rows={3} />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button variant="coral" className="flex-1">
                Add Transaction
              </Button>
              <Button variant="outline" className="flex-1">
                Save as Draft
              </Button>
            </div>
          </form>
        </div>

        {/* Quick Add Buttons */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Add</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="sage-outline" className="h-16 flex flex-col gap-1">
              <span className="text-2xl">☕</span>
              <span className="text-sm">Coffee</span>
            </Button>
            <Button variant="sage-outline" className="h-16 flex flex-col gap-1">
              <span className="text-2xl">🛒</span>
              <span className="text-sm">Groceries</span>
            </Button>
            <Button variant="sage-outline" className="h-16 flex flex-col gap-1">
              <span className="text-2xl">⛽</span>
              <span className="text-sm">Gas</span>
            </Button>
            <Button variant="sage-outline" className="h-16 flex flex-col gap-1">
              <span className="text-2xl">🍽️</span>
              <span className="text-sm">Dining</span>
            </Button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
