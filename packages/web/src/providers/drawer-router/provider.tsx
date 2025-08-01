import { useNavigate, useSearch } from '@tanstack/react-router';
import { useRef, type FC, type PropsWithChildren } from 'react';

import { DRAWER_IDS, DRAWER_METADATA_KEYS, type DrawerId } from '../../constants/drawer-id';
import { useApiAccountQuery, useApiCategoryQuery, useApiTransactionQuery } from '../../hooks';
import { AddAccountDrawer } from '../../modules/account-module';
import { EditAccountDrawer } from '../../modules/account-module/components';
import { AddCategoryDrawer, EditCategoryDrawer } from '../../modules/category-module';
import { ProfileDrawer } from '../../modules/profile-module';
import { AddTransactionDrawer, EditTransactionDrawer, TransactionFilterDrawer } from '../../modules/transaction-module';

import { DrawerRouterContextProvider } from './context';

export const DrawerRouterProvider: FC<PropsWithChildren> = ({ children }) => {
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false });
  const dispatchEl = useRef<HTMLDivElement>(null);

  const { drawerId, accountId, categoryId, transactionId } = searchParams;

  const handleDispatchSubmitDrawerEvent = () => {
    if (!dispatchEl.current) return;

    dispatchEl.current.dispatchEvent(
      new CustomEvent('drawer-router:submit', {
        bubbles: true,
        detail: searchParams,
      })
    );
  };

  const openDrawer = async (id: DrawerId, obj: object = {}) => {
    await navigate({
      // @ts-expect-error is a bug from tanstack/react-router
      search: (prev) => ({
        ...prev,
        ...obj,
        drawerId: id,
      }),
      replace: true,
      resetScroll: false,
    });

    if (!dispatchEl.current) return;
    dispatchEl.current.dispatchEvent(
      new CustomEvent('drawer-router:open', {
        bubbles: true,
        detail: {
          ...obj,
          drawerId: id,
        },
      })
    );
  };

  const closeDrawer = async () => {
    await navigate({
      // @ts-expect-error is a bug from tanstack/react-router
      search: (prev) => ({
        ...prev,
        ...Object.keys(DRAWER_METADATA_KEYS).reduce(
          (acc, key) => ({
            ...acc,
            [DRAWER_METADATA_KEYS[key as keyof typeof DRAWER_METADATA_KEYS]]: undefined,
          }),
          {}
        ),
      }),
      replace: true,
      resetScroll: false,
    });

    if (!dispatchEl.current) return;
    dispatchEl.current.dispatchEvent(
      new CustomEvent('drawer-router:close', {
        bubbles: true,
        detail: searchParams,
      })
    );
  };

  const is = (id: DrawerId) => drawerId === id;

  const [account] = useApiAccountQuery(accountId);
  const [category] = useApiCategoryQuery(categoryId);
  const [transaction] = useApiTransactionQuery(transactionId);

  return (
    <DrawerRouterContextProvider
      value={{
        drawerId,
        dispatchEl,
        openDrawer,
        closeDrawer,
        handleDispatchSubmitDrawerEvent,
      }}
    >
      <div ref={dispatchEl} />
      {children}

      {is(DRAWER_IDS.CREATE_TRANSACTION) && <AddTransactionDrawer />}
      {is(DRAWER_IDS.EDIT_TRANSACTION) && transaction && <EditTransactionDrawer transaction={transaction} />}
      {is(DRAWER_IDS.FILTER_TRANSACTION) && <TransactionFilterDrawer />}
      {is(DRAWER_IDS.ADD_ACCOUNT) && <AddAccountDrawer />}
      {is(DRAWER_IDS.EDIT_ACCOUNT) && account && <EditAccountDrawer account={account} />}
      {is(DRAWER_IDS.ADD_CATEGORY) && <AddCategoryDrawer />}
      {is(DRAWER_IDS.EDIT_CATEGORY) && category && <EditCategoryDrawer category={category} />}
      {is(DRAWER_IDS.PROFILE) && <ProfileDrawer />}
    </DrawerRouterContextProvider>
  );
};
