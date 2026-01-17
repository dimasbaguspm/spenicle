import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { useApiAccountsInfiniteQuery } from "@/hooks/use-api";
import { useAccountFilter } from "@/hooks/use-filter-state";
import { When } from "@/lib/when";
import { useDrawerProvider } from "@/providers/drawer-provider";
import { AccountCard } from "@/ui/account-card";
import { AccountFilterFields } from "@/ui/account-filter-fields";
import {
  Button,
  ButtonGroup,
  ButtonIcon,
  Drawer,
  NoResults,
  PageLoader,
  SelectableSingleInput,
  useDesktopBreakpoint,
} from "@dimasbaguspm/versaur";
import { SearchXIcon, XIcon } from "lucide-react";
import { type FC, useState } from "react";

interface AccountSelectSingleDrawerProps {
  returnToDrawer: string;
  returnToDrawerId?: Record<string, string> | null;
  payload: Record<string, unknown>;
  payloadId: string;
}

export const AccountSelectSingleDrawer: FC<AccountSelectSingleDrawerProps> = ({
  returnToDrawer,
  returnToDrawerId = null,
  payloadId,
  payload,
}) => {
  const isDesktop = useDesktopBreakpoint();
  const { openDrawer } = useDrawerProvider();
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    typeof payload?.[payloadId] === "number" ? payload[payloadId] : null,
  );

  const filter = useAccountFilter({
    adapter: "state",
  });
  const [
    accounts,
    ,
    { isInitialFetching, isFetchingNextPage, hasNextPage },
    { fetchNextPage },
  ] = useApiAccountsInfiniteQuery({
    name: filter.appliedFilters.name,
    type: filter.appliedFilters.type,
    sortBy: "name",
    sortOrder: "asc",
    pageSize: 15,
  });

  const handleOnSubmit = () => {
    openDrawer(returnToDrawer, returnToDrawerId, {
      replace: true,
      state: {
        payload: {
          ...payload,
          [payloadId]: selectedAccountId,
        },
      },
    });
  };

  const handleOnCancel = () => {
    openDrawer(returnToDrawer, returnToDrawerId, {
      replace: true,
      state: {
        payload,
      },
    });
  };

  return (
    <>
      <Drawer.Header>
        <Drawer.Title>Select Account</Drawer.Title>
        <ButtonIcon
          as={XIcon}
          size="sm"
          variant="ghost"
          aria-label="Close"
          onClick={handleOnCancel}
        />
      </Drawer.Header>

      <Drawer.Body>
        <AccountFilterFields control={filter} />
        <When condition={isInitialFetching}>
          <PageLoader />
        </When>

        <When condition={!isInitialFetching}>
          <When condition={accounts.length}>
            <ul className="mb-4">
              {accounts?.map((account) => {
                return (
                  <li key={account.id}>
                    <SelectableSingleInput
                      value={account.id.toString()}
                      checked={account.id === selectedAccountId}
                      onChange={() => setSelectedAccountId(account.id)}
                    >
                      <AccountCard
                        as="div"
                        account={account}
                        size="none"
                        supplementaryInfo=""
                      />
                    </SelectableSingleInput>
                  </li>
                );
              })}
            </ul>
            <When condition={hasNextPage}>
              <ButtonGroup alignment="center">
                <Button
                  onClick={() => fetchNextPage()}
                  variant="outline"
                  disabled={isFetchingNextPage}
                >
                  Load More
                </Button>
              </ButtonGroup>
            </When>
          </When>
          <When condition={!accounts.length}>
            <NoResults
              icon={SearchXIcon}
              title="No accounts found"
              subtitle="Try adjusting your search criteria, or create a new account"
              action={
                <ButtonGroup>
                  <Button
                    variant="outline"
                    onClick={() => openDrawer(DRAWER_ROUTES.ACCOUNT_CREATE)}
                  >
                    Create Account
                  </Button>
                </ButtonGroup>
              }
            />
          </When>
        </When>
      </Drawer.Body>
      <Drawer.Footer>
        <ButtonGroup alignment="end" fluid={!isDesktop}>
          <Button variant="ghost" onClick={handleOnCancel}>
            Cancel
          </Button>
          <Button
            form="select-account-form"
            onClick={handleOnSubmit}
            disabled={!selectedAccountId}
          >
            Select
          </Button>
        </ButtonGroup>
      </Drawer.Footer>
    </>
  );
};
