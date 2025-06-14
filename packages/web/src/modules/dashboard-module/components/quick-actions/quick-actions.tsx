import { Button, Tile } from '../../../../components';

import type { QuickActionsProps } from './types';

export function QuickActions({ actions, title = 'Quick Actions', subtitle = 'Most Used' }: QuickActionsProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-6 bg-sage-400 rounded-full"></div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle && (
          <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full h-5 flex items-center">
            {subtitle}
          </div>
        )}
      </div>

      <Tile className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant="ghost"
              className="flex-col h-16 px-3 py-2 hover:bg-slate-50 transition-colors duration-200 focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
              onClick={action.onClick}
              disabled={action.disabled}
            >
              <div
                className={`p-2 rounded-lg mb-1 transition-colors ${
                  action.iconBgColor ?? 'bg-slate-100 hover:bg-slate-200'
                }`}
              >
                <action.icon className={`h-5 w-5 ${action.iconColor ?? 'text-slate-600'}`} />
              </div>
              <span className="text-xs font-medium text-slate-900 text-center leading-tight">{action.label}</span>
            </Button>
          ))}
        </div>
      </Tile>
    </div>
  );
}
