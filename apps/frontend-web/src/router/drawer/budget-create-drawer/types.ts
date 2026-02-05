export interface BudgetCreateFormSchema {
  name: string;
  amountLimit: number;
  periodType: "weekly" | "monthly" | "yearly";
  note: string;
}
