import api from "./client";
import type { components } from "./generated/schema";
// `Nullable` marks the fields the API sends as `null` on top of the ones it
// always sends. Verified against the running API, not guessed: `GET /categories`
// returns `icon` and `bucket` as `null` on an unedited category.
import type { Nullable } from "./typeHelpers";

type Schemas = components["schemas"];

export type Category = Nullable<Schemas["CategoryResponse"], "icon" | "bucket">;

/** `icon: null` clears an icon; the key still comes from the contract. */
export type CategoryRequest = Omit<Schemas["CategoryRequest"], "icon"> & {
  icon?: Schemas["CategoryRequest"]["icon"] | null;
};

export const getCategories = () =>
  api.get<Category[]>("/categories").then((r) => r.data);

export const createCategory = (data: CategoryRequest) =>
  api.post<Category>("/categories", data).then((r) => r.data);

export const updateCategory = (id: number, data: CategoryRequest) =>
  api.put<Category>(`/categories/${id}`, data).then((r) => r.data);

export const deleteCategory = (id: number) =>
  api.delete(`/categories/${id}`);

export const deleteAllCategories = () =>
  api.delete("/categories");
