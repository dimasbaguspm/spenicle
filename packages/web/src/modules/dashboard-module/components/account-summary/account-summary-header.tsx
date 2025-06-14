export interface AccountSummaryHeaderProps {
  /**
   * Title for the section
   */
  title?: string;
  /**
   * Number of active accounts to display in badge
   */
  activeCount?: number;
}

/**
 * AccountSummaryHeader displays the section header with title and active count badge.
 */
export function AccountSummaryHeader({ title = 'Account Summary', activeCount = 3 }: AccountSummaryHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-6 bg-slate-400 rounded-full"></div>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{activeCount} Active</div>
    </div>
  );
}
