import type { ReactNode } from "react";
import type { FeatureKey } from "../api/entitlements";
import { useEntitlements } from "../hooks/useEntitlements";
import UpgradePrompt from "./UpgradePrompt";

interface Props {
  feature: FeatureKey;
  children: ReactNode;
  /** Rendered when the user is not entitled. Defaults to an <UpgradePrompt>. */
  fallback?: ReactNode;
  compact?: boolean;
}

/**
 * Renders children only when the user is entitled to {@code feature}. While entitlements load it
 * renders optimistically (the backend is the real gate — frontend hiding is UX, not security).
 */
export default function FeatureGate({ feature, children, fallback, compact }: Props) {
  const { has, loading } = useEntitlements();
  if (loading || has(feature)) {
    return <>{children}</>;
  }
  return <>{fallback ?? <UpgradePrompt feature={feature} compact={compact} />}</>;
}
