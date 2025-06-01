import { Badge } from '../../../../components/badge';
import { DRAWER_IDS } from '../../../../constants/drawer-id';
import { cn } from '../../../../libs/utils';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router';

import { formatAmount, formatBalance, formatTime } from './helpers';

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  paymentMethod: string;
  icon: string;
  iconBgColor: string;
  iconTextColor: string;
  date: Date;
  balance?: number;
}

export interface TransactionCardProps {
  transaction: Transaction;
}

export function TransactionCard({ transaction }: TransactionCardProps) {
  const { openDrawer } = useDrawerRouterProvider();
  const { title, amount, type, category, paymentMethod, icon, iconBgColor, iconTextColor, date, balance } = transaction;

  const getCategoryVariant = (): 'secondary' | 'sage' | 'mist' => {
    switch (category.toLowerCase()) {
      case 'food & dining':
      case 'groceries':
        return 'sage';
      case 'bills & utilities':
        return 'mist';
      default:
        return 'secondary';
    }
  };

  const handleOnClick = async () => {
    await openDrawer(DRAWER_IDS.EDIT_TRANSACTION, {
      transactionId: +transaction.id,
    });
  };

  return (
    <div className={cn('p-4 hover:bg-slate-50 transition-colors')} onClick={handleOnClick}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', iconBgColor)}>
              <span className={cn('font-bold', iconTextColor)}>{icon}</span>
            </div>
            <div>
              <p className="font-medium text-slate-900">{title}</p>
              <p className="text-sm text-slate-500">{formatTime(date)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant={getCategoryVariant()}>{category}</Badge>
            <Badge variant="outline">{paymentMethod}</Badge>
          </div>
        </div>
        <div className="text-right">
          <p
            className={cn(
              'font-bold text-lg',
              type === 'income' ? 'text-green-600' : type === 'expense' ? 'text-red-600' : 'text-blue-600'
            )}
          >
            {formatAmount(type, amount)}
          </p>
          {balance !== undefined && <p className="text-sm text-slate-500">Balance: {formatBalance(balance)}</p>}
        </div>
      </div>
    </div>
  );
}
