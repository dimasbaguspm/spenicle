import { createFileRoute } from '@tanstack/react-router';

import { PageLayout, Tile } from '../../../../components';
import { AccountList, AccountListHeader } from '../../../../modules/account-module';

export const Route = createFileRoute('/_protected/_experienced-user/settings/accounts')({
  component: AccountsComponent,
});

function AccountsComponent() {
  return (
    <PageLayout background="cream" title="Accounts" showBackButton={true}>
      <div className="space-y-6">
        <Tile>
          <AccountListHeader />
          <AccountList />
        </Tile>
      </div>
    </PageLayout>
  );
}
