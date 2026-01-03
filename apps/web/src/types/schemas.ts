import { type operations } from "./generated/openapi";

export type AccountSearchModel = NonNullable<
  operations["list-accounts"]["parameters"]["query"]
>;
export type AccountsPagedModel =
  operations["list-accounts"]["responses"]["200"]["content"]["application/json"];
export type AccountCreateModel =
  operations["create-account"]["requestBody"]["content"]["application/json"];
export type AccountUpdateModel =
  operations["update-account"]["requestBody"]["content"]["application/json"] &
    operations["update-account"]["parameters"]["path"];
export type AccountModel =
  operations["get-account"]["responses"]["200"]["content"]["application/json"];
export type AccountReorderModel =
  operations["reorder-accounts"]["requestBody"]["content"]["application/json"];

export type AccountBudgetPagedModel =
  operations["list-account-budgets"]["responses"]["200"]["content"]["application/json"];
export type AccountBudgetModel =
  operations["get-account-budget"]["responses"]["200"]["content"]["application/json"];

export type AuthLoginRequestModel =
  operations["login"]["requestBody"]["content"]["application/json"];
export type AuthLoginResponseModel =
  operations["login"]["responses"]["200"]["content"]["application/json"];
export type AuthRefreshTokenRequestModel =
  operations["refresh"]["requestBody"]["content"]["application/json"];
export type AuthRefreshTokenResponseModel =
  operations["refresh"]["responses"]["200"]["content"]["application/json"];

export type BudgetSearchModel = NonNullable<
  operations["list-budgets"]["parameters"]["query"]
>;
export type BudgetPagedModel =
  operations["list-budgets"]["responses"]["200"]["content"]["application/json"];
export type BudgetCreateModel =
  operations["create-budget"]["requestBody"]["content"]["application/json"];
export type BudgetUpdateModel =
  operations["update-budget"]["requestBody"]["content"]["application/json"] &
    operations["update-budget"]["parameters"]["path"];
export type BudgetModel =
  operations["get-budget"]["responses"]["200"]["content"]["application/json"];

export type BudgetTemplateSearchModel = NonNullable<
  operations["list-budget-templates"]["parameters"]["query"]
>;
export type BudgetTemplatePagedModel =
  operations["list-budget-templates"]["responses"]["200"]["content"]["application/json"];
export type BudgetTemplateCreateModel =
  operations["create-budget-template"]["requestBody"]["content"]["application/json"];
export type BudgetTemplateModel =
  operations["get-budget-template"]["responses"]["200"]["content"]["application/json"];
export type BudgetTemplateUpdateModel =
  operations["update-budget-template"]["requestBody"]["content"]["application/json"] &
    operations["update-budget-template"]["parameters"]["path"];

export type CategorySearchModel = NonNullable<
  operations["list-categories"]["parameters"]["query"]
>;
export type CategoriesPageModel =
  operations["list-categories"]["responses"]["200"]["content"]["application/json"];
export type CategoryCreateModel =
  operations["create-category"]["requestBody"]["content"]["application/json"];
export type CategoryReorderModel =
  operations["reorder-categories"]["requestBody"]["content"]["application/json"];
export type CategoryUpdateModel =
  operations["update-category"]["requestBody"]["content"]["application/json"] &
    operations["update-category"]["parameters"]["path"];
export type CategoryModel =
  operations["get-category"]["responses"]["200"]["content"]["application/json"];
export type CategoryBudgetPagedModel =
  operations["list-category-budgets"]["responses"]["200"]["content"]["application/json"];
export type CategoryBudgetModel =
  operations["get-category-budget"]["responses"]["200"]["content"]["application/json"];

export type SummaryAccountsModel =
  operations["get-account-summary"]["responses"]["200"]["content"]["application/json"];
export type SummaryAccountTrendsModel =
  operations["get-account-trends"]["responses"]["200"]["content"]["application/json"];
export type SummaryCategoryModel =
  operations["get-category-summary"]["responses"]["200"]["content"]["application/json"];
export type SummaryCategoriesTrendsModel =
  operations["get-category-trends"]["responses"]["200"]["content"]["application/json"];
export type SummaryTagsModel =
  operations["get-tag-summary"]["responses"]["200"]["content"]["application/json"];
export type SummaryTransactionModel =
  operations["get-transaction-summary"]["responses"]["200"]["content"]["application/json"];

export type TagSearchModel = NonNullable<
  operations["list-tags"]["parameters"]["query"]
>;
export type TagsPageModel =
  operations["list-tags"]["responses"]["200"]["content"]["application/json"];
export type TagCreateModel =
  operations["create-tag"]["requestBody"]["content"]["application/json"];

export type TransactionSearchModel = NonNullable<
  operations["list-transactions"]["parameters"]["query"]
>;
export type TransactionsPagedModel =
  operations["list-transactions"]["responses"]["200"]["content"]["application/json"];
export type TransactionCreateModel =
  operations["create-transaction"]["requestBody"]["content"]["application/json"];
export type TransactionUpdateModel =
  operations["update-transaction"]["requestBody"]["content"]["application/json"] &
    operations["update-transaction"]["parameters"]["path"];
export type TransactionModel =
  operations["get-transaction"]["responses"]["200"]["content"]["application/json"];

export type TransactionRelatedListModel =
  operations["list-related-transactions"]["responses"]["200"]["content"]["application/json"];
export type TransctionRelatedCreateModel =
  operations["create-transaction-relation"]["requestBody"]["content"]["application/json"] &
    operations["create-transaction-relation"]["parameters"]["path"];
export type TransactionRelatedModel =
  operations["get-related-transaction"]["responses"]["200"]["content"]["application/json"];

export type TransactionTagListModel =
  operations["get-transaction-tags"]["responses"]["200"]["content"]["application/json"];
export type TransactionTagUpdateModel =
  operations["update-transaction-tags"]["requestBody"]["content"]["application/json"] &
    operations["update-transaction-tags"]["parameters"]["path"];
export type TransactionTagCreateModel =
  operations["add-transaction-tag"]["requestBody"]["content"]["application/json"] &
    operations["add-transaction-tag"]["parameters"]["path"];

export type TransactionTemplateSearchModel = NonNullable<
  operations["list-transaction-templates"]["parameters"]["query"]
>;
export type TransactionTemplatePagedModel =
  operations["list-transaction-templates"]["responses"]["200"]["content"]["application/json"];
export type TransactionTemplateCreateModel =
  operations["create-transaction-template"]["requestBody"]["content"]["application/json"];
export type TransactionTemplateUpdateModel =
  operations["update-transaction-template"]["requestBody"]["content"]["application/json"] &
    operations["update-transaction-template"]["parameters"]["path"];
export type TransactionTemplateModel =
  operations["get-transaction-template"]["responses"]["200"]["content"]["application/json"];
