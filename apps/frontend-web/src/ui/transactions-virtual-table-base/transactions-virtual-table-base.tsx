import { cx } from "class-variance-authority";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  memo,
  useCallback,
  useRef,
  useEffect,
  type FC,
  type ReactNode,
} from "react";
import type { TransactionModel } from "@/types/schemas";

export interface TableColumn {
  key: string;
  label: string;
  width: number;
  align: "left" | "right";
}

interface TransactionsVirtualTableBaseProps {
  transactions: TransactionModel[];
  columns: TableColumn[];
  renderCell: (
    transaction: TransactionModel,
    columnKey: string,
    rowIndex: number,
  ) => ReactNode;
  onRowClick?: (transaction: TransactionModel) => void;
  isClickable?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onFetchNextPage?: () => void;
}

const OVERSCAN = 5;

export const TransactionsVirtualTableBase: FC<TransactionsVirtualTableBaseProps> =
  memo(
    ({
      transactions,
      columns,
      renderCell,
      onRowClick,
      isClickable = true,
      hasNextPage,
      isFetchingNextPage,
      onFetchNextPage,
    }) => {
      const parentRef = useRef<HTMLDivElement>(null);

      const estimateSize = useCallback(
        (index: number) => {
          const transaction = transactions[index];
          if (!transaction?.note) return 48;

          const noteLength = transaction.note.length;
          if (noteLength > 100) return 80;
          if (noteLength > 50) return 64;
          return 48;
        },
        [transactions],
      );

      const rowVirtualizer = useVirtualizer({
        count: transactions.length,
        getScrollElement: () => parentRef.current,
        estimateSize,
        overscan: OVERSCAN,
        useAnimationFrameWithResizeObserver: true,
      });

      // Fetch next page when scrolled near the bottom
      useEffect(() => {
        if (!hasNextPage || isFetchingNextPage || !onFetchNextPage) return;

        const virtualItems = rowVirtualizer.getVirtualItems();
        if (virtualItems.length === 0) return;

        const lastItem = virtualItems[virtualItems.length - 1];
        if (!lastItem) return;

        // Fetch next page when last visible item is within 5 items of the end
        const shouldFetchNextPage =
          lastItem.index >= transactions.length - 1 - 5;

        if (shouldFetchNextPage) {
          onFetchNextPage();
        }
      }, [
        hasNextPage,
        isFetchingNextPage,
        onFetchNextPage,
        rowVirtualizer.getVirtualItems(),
        transactions.length,
      ]);

      const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);

      return (
        <div
          ref={parentRef}
          className="h-full min-h-0 overflow-x-auto overflow-y-auto border border-border rounded-lg"
          style={{ scrollbarGutter: "stable" }}
        >
          <table
            className="w-full"
            style={{
              tableLayout: "fixed",
              minWidth: `${totalWidth}px`,
            }}
          >
            <thead className="sticky top-0 z-10 bg-background border-b border-border">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cx(
                      "py-4 px-4 text-sm font-semibold text-foreground whitespace-nowrap",
                      column.align === "right" ? "text-right" : "text-left",
                    )}
                    style={{
                      width: `${column.width}px`,
                      minWidth: `${column.width}px`,
                    }}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="relative">
              <tr style={{ height: `${rowVirtualizer.getTotalSize()}px` }} />
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const transaction = transactions[virtualRow.index];
                if (!transaction) return null;

                return (
                  <tr
                    key={transaction.id}
                    className={cx(
                      "absolute top-0 left-0 w-full border-b border-border",
                      isClickable && "cursor-pointer",
                    )}
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    onClick={
                      isClickable && onRowClick
                        ? () => onRowClick(transaction)
                        : undefined
                    }
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cx(
                          "px-4 overflow-hidden",
                          column.align === "right" ? "text-right" : "text-left",
                        )}
                        style={{
                          width: `${column.width}px`,
                          minWidth: `${column.width}px`,
                          maxWidth: `${column.width}px`,
                        }}
                      >
                        {renderCell(transaction, column.key, virtualRow.index)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    },
  );

TransactionsVirtualTableBase.displayName = "TransactionsVirtualTableBase";
