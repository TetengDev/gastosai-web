import api from "./client";
import type { components } from "./generated/schema";

type Schemas = components["schemas"];

/**
 * springdoc emits every response property as optional, because Java has no
 * notion of a non-null field the serializer can advertise. The API always
 * sends them, so responses are read through this.
 */
type Complete<T> = { [K in keyof T]-?: T[K] };

export type Category = Complete<Schemas["CategoryResponse"]>;

/**
 * springdoc does not emit nullability either: the API accepts `icon: null` to
 * clear an icon, so the request type keeps the key from the contract and
 * restores the null the spec cannot express.
 */
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
