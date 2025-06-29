import type { PanelType } from '../hooks';

import { DesktopSummaryPanelNavigation } from './desktop-summary-panel-navigation';
import { DesktopSummaryPeriodSelector } from './desktop-summary-period-selector';

interface PanelConfig {
  title: string;
  description: string;
  badge: string;
}

interface DesktopSummarySidebarProps {
  // computed period values for display
  currentPeriodDisplay: string;
  isCurrentPeriod: boolean;

  // panel navigation props
  selectedPanel: PanelType;
  panelConfig: Record<PanelType, PanelConfig>;
  onPanelNavigation: (panel: PanelType) => Promise<void>;
}

export const DesktopSummarySidebar = ({
  currentPeriodDisplay,
  isCurrentPeriod,
  selectedPanel,
  panelConfig,
  onPanelNavigation,
}: DesktopSummarySidebarProps) => {
  return (
    <div className="col-span-3 space-y-4 sticky top-6 self-start h-fit max-h-[calc(100vh-12rem)] overflow-y-auto">
      {/* period selection controls - primary control */}
      <DesktopSummaryPeriodSelector currentPeriodDisplay={currentPeriodDisplay} isCurrentPeriod={isCurrentPeriod} />

      {/* analysis panel navigation - secondary control */}
      <DesktopSummaryPanelNavigation
        selectedPanel={selectedPanel}
        panelConfig={panelConfig}
        onPanelNavigation={onPanelNavigation}
      />
    </div>
  );
};
