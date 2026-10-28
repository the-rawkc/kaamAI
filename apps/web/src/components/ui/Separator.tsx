import * as React from "react";
import { cn } from "@/lib/utils";

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = "horizontal", ...props }, ref) => {
    const base =
      orientation === "horizontal"
        ? "h-[1px] w-full bg-[#E2E8F0]"
        : "w-[1px] h-full bg-[#E2E8F0]";
    return (
      <div ref={ref} className={cn(base, className)} {...props} />
    );
  }
);
Separator.displayName = "Separator";

export { Separator };