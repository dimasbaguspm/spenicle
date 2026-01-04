import type { PageHandleType } from "@/constant/page-handles";

export interface FloatingActionItem {
  label: string;
  link: string;
  type: PageHandleType;
}

export interface FloatingActionsHandle {
  floatingActionButton?: FloatingActionItem[];
}
