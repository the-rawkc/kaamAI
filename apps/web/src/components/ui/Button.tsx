import * as React from "react";
import { cn } from "@/lib/utils";

interface ButtonVariantConfig {
  base: string;
  variants: Record<string, string>;
  sizes: Record<string, string>;
  defaultVariant: string;
  defaultSize: string;
}

const buttonConfig: ButtonVariantConfig = {
  base:
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  variants: {
    default: "bg-[#6D5EF7] text-white hover:bg-opacity-90 focus-visible:ring-[#6D5EF7]",
    destructive:
      "bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500",
    outline:
      "border border-[#E2E8F0] bg-background hover:bg-[#F1F5F9] focus-visible:ring-ring",
    secondary:
      "bg-[#14B8A6] text-white hover:bg-opacity-90 focus-visible:ring-[#14B8A6]",
    ghost: "hover:bg-[#F1F5F9] focus-visible:ring-ring",
    link: "text-[#6D5EF7] underline-offset-4 hover:underline",
  },
  sizes: {
    default: "h-9 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-10 rounded-lg px-8",
    icon: "h-9 w-9",
  },
  defaultVariant: "default",
  defaultSize: "default",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: keyof ButtonVariantConfig["variants"];
  size?: keyof ButtonVariantConfig["sizes"];
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const classes = cn(
      buttonConfig.base,
      buttonConfig.variants[variant || buttonConfig.defaultVariant],
      buttonConfig.sizes[size || buttonConfig.defaultSize],
      className
    );

    if (asChild && props.children) {
      const child = React.Children.only(
        props.children
      ) as React.ReactElement;
      return React.cloneElement(child as any, {
        className: cn(
          (child as any).props.className,
          classes
        ),
        ...props,
        ref: ref as any,
      });
    }

    return (
      <button
        className={classes}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };