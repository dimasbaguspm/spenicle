export interface BudgetUpdateFormSchema {
  name: string;
  amountLimit: number;
  periodType: "weekly" | "monthly" | "yearly";
  note: string;
}
