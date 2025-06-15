import { Zap, HelpCircle } from 'lucide-react';

import { IconButton } from '../../../../components';

export function Header() {
  return (
    <div className="flex flex-row items-center justify-between gap-4 mb-6">
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
          <IconButton variant="ghost" size="sm" className="text-slate-600 hover:text-mist-600" aria-label="Get help">
            <HelpCircle className="h-5 w-5" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
