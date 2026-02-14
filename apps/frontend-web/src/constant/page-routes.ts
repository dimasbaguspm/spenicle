import {
  BoltIcon,
  ChartColumnIcon,
  HomeIcon,
  LayoutGridIcon,
  ListCollapseIcon,
  MapPinnedIcon,
  TagsIcon,
  WalletCardsIcon,
} from "lucide-react";

export const PAGE_ROUTES = {
  LOGIN: "/login",
  DASHBOARD: "/",
  TRANSACTIONS: "/transactions",
  TRANSACTIONS_LIST: "list",
  TRANSACTIONS_GRID: "grid",
  TRANSACTIONS_GRID_EDIT: "edit",
  TRANSACTIONS_DATE: ":year/:month/:day",
  INSIGHTS: "/insights",
  INSIGHTS_ACCOUNTS: "accounts",
  INSIGHTS_CATEGORIES: "categories",
  INSIGHTS_MAP: "map",
  SETTINGS: "/settings",
  SETTINGS_ACCOUNTS: "accounts",
  SETTINGS_CATEGORIES: "categories",
  SETTINGS_SUBSCRIPTIONS: "subscriptions",
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
  TRANSACTIONS_LIST: {
    path: `${PAGE_ROUTES.TRANSACTIONS}/${PAGE_ROUTES.TRANSACTIONS_LIST}`,
    title: "Transactions List",
    icon: ListCollapseIcon,
  },
  TRANSACTIONS_LIST_DATE: {
    path: (year: number, month: number, day: number) =>
      `${PAGE_ROUTES.TRANSACTIONS}/${PAGE_ROUTES.TRANSACTIONS_LIST}/${year}/${month}/${day}`,
    title: "Transactions List by Date",
    icon: ListCollapseIcon,
  },
  TRANSACTIONS_GRID: {
    path: `${PAGE_ROUTES.TRANSACTIONS}/${PAGE_ROUTES.TRANSACTIONS_GRID}`,
    title: "Transactions Grid",
    icon: LayoutGridIcon,
  },
  TRANSACTIONS_GRID_EDIT: {
    path: `${PAGE_ROUTES.TRANSACTIONS}/${PAGE_ROUTES.TRANSACTIONS_GRID}/${PAGE_ROUTES.TRANSACTIONS_GRID_EDIT}`,
    title: "Edit Transactions",
    icon: LayoutGridIcon,
  },
  TRANSACTIONS_GRID_DATE: {
    path: (year: number, month: number, day: number) =>
      `${PAGE_ROUTES.TRANSACTIONS}/${PAGE_ROUTES.TRANSACTIONS_GRID}/${year}/${month}/${day}`,
    title: "Transactions Grid by Date",
    icon: LayoutGridIcon,
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
  INSIGHTS_ACCOUNTS: {
    path: `${PAGE_ROUTES.INSIGHTS}/${PAGE_ROUTES.INSIGHTS_ACCOUNTS}`,
    title: "Accounts Insights",
    icon: WalletCardsIcon,
  },
  INSIGHTS_CATEGORIES: {
    path: `${PAGE_ROUTES.INSIGHTS}/${PAGE_ROUTES.INSIGHTS_CATEGORIES}`,
    title: "Categories Insights",
    icon: TagsIcon,
  },
  INSIGHTS_MAP: {
    path: `${PAGE_ROUTES.INSIGHTS}/${PAGE_ROUTES.INSIGHTS_MAP}`,
    title: "Map Insights",
    icon: MapPinnedIcon,
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
  SETTINGS_SUBSCRIPTIONS: {
    path: `${PAGE_ROUTES.SETTINGS}/${PAGE_ROUTES.SETTINGS_SUBSCRIPTIONS}`,
    title: "Subscriptions",
    icon: BoltIcon,
  },
} as const;

export type PageRouteKeys = keyof typeof PAGE_ROUTES;
export type DeepPageLinkKeys = keyof typeof DEEP_PAGE_LINKS;
