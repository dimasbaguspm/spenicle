import { Text, Tile } from '@dimasbaguspm/versaur/primitive';

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
    <Tile>
      <div className="space-y-1 mb-6">
        <Text as="h3" fontSize="lg" fontWeight="semibold">
          Analysis Panels
        </Text>
        <Text as="p" fontSize="sm">
          Select an analysis view
        </Text>
      </div>

      <div className="space-y-2">
        {Object.entries(panelConfig).map(([key, config]) => (
          <Tile
            role="button"
            key={key}
            onClick={() => onPanelNavigation(key as typeof selectedPanel)}
            variant={selectedPanel === key ? 'primary' : 'white'}
            size="sm"
          >
            <Text as="span" fontWeight="medium" fontSize="sm">
              {config.title}
            </Text>
            <Text as="p" fontSize="xs">
              {config.description}
            </Text>
          </Tile>
        ))}
      </div>
    </Tile>
  );
};
