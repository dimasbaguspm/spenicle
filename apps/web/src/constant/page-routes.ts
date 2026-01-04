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
  INSIGHTS: "/insights",
  SETTINGS: "/settings",
  SETTINGS_ACCOUNTS: "accounts",
  SETTINGS_CATEGORIES: "categories",
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

  INSIGHTS: {
    path: PAGE_ROUTES.INSIGHTS,
    title: "Insights",
    icon: ChartColumnIcon,
  },
  SETTINGS: {
    path: PAGE_ROUTES.SETTINGS,
    title: "Settings",
    icon: BoltIcon,
  },
  SETTINGS_ACCOUNTS: {
    path: `${PAGE_ROUTES.SETTINGS}/${PAGE_ROUTES.SETTINGS_ACCOUNTS}`,
    title: "Accounts",
    icon: WalletCardsIcon,
  },
  SETTINGS_CATEGORIES: {
    path: `${PAGE_ROUTES.SETTINGS}/${PAGE_ROUTES.SETTINGS_CATEGORIES}`,
    title: "Categories",
    icon: TagsIcon,
  },
} as const;

export type PageRouteKeys = keyof typeof PAGE_ROUTES;
export type DeepPageLinkKeys = keyof typeof DEEP_PAGE_LINKS;
