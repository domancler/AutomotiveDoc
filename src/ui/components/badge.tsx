import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border-transparent",
        secondary: "bg-secondary text-secondary-foreground border-transparent",
        outline: "text-foreground",
        /**
         * Info: stato neutro/operativo (es. Nuovo, Da controllare, Consegna in corso)
         * Colore coerente e professionale, non aggressivo.
         */
        info: "bg-blue-600 text-white border-transparent",
        success: "bg-emerald-600 text-white border-transparent",
        warning: "bg-amber-500 text-white border-transparent",
        danger: "bg-destructive text-destructive-foreground border-transparent",
      },
    },
    // Keep literal union types instead of widening to `string`
    // so it satisfies CVA's Config typing.
    defaultVariants: { variant: "secondary" } as const,
  }
);

export function Badge({
                        className,
                        variant,
                        ...props
                      }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
