import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Use the warm `surface-3` panel background (e.g. budget overview). */
  tone?: "default" | "panel";
}

export default function Card({
  children,
  tone = "default",
  className,
  ...rest
}: Props) {
  return (
    <div
      className={cn(
        "rounded-2xl p-7",
        tone === "panel"
          ? "bg-surface-3"
          : "bg-surface border border-edge",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
