import dayjs from 'dayjs';
import { Plus } from 'lucide-react';
import { type FC } from 'react';

import { Tile, Button } from '../../../../components';
import { DatePickerInline } from '../../../../components/date-picker';
import { TransactionFilterInline } from '../transaction-filter-inline';

interface DesktopTransactionSidebarProps {
  date: dayjs.Dayjs;
  onDateChange: (date: dayjs.Dayjs) => void;
  onAddTransaction: () => void;
}

export const DesktopTransactionSidebar: FC<DesktopTransactionSidebarProps> = ({
  date,
  onDateChange,
  onAddTransaction,
}) => {
  return (
    <div className="col-span-3 space-y-4 sticky top-6 self-start max-h-[calc(100vh-10rem)]">
      {/* add transaction button */}
      <Tile>
        <Button size="sm" variant="coral" onClick={onAddTransaction} className="w-full justify-center text-sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Transaction
        </Button>
      </Tile>

      {/* date picker */}
      <Tile className="p-4">
        <DatePickerInline
          autoSubmitOnSelect
          onChange={(value) => {
            onDateChange(dayjs(value));
          }}
          value={date.toDate()}
        />
      </Tile>

      {/* filters */}
      <Tile className="p-4">
        <h3 className="font-semibold text-slate-900 mb-3">Filters</h3>
        <TransactionFilterInline />
      </Tile>
    </div>
  );
};
