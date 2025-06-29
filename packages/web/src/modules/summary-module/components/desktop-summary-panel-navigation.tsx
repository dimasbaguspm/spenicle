import { Badge, Tile } from '../../../components';

interface PanelConfig {
  title: string;
  description: string;
  badge: string;
}

interface DesktopSummaryPanelNavigationProps {
  selectedPanel: 'period' | 'categories' | 'accounts';
  panelConfig: Record<'period' | 'categories' | 'accounts', PanelConfig>;
  onPanelNavigation: (panel: 'period' | 'categories' | 'accounts') => Promise<void>;
}

export const DesktopSummaryPanelNavigation = ({
  selectedPanel,
  panelConfig,
  onPanelNavigation,
}: DesktopSummaryPanelNavigationProps) => {
  return (
    <Tile className="p-4">
      <div className="space-y-1 mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Analysis Panels</h3>
        <p className="text-sm text-slate-500">Select an analysis view</p>
      </div>

      <div className="space-y-2">
        {Object.entries(panelConfig).map(([key, config]) => (
          <button
            key={key}
            onClick={() => onPanelNavigation(key as typeof selectedPanel)}
            className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
              selectedPanel === key
                ? 'bg-coral-50 border-coral-200 border text-coral-900 shadow-sm'
                : 'hover:bg-mist-50 text-slate-700 border border-transparent hover:border-mist-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm">{config.title}</span>
              <Badge variant={selectedPanel === key ? 'coral' : 'mist'} size="sm">
                {config.badge}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">{config.description}</p>
          </button>
        ))}
      </div>
    </Tile>
  );
};
