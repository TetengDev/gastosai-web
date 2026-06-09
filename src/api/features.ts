import api from "./client";

export interface Features {
  csvImport: boolean;
  chatAttachments: boolean;
}

export const getFeatures = () =>
  api.get<Features>("/features").then((r) => r.data);