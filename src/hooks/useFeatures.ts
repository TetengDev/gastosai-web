import { useEffect, useState } from "react";
import { getFeatures, type Features } from "../api/features";

let cache: Promise<Features> | null = null;

export function useFeatures(): Features | null {
  const [features, setFeatures] = useState<Features | null>(null);

  useEffect(() => {
    if (!cache) cache = getFeatures();
    cache
      .then(setFeatures)
      .catch(() => setFeatures({ csvImport: false, chatAttachments: false }));
  }, []);

  return features;
}
