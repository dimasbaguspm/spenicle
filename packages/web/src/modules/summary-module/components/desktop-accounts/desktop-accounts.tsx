import type { FC } from 'react';

export const DesktopAccounts: FC = () => {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-semibold">Accounts</h2>
      <p className="text-sm text-gray-500">Manage your accounts and view their details.</p>
    </div>
  );
};
