import type { FC } from 'react';

interface DataTableEmptyStateProps {
  message: string;
  description?: string;
}

export const DataTableEmptyState: FC<DataTableEmptyStateProps> = ({ message, description }) => {
  return (
    <div className="text-center py-8 bg-cream-50 rounded-lg border border-mist-100">
      <p className="text-slate-500 font-medium">{message}</p>
      {description && <p className="text-sm text-slate-400">{description}</p>}
    </div>
  );
};
