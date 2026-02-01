import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { DEEP_PAGE_LINKS } from "@/constant/page-routes";
import { formatPrice, PriceFormat } from "@/lib/format-price";
import { useDrawerProvider } from "@/providers/drawer-provider";
import {
  Button,
  ButtonGroup,
  ButtonMenuIcon,
  Heading,
  Icon,
  Text,
  Tile,
  useMobileBreakpoint,
} from "@dimasbaguspm/versaur";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChartColumnIcon,
  EllipsisVerticalIcon,
  ListCollapseIcon,
} from "lucide-react";
import { useNavigate } from "react-router";

interface ThisMonthSummaryCardsProps {
  totalIncome: number;
  totalExpense: number;
}

export const ThisMonthSummaryCards = ({
  totalIncome,
  totalExpense,
}: ThisMonthSummaryCardsProps) => {
  const isMobile = useMobileBreakpoint();
  const navigate = useNavigate();
  const { openDrawer } = useDrawerProvider();

  const handleOnViewSummaryClick = () => {
    navigate(DEEP_PAGE_LINKS.INSIGHTS.path);
  };

  const handleOnViewTransactionsClick = () => {
    openDrawer(DRAWER_ROUTES.TRANSACTIONS_ALL_THE_TIME);
  };

  return (
    <div>
      <div className="flex flex-row justify-between items-center gap-3 mb-4">
        <Heading as="h5" color="ghost">
          This Month At Glance
        </Heading>
        {isMobile ? (
          <ButtonMenuIcon
            as={EllipsisVerticalIcon}
            variant="outline"
            aria-label="Actions"
            placement="bottom-right"
          >
            <ButtonMenuIcon.Item onClick={handleOnViewSummaryClick}>
              <Icon as={ChartColumnIcon} color="inherit" size="sm" />
              Summary
            </ButtonMenuIcon.Item>
            <ButtonMenuIcon.Item onClick={handleOnViewTransactionsClick}>
              <Icon as={ListCollapseIcon} color="inherit" size="sm" />
              Transactions
            </ButtonMenuIcon.Item>
          </ButtonMenuIcon>
        ) : (
          <ButtonGroup>
            <Button variant="outline" onClick={handleOnViewSummaryClick}>
              <Icon as={ChartColumnIcon} color="inherit" size="sm" />
              Summary
            </Button>
            <Button variant="outline" onClick={handleOnViewTransactionsClick}>
              <Icon as={ListCollapseIcon} color="inherit" size="sm" />
              Transactions
            </Button>
          </ButtonGroup>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Tile>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-secondary-soft flex items-center justify-center">
              <Icon as={ArrowUpIcon} color="secondary" />
            </div>
            <div className="flex flex-col">
              <Text
                as="small"
                fontWeight="medium"
                color="gray"
                transform="uppercase"
              >
                Income
              </Text>
              <Heading as="h4" color="neutral">
                {formatPrice(totalIncome, PriceFormat.CURRENCY_NO_DECIMALS)}
              </Heading>
            </div>
          </div>
        </Tile>

        <Tile>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center">
              <Icon as={ArrowDownIcon} color="primary" />
            </div>
            <div className="flex flex-col">
              <Text
                as="small"
                fontWeight="medium"
                color="gray"
                transform="uppercase"
              >
                Expenses
              </Text>
              <Heading as="h4" color="neutral">
                {formatPrice(totalExpense, PriceFormat.CURRENCY_NO_DECIMALS)}
              </Heading>
            </div>
          </div>
        </Tile>
      </div>
    </div>
  );
};
