import { useCallback, useEffect, useState } from "react";
import { getEntitlements, VIEW_AS_CHANGED_EVENT, type Entitlements, type FeatureKey } from "../api/entitlements";

let cache: Promise<Entitlements> | null = null;

export interface UseEntitlements {
  entitlements: Entitlements | null;
  has: (feature: FeatureKey) => boolean;
  loading: boolean;
}

/** Loads the current user's entitlements (module-cached) and exposes a feature check. Refetches when the admin "View As" override changes. */
export function useEntitlements(): UseEntitlements {
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);

  const load = useCallback(() => {
    if (!cache) cache = getEntitlements();
    cache.then(setEntitlements).catch(() => setEntitlements(null));
  }, []);

  useEffect(() => {
    load();
    const onChange = () => { cache = null; load(); };
    window.addEventListener(VIEW_AS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(VIEW_AS_CHANGED_EVENT, onChange);
  }, [load]);

  const has = (feature: FeatureKey) => entitlements?.features.includes(feature) ?? false;

  return { entitlements, has, loading: entitlements === null };
}
