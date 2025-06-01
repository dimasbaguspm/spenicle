export const formatAmount = (type: 'income' | 'expense' | 'transfer', amount: number) => {
  const prefix = type === 'income' ? '+' : type === 'expense' ? '-' : '↔';
  return `${prefix}$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
};

export const formatTime = (date: Date) => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const formatBalance = (balance: number) => {
  return `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
};
