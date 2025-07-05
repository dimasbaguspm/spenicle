import dayjs from 'dayjs';
import { Plus } from 'lucide-react';
import { type FC } from 'react';

import { Tile, Button } from '../../../../components';
import { DatePickerInline } from '../../../../components/date-picker';

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

      {/* quick actions */}
      <Tile className="p-4 space-y-3">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Quick Actions</h3>

        <Button size="sm" variant="coral" onClick={onAddTransaction} className="w-full justify-center text-sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Transaction
        </Button>
      </Tile>
    </div>
  );
};
