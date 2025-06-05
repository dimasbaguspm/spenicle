import React from 'react';

export const ExpenseNotFoundCard: React.FC = () => (
  <div className="flex items-center justify-between opacity-60">
    <div className="flex items-center gap-3">
      <div className="w-4 h-4 rounded bg-slate-200" />
      <span className="font-medium text-slate-500">No transactions found</span>
    </div>
    <div className="text-right">
      <p className="font-bold text-slate-500">$0</p>
      <p className="text-sm text-slate-400">0% • 0 txns</p>
    </div>
  </div>
);
