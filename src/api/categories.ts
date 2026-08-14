import api from "./client";
import type { components } from "./generated/schema";

type Schemas = components["schemas"];

/**
 * springdoc expresses neither presence nor nullability: every response property
 * arrives optional and never nullable, which is wrong in both directions. These
 * two put it back — `Complete` for the fields the API always sends, `Nullable`
 * for the ones it sends as `null`. Verified against the running API, not guessed:
 * `GET /categories` returns `icon` and `bucket` as `null` on an unedited category.
 */
type Complete<T> = { [K in keyof T]-?: T[K] };
type Nullable<T, K extends keyof T> = Omit<Complete<T>, K> & {
  [P in K]-?: Exclude<T[P], undefined> | null;
};

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
