import { useEffect, useState } from "react";
import { getEntitlements, type Entitlements, type FeatureKey } from "../api/entitlements";

let cache: Promise<Entitlements> | null = null;

export interface UseEntitlements {
  entitlements: Entitlements | null;
  has: (feature: FeatureKey) => boolean;
  loading: boolean;
}

/** Loads the current user's entitlements once (module-cached) and exposes a feature check. */
export function useEntitlements(): UseEntitlements {
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);

  useEffect(() => {
    if (!cache) cache = getEntitlements();
    cache.then(setEntitlements).catch(() => setEntitlements(null));
  }, []);

  const has = (feature: FeatureKey) => entitlements?.features.includes(feature) ?? false;

  return { entitlements, has, loading: entitlements === null };
}
