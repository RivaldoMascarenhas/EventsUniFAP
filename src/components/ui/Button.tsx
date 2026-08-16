import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "gold" | "outline" | "ghost" | "destructive" | "danger";
  size?: "sm" | "md" | "lg" | "xl";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]";

    const variants = {
      primary:
        "bg-unifap-navy hover:bg-unifap-blue text-white shadow-md hover:shadow-lg shadow-unifap-navy/20 focus:ring-unifap-navy border border-unifap-blue/40",
      secondary:
        "bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 focus:ring-slate-400",
      gold: "bg-unifap-gold hover:bg-unifap-goldHover text-unifap-dark font-bold shadow-md hover:shadow-lg shadow-amber-500/20 focus:ring-amber-400 border border-amber-400/50",
      outline:
        "bg-transparent border border-slate-300 hover:bg-slate-100 text-slate-700 focus:ring-slate-400",
      ghost:
        "bg-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-900 focus:ring-slate-300",
      destructive:
        "bg-rose-600 hover:bg-rose-700 text-white shadow-md hover:shadow-rose-600/30 focus:ring-rose-500",
      danger:
        "bg-rose-600 hover:bg-rose-700 text-white shadow-md hover:shadow-rose-600/30 focus:ring-rose-500",
    };

    const sizes = {
      sm: "text-xs px-3 py-1.5 gap-1.5",
      md: "text-sm px-4 py-2.5 gap-2",
      lg: "text-base px-6 py-3 gap-2.5",
      xl: "text-lg px-8 py-4 gap-3 font-semibold",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {!isLoading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
