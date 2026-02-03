import { type paths } from "./generated/openapi";

export type AccountSearchModel = NonNullable<
  paths["/accounts"]["get"]["parameters"]["query"]
>;
export type AccountsPagedModel =
  paths["/accounts"]["get"]["responses"]["200"]["content"]["application/json"];
export type AccountCreateModel =
  paths["/accounts"]["post"]["requestBody"]["content"]["application/json"];
export type AccountUpdateModel =
  paths["/accounts/{id}"]["patch"]["requestBody"]["content"]["application/json"] &
    paths["/accounts/{id}"]["patch"]["parameters"]["path"];
export type AccountModel =
  paths["/accounts/{id}"]["get"]["responses"]["200"]["content"]["application/json"];
export type AccountReorderModel =
  paths["/accounts/reorder"]["post"]["requestBody"]["content"]["application/json"];
export type AccountDeleteModel =
  paths["/accounts/{id}"]["delete"]["parameters"]["path"];

export type AccountStatisticsModel =
  paths["/accounts/{id}/statistics"]["get"]["responses"]["200"]["content"]["application/json"];
export type AccountStatisticsSearchModel = NonNullable<
  paths["/accounts/{id}/statistics"]["get"]["parameters"]["query"]
>;
export type AccountStatisticBudgetHealthModel =
  paths["/accounts/{id}/statistics/budget-health"]["get"]["responses"]["200"]["content"]["application/json"];
export type AccountStatisticBudgetHealthSearchModel = NonNullable<
  paths["/accounts/{id}/statistics/budget-health"]["get"]["parameters"]["query"]
>;
export type AccountStatisticBurnRateModel =
  paths["/accounts/{id}/statistics/burn-rate"]["get"]["responses"]["200"]["content"]["application/json"];
export type AccountStatisticBurnRateSearchModel = NonNullable<
  paths["/accounts/{id}/statistics/burn-rate"]["get"]["parameters"]["query"]
>;
export type AccountStatisticCashFlowPulseModel =
  paths["/accounts/{id}/statistics/cash-flow-pulse"]["get"]["responses"]["200"]["content"]["application/json"];
export type AccountStatisticCashFlowPulseSearchModel = NonNullable<
  paths["/accounts/{id}/statistics/cash-flow-pulse"]["get"]["parameters"]["query"]
>;
export type AccountStatisticCategoryHeatmapModel =
  paths["/accounts/{id}/statistics/category-heatmap"]["get"]["responses"]["200"]["content"]["application/json"];
export type AccountStatisticCategoryHeatmapSearchModel = NonNullable<
  paths["/accounts/{id}/statistics/category-heatmap"]["get"]["parameters"]["query"]
>;
export type AccountStatisticMonthlyVelocityModel =
  paths["/accounts/{id}/statistics/monthly-velocity"]["get"]["responses"]["200"]["content"]["application/json"];
export type AccountStatisticMonthlyVelocitySearchModel = NonNullable<
  paths["/accounts/{id}/statistics/monthly-velocity"]["get"]["parameters"]["query"]
>;
export type AccountStatisticTimeFrequencyModel =
  paths["/accounts/{id}/statistics/time-frequency"]["get"]["responses"]["200"]["content"]["application/json"];
export type AccountStatisticTimeFrequencySearchModel = NonNullable<
  paths["/accounts/{id}/statistics/time-frequency"]["get"]["parameters"]["query"]
>;

export type CategoryStatisticsModel =
  paths["/categories/{id}/statistics"]["get"]["responses"]["200"]["content"]["application/json"];
export type CategoryStatisticsSearchModel = NonNullable<
  paths["/categories/{id}/statistics"]["get"]["parameters"]["query"]
>;

export type CategoryStatisticAccountDistributionModel =
  paths["/categories/{id}/statistics/account-distribution"]["get"]["responses"]["200"]["content"]["application/json"];
export type CategoryStatisticAccountDistributionSearchModel = NonNullable<
  paths["/categories/{id}/statistics/account-distribution"]["get"]["parameters"]["query"]
>;
export type CategoryStatisticAverageTransactionSizeModel =
  paths["/categories/{id}/statistics/average-transaction-size"]["get"]["responses"]["200"]["content"]["application/json"];
export type CategoryStatisticAverageTransactionSizeSearchModel = NonNullable<
  paths["/categories/{id}/statistics/average-transaction-size"]["get"]["parameters"]["query"]
>;
export type CategoryStatisticBudgetUtilizationModel =
  paths["/categories/{id}/statistics/budget-utilization"]["get"]["responses"]["200"]["content"]["application/json"];
export type CategoryStatisticBudgetUtilizationSearchModel = NonNullable<
  paths["/categories/{id}/statistics/budget-utilization"]["get"]["parameters"]["query"]
>;
export type CategoryStatisticDayOfWeekPatternModel =
  paths["/categories/{id}/statistics/day-of-week-pattern"]["get"]["responses"]["200"]["content"]["application/json"];
export type CategoryStatisticDayOfWeekPatternSearchModel = NonNullable<
  paths["/categories/{id}/statistics/day-of-week-pattern"]["get"]["parameters"]["query"]
>;
export type CategoryStatisticSpendingVelocityModel =
  paths["/categories/{id}/statistics/spending-velocity"]["get"]["responses"]["200"]["content"]["application/json"];
export type CategoryStatisticSpendingVelocitySearchModel = NonNullable<
  paths["/categories/{id}/statistics/spending-velocity"]["get"]["parameters"]["query"]
>;

export type AuthLoginRequestModel =
  paths["/auth/login"]["post"]["requestBody"]["content"]["application/json"];
export type AuthLoginResponseModel =
  paths["/auth/login"]["post"]["responses"]["200"]["content"]["application/json"];
export type AuthRefreshTokenRequestModel =
  paths["/auth/refresh"]["post"]["requestBody"]["content"]["application/json"];
export type AuthRefreshTokenResponseModel =
  paths["/auth/refresh"]["post"]["responses"]["200"]["content"]["application/json"];

export type BudgetSearchModel = NonNullable<
  paths["/budgets"]["get"]["parameters"]["query"]
>;
export type BudgetPagedModel =
  paths["/budgets"]["get"]["responses"]["200"]["content"]["application/json"];
export type BudgetCreateModel =
  paths["/budgets"]["post"]["requestBody"]["content"]["application/json"];
export type BudgetUpdateModel =
  paths["/budgets/{id}"]["patch"]["requestBody"]["content"]["application/json"] &
    paths["/budgets/{id}"]["patch"]["parameters"]["path"];
export type BudgetDeleteModel =
  paths["/budgets/{id}"]["delete"]["parameters"]["path"];
export type BudgetModel =
  paths["/budgets/{id}"]["get"]["responses"]["200"]["content"]["application/json"];

export type BudgetTemplateSearchModel = NonNullable<
  paths["/budgets/templates"]["get"]["parameters"]["query"]
>;
export type BudgetTemplatePagedModel =
  paths["/budgets/templates"]["get"]["responses"]["200"]["content"]["application/json"];
export type BudgetTemplateCreateModel =
  paths["/budgets/templates"]["post"]["requestBody"]["content"]["application/json"];
export type BudgetTemplateUpdateModel =
  paths["/budgets/templates/{id}"]["patch"]["requestBody"]["content"]["application/json"] &
    paths["/budgets/templates/{id}"]["patch"]["parameters"]["path"];
export type BudgetTemplateDeleteModel =
  paths["/budgets/templates/{id}"]["delete"]["parameters"]["path"];
export type BudgetTemplateModel =
  paths["/budgets/templates/{id}"]["get"]["responses"]["200"]["content"]["application/json"];

export type CategorySearchModel = NonNullable<
  paths["/categories"]["get"]["parameters"]["query"]
>;
export type CategoriesPagedModel =
  paths["/categories"]["get"]["responses"]["200"]["content"]["application/json"];
export type CategoryCreateModel =
  paths["/categories"]["post"]["requestBody"]["content"]["application/json"];
export type CategoryReorderModel =
  paths["/categories/reorder"]["post"]["requestBody"]["content"]["application/json"];
export type CategoryUpdateModel =
  paths["/categories/{id}"]["patch"]["requestBody"]["content"]["application/json"] &
    paths["/categories/{id}"]["patch"]["parameters"]["path"];
export type CategoryDeleteModel =
  paths["/categories/{id}"]["delete"]["parameters"]["path"];
export type CategoryModel =
  paths["/categories/{id}"]["get"]["responses"]["200"]["content"]["application/json"];

export type InsightsAccountSearchModel = NonNullable<
  paths["/summary/accounts"]["get"]["parameters"]["query"]
>;
export type InsightsAccountsModel =
  paths["/summary/accounts"]["get"]["responses"]["200"]["content"]["application/json"];

export type InsightsCategorySearchModel = NonNullable<
  paths["/summary/categories"]["get"]["parameters"]["query"]
>;
export type InsightsCategoryModel =
  paths["/summary/categories"]["get"]["responses"]["200"]["content"]["application/json"];

export type InsightsTransactionsSearchModel = NonNullable<
  paths["/summary/transactions"]["get"]["parameters"]["query"]
>;
export type InsightsTransactionModel =
  paths["/summary/transactions"]["get"]["responses"]["200"]["content"]["application/json"];

// export type InsightsTotalSearchModel = NonNullable<
//   paths["/summary/total"]["get"]["parameters"]["query"]
// >;
// export type InsightsTotalModel =
//   paths["/summary/total"]["get"]["responses"]["200"]["content"]["application/json"];

export type TagSearchModel = NonNullable<
  paths["/tags"]["get"]["parameters"]["query"]
>;
export type TagsPagedModel =
  paths["/tags"]["get"]["responses"]["200"]["content"]["application/json"];
export type TagModel =
  paths["/tags/{id}"]["get"]["responses"]["200"]["content"]["application/json"];
export type TagCreateModel =
  paths["/tags"]["post"]["requestBody"]["content"]["application/json"];
export type TagUpdateModel =
  paths["/tags/{id}"]["patch"]["requestBody"]["content"]["application/json"] &
    paths["/tags/{id}"]["patch"]["parameters"]["path"];
export type TagDeleteModel =
  paths["/tags/{id}"]["delete"]["parameters"]["path"];

export type TransactionSearchModel = NonNullable<
  paths["/transactions"]["get"]["parameters"]["query"]
>;
export type TransactionsPagedModel =
  paths["/transactions"]["get"]["responses"]["200"]["content"]["application/json"];
export type TransactionCreateModel =
  paths["/transactions"]["post"]["requestBody"]["content"]["application/json"];
export type TransactionUpdateModel =
  paths["/transactions/{id}"]["patch"]["requestBody"]["content"]["application/json"] &
    paths["/transactions/{id}"]["patch"]["parameters"]["path"];
export type TransactionDeleteModel =
  paths["/transactions/{id}"]["delete"]["parameters"]["path"];
export type TransactionModel =
  paths["/transactions/{id}"]["get"]["responses"]["200"]["content"]["application/json"];

export type TransactionRelationsPagedModel =
  paths["/transactions/{sourceTransactionId}/relations"]["get"]["responses"]["200"]["content"]["application/json"];
export type TransactionRelationCreateModel =
  paths["/transactions/{sourceTransactionId}/relations"]["post"]["requestBody"]["content"]["application/json"] &
    paths["/transactions/{sourceTransactionId}/relations"]["post"]["parameters"]["path"];
export type TransactionRelationDeleteModel =
  paths["/transactions/{sourceTransactionId}/relations/{relationId}"]["delete"]["parameters"]["path"];
export type TransactionRelationModel =
  paths["/transactions/{sourceTransactionId}/relations/{relationId}"]["get"]["responses"]["200"]["content"]["application/json"];

export type TransactionTagsPagedModel =
  paths["/transactions/{transactionId}/tags"]["get"]["responses"]["200"]["content"]["application/json"];
export type TransactionTagUpdateModel =
  paths["/transactions/{transactionId}/tags"]["post"]["requestBody"]["content"]["application/json"] &
    paths["/transactions/{transactionId}/tags"]["post"]["parameters"]["path"];
export type TransactionTagCreateModel =
  paths["/transactions/{transactionId}/tags"]["post"]["requestBody"]["content"]["application/json"] &
    paths["/transactions/{transactionId}/tags"]["post"]["parameters"]["path"];
export type TransactionTagDeleteModel =
  paths["/transactions/{transactionId}/tags/{tagId}"]["delete"]["parameters"]["path"];
export type TransactionTagModel =
  paths["/transactions/{transactionId}/tags/{tagId}"]["get"]["responses"]["200"]["content"]["application/json"];

export type TransactionTemplateSearchModel = NonNullable<
  paths["/transaction-templates"]["get"]["parameters"]["query"]
>;
export type TransactionTemplatePagedModel =
  paths["/transaction-templates"]["get"]["responses"]["200"]["content"]["application/json"];
export type TransactionTemplateCreateModel =
  paths["/transaction-templates"]["post"]["requestBody"]["content"]["application/json"];
export type TransactionTemplateUpdateModel =
  paths["/transaction-templates/{templateId}"]["patch"]["requestBody"]["content"]["application/json"] &
    paths["/transaction-templates/{templateId}"]["patch"]["parameters"]["path"];
export type TransactionTemplateDeleteModel =
  paths["/transaction-templates/{templateId}"]["delete"]["parameters"]["path"];
export type TransactionTemplateModel =
  paths["/transaction-templates/{templateId}"]["get"]["responses"]["200"]["content"]["application/json"];
