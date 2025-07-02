import type { ReactElement } from 'react';

import { DataTableEmptyState } from './data-table-empty-state';
import type { DataTableProps } from './types';

/**
 * Generic data table component with CSS Grid layout, sorting, custom rendering, and empty states.
 * Supports flexible column configuration and is fully typed.
 * Uses CSS Grid as the default and only layout system for better responsive design.
 */
export const DataTable = <T,>({
  data,
  columns,
  sortConfig,
  onSort,
  emptyMessage = 'No data available',
  emptyDescription,
  className = '',
  rowClassName: _rowClassName,
  loading = false,
}: DataTableProps<T>): ReactElement => {
  if (loading) {
    return (
      <div className={`overflow-x-auto ${className}`}>
        <DataTableEmptyState message="Loading..." />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`overflow-x-auto ${className}`}>
        <DataTableEmptyState message={emptyMessage} description={emptyDescription} />
      </div>
    );
  }

  // Generate CSS Grid template columns based on column configuration
  const gridTemplateColumns = columns
    .map((col) => {
      // Handle predefined grid column spans
      if (col.gridColumn?.includes('span 5')) return 'minmax(300px, 5fr)';
      if (col.gridColumn?.includes('span 4')) return 'minmax(250px, 4fr)';
      if (col.gridColumn?.includes('span 3')) return 'minmax(200px, 3fr)';
      if (col.gridColumn?.includes('span 2')) return 'minmax(150px, 2fr)';
      if (col.gridColumn?.includes('span 1')) return 'minmax(100px, 1fr)';

      // Handle custom width or default to 1fr
      if (col.width) {
        // Convert pixel values to minmax for better responsiveness
        if (col.width.includes('px')) {
          const pxValue = col.width.replace('px', '');
          return `minmax(${pxValue}px, ${pxValue}px)`;
        }
        return col.width;
      }

      return '1fr';
    })
    .join(' ');

  return (
    <div className={`overflow-x-auto ${className}`}>
      <div className="grid gap-px bg-mist-100 rounded-lg overflow-hidden" style={{ gridTemplateColumns }}>
        {/* Header row */}
        {columns.map((column) => (
          <div
            key={String(column.key)}
            className={`
              py-3 px-4 font-medium text-sm text-slate-700 bg-mist-50 
              ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}
              first:rounded-tl-lg last:rounded-tr-lg
            `}
          >
            {column.sortable && onSort ? (
              <button
                onClick={() => onSort(column.key)}
                className="flex items-center gap-1 hover:text-slate-900 transition-colors w-full justify-start"
                style={{
                  justifyContent:
                    column.align === 'center' ? 'center' : column.align === 'right' ? 'flex-end' : 'flex-start',
                }}
              >
                {column.label}
                {sortConfig?.field === column.key && (
                  <span className="text-xs text-coral-600">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
            ) : (
              column.label
            )}
          </div>
        ))}

        {/* Data rows */}
        {data.map((row, index) =>
          columns.map((column, colIndex) => (
            <div
              key={`${index}-${String(column.key)}`}
              className={`
                py-3 px-4 bg-white hover:bg-cream-50 transition-colors
                ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}
                ${index === data.length - 1 && colIndex === 0 ? 'rounded-bl-lg' : ''}
                ${index === data.length - 1 && colIndex === columns.length - 1 ? 'rounded-br-lg' : ''}
              `}
            >
              {column.render ? column.render(row[column.key], row, index) : String(row[column.key])}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
