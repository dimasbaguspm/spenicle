import dayjs, { type Dayjs } from 'dayjs';
import { Calendar } from 'lucide-react';
import { useRef, useState, type FC } from 'react';

import { Avatar, Brand, DatePicker, IconButton, PageHeader, PageLayout } from '../../../components';
import { DRAWER_IDS } from '../../../constants/drawer-id';
import { useSession } from '../../../hooks';
import { useDrawerRouterProvider } from '../../../providers/drawer-router';
import { SeamlessTransactionList, type SeamlessTransactionListRef } from '../components/seamless-transaction-list';
import { TransactionFilterEntry } from '../components/transaction-filter-entry';
import { WeeklyDateRibbon } from '../components/weekly-date-ribbon';

export const MobileTransactionPage: FC = () => {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const { openDrawer } = useDrawerRouterProvider();
  const { user } = useSession();

  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [shouldScroll, setShouldScroll] = useState(false);

  const ribbonRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<SeamlessTransactionListRef>(null);

  const handleOpenAddTransactionDrawer = () => {
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
    <PageLayout
      background="cream"
      mainProps={{ padding: 'none' }}
      header={
        <PageHeader className="p-4 pb-0 mb-2 justify-between">
          <Avatar size="sm" fallback={user?.name} onClick={handleOpenProfileDrawer} />
          <Brand size="sm" showTitle={false} />
          <IconButton variant="ghost" size="sm" onClick={handleOpenAddTransactionDrawer} title="Select Date">
            <Calendar className="h-5 w-5" />
          </IconButton>
        </PageHeader>
      }
    >
      <WeeklyDateRibbon
        ref={ribbonRef}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        variant="default"
        size="md"
        className="mb-6"
      />
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
    </PageLayout>
  );
};
