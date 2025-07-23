import { AppBar } from '@dimasbaguspm/versaur/layouts';
import { Avatar, Brand, ButtonIcon } from '@dimasbaguspm/versaur/primitive';
import dayjs, { type Dayjs } from 'dayjs';
import { Calendar } from 'lucide-react';
import { useRef, useState, type FC } from 'react';

import { DatePicker } from '../../../components';
import { DRAWER_IDS } from '../../../constants/drawer-id';
import { useDrawerRouterProvider } from '../../../providers/drawer-router';
import { SeamlessTransactionList, type SeamlessTransactionListRef } from '../components/seamless-transaction-list';
import { TransactionFilterEntry } from '../components/transaction-filter-entry';
import { WeeklyDateRibbon } from '../components/weekly-date-ribbon';

export const MobileTransactionPage: FC = () => {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const { openDrawer } = useDrawerRouterProvider();

  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [shouldScroll, setShouldScroll] = useState(false);

  const ribbonRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<SeamlessTransactionListRef>(null);

  const handleOpenDatePicker = () => {
    setIsDatePickerOpen(true);
  };

  const handleDateSelect = (date: Dayjs) => {
    setSelectedDate(date.startOf('day'));
    setShouldScroll(true);

    listRef.current?.refreshIfNeeded(date);
  };

  const handleOnTopDateChange = (date: Dayjs) => {
    setSelectedDate(date.startOf('day'));
    setShouldScroll(false);
  };

  const handleOpenProfileDrawer = async () => {
    await openDrawer(DRAWER_IDS.PROFILE);
  };

  return (
    <>
      <AppBar>
        <AppBar.Leading>
          <Avatar size="sm" onClick={handleOpenProfileDrawer}>
            DM
          </Avatar>
        </AppBar.Leading>
        <AppBar.Center placement="center">
          <Brand size="md" shape="rounded" name="spenicle" />
        </AppBar.Center>
        <AppBar.Trailing>
          <ButtonIcon
            size="sm"
            as={Calendar}
            variant="ghost"
            aria-label="Open Date Picker"
            onClick={handleOpenDatePicker}
          />
        </AppBar.Trailing>
      </AppBar>

      <WeeklyDateRibbon ref={ribbonRef} selectedDate={selectedDate} onDateSelect={handleDateSelect} className="mb-6" />
      <div className="px-4 space-y-6">
        <SeamlessTransactionList
          ref={listRef}
          selectedDate={selectedDate}
          shouldScroll={shouldScroll}
          onTopDateChange={handleOnTopDateChange}
          ribbonElement={ribbonRef.current}
        />
      </div>

      <TransactionFilterEntry />
      <DatePicker
        variant="coral"
        showInput={false}
        isOpen={isDatePickerOpen}
        onOpenChange={setIsDatePickerOpen}
        value={selectedDate.toDate()}
        onChange={(data) => {
          if (data) handleDateSelect(dayjs(data).startOf('day'));
        }}
      />
    </>
  );
};
