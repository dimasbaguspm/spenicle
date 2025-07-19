import { Button, Calendar, Text, Tile } from '@dimasbaguspm/versaur';
import dayjs from 'dayjs';
import { type FC } from 'react';

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
    <div className="col-span-3 space-y-4 sticky top-6 self-start ">
      {/* date picker */}
      <Tile size="xs">
        <Calendar value={date.toDate()} onChange={(value) => onDateChange(dayjs(value))} />
      </Tile>

      <Tile className="gap-2 flex flex-col">
        <Text as="h6">Quick Actions</Text>
        <Button variant="primary" onClick={onAddTransaction} className="w-full">
          Add Transaction
        </Button>
      </Tile>
    </div>
  );
};
