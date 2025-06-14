export interface AccountSummaryHeaderProps {
  /**
   * Title for the section
   */
  title?: string;
  /**
   * Number of active accounts to display in badge (for accounts mode)
   */
  activeCount?: number;
  /**
   * Overall health score to display in badge (for health mode)
   */
  healthScore?: number;
  /**
   * Display mode to determine what badge to show
   */
  mode?: 'accounts' | 'health';
}

/**
 * AccountSummaryHeader displays the section header with title and contextual badge.
 * Shows either active account count or overall health score based on mode.
 */
export function AccountSummaryHeader({
  title = 'Account Summary',
  activeCount = 3,
  healthScore,
  mode = 'accounts',
}: AccountSummaryHeaderProps) {
  // Determine badge content and style based on mode
  const getBadgeContent = () => {
    if (mode === 'health' && healthScore !== undefined) {
      const getHealthColor = (score: number) => {
        if (score >= 85) return 'bg-success-100 text-success-600';
        if (score >= 70) return 'bg-sage-100 text-sage-600';
        if (score >= 50) return 'bg-warning-100 text-warning-600';
        return 'bg-danger-100 text-danger-600';
      };

      return {
        text: `${Math.round(healthScore)}% Health`,
        className: getHealthColor(healthScore),
      };
    }

    return {
      text: `${activeCount} Active`,
      className: 'text-slate-500 bg-slate-100',
    };
  };

  const badge = getBadgeContent();

  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-6 bg-slate-400 rounded-full"></div>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className={`text-xs px-2 py-1 rounded-full ${badge.className}`}>{badge.text}</div>
    </div>
  );
}
