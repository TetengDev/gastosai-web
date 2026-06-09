import api from "./client";
import type { Category, CategoryRequest } from "./types";

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
