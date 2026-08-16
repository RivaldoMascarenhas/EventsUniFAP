import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumbs,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4", className)}>
      <div className="min-w-0 flex-1">
        {breadcrumbs && (
          <nav className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 font-medium mb-1.5">
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-slate-300 font-normal">/</span>}
                {b.href ? (
                  <a href={b.href} className="hover:text-unifap-navy transition max-w-[200px] sm:max-w-xs truncate">
                    {b.label}
                  </a>
                ) : (
                  <span className="text-slate-800 font-semibold max-w-[200px] sm:max-w-xs truncate">{b.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-extrabold text-unifap-navy tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}
