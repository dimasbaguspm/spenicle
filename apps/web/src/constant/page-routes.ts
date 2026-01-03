import {
  BoltIcon,
  ChartColumnIcon,
  HomeIcon,
  ListCollapseIcon,
  TagsIcon,
  WalletCardsIcon,
} from "lucide-react";

export const PAGE_ROUTES = {
  LOGIN: "/login",
  DASHBOARD: "/",
  TRANSACTIONS: "/transactions",
  TRANSACTIONS_DATE: ":year/:month/:day",
  ACCOUNTS: "/accounts",
  CATEGORIES: "/categories",
  SUMMARY: "/summary",
  SETTINGS: "/settings",
} as const;

export const DEEP_PAGE_LINKS = {
  DASHBOARD: {
    path: PAGE_ROUTES.DASHBOARD,
    title: "Dashboard",
    icon: HomeIcon,
  },
  TRANSACTIONS_ALT: {
    path: PAGE_ROUTES.TRANSACTIONS,
    title: "Transactions",
    icon: ListCollapseIcon,
  },
  TRANSACTIONS_DATE: {
    path: (year: number, month: number, day: number) =>
      `${PAGE_ROUTES.TRANSACTIONS}/${year}/${month}/${day}`,
    title: "Transactions by Date",
    icon: ListCollapseIcon,
  },
  ACCOUNTS: {
    path: PAGE_ROUTES.ACCOUNTS,
    title: "Accounts",
    icon: WalletCardsIcon,
  },
  CATEGORIES: {
    path: PAGE_ROUTES.CATEGORIES,
    title: "Categories",
    icon: TagsIcon,
  },
  SUMMARY: {
    path: PAGE_ROUTES.SUMMARY,
    title: "Summary",
    icon: ChartColumnIcon,
  },
  SETTINGS: {
    path: PAGE_ROUTES.SETTINGS,
    title: "Settings",
    icon: BoltIcon,
  },
} as const;

export type PageRouteKeys = keyof typeof PAGE_ROUTES;
export type DeepPageLinkKeys = keyof typeof DEEP_PAGE_LINKS;
