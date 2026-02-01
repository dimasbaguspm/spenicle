import { useDrawerProvider } from "@/providers/drawer-provider";
import { TransactionTemplateModel } from "@/types/schemas";
import { FC } from "react";

interface HistoryTabProps {
  data: TransactionTemplateModel;
}

export const HistoryTab: FC<HistoryTabProps> = ({ data }) => {
  const { openDrawer } = useDrawerProvider();

  return <div>History Tab Content</div>;
};
