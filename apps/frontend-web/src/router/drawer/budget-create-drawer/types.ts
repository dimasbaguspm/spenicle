export interface BudgetCreateFormSchema {
  name: string;
  amountLimit: number;
  recurrence: "none" | "weekly" | "monthly" | "yearly";
  startDate: string;
  endDate: string;
  note: string;
  active: boolean;
}
