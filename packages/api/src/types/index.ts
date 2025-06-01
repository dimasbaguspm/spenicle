export interface PaginatedResponse<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface DatabaseServiceSchema<Model> {
  getMany: (filters?: unknown) => Promise<PaginatedResponse<Model>>;
  getSingle: (filters?: unknown) => Promise<Model>;
  createSingle: (payload: unknown) => Promise<Model>;
  updateSingle: (id: unknown, data: unknown) => Promise<Model>;
  deleteSingle: (id: unknown) => Promise<Model>;
}
