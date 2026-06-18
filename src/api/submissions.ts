import api from "./client";

export type SubmissionType = "CONTACT" | "SUGGESTION";

export interface SubmissionPayload {
  type: SubmissionType;
  name?: string;
  email?: string;
  message: string;
}

export interface Submission {
  id: number;
  type: SubmissionType;
  name: string | null;
  email: string | null;
  message: string;
  createdAt: string;
  handled: boolean;
}

// Public — works without auth (the POST endpoint is permitAll on the backend).
export const createSubmission = (payload: SubmissionPayload) =>
  api.post<Submission>("/submissions", payload).then((r) => r.data);

// Admin only.
export const getSubmissions = () =>
  api.get<Submission[]>("/submissions").then((r) => r.data);

export const markSubmissionHandled = (id: number) =>
  api.patch<Submission>(`/submissions/${id}/handled`).then((r) => r.data);
