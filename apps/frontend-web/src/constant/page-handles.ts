/**
 * Page handle types for routing navigation
 */
export const PAGE_HANDLES = {
  PAGE: "page",
  DRAWER: "drawer",
  MODAL: "modal",
  BOTTOM_SHEET: "bottomSheet",
} as const;

export type PageHandleType = (typeof PAGE_HANDLES)[keyof typeof PAGE_HANDLES];
