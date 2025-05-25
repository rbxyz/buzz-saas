"use client";

import * as React from "react";
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";
import { cn } from "@/lib/utils";

const AspectRatio = React.forwardRef<
  React.ElementRef<typeof AspectRatioPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AspectRatioPrimitive.Root> & {
    className?: string;
  }
>(({ className, children, ...props }, ref) => (
  <AspectRatioPrimitive.Root
    ref={ref}
    className={cn(
      "relative overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))]",
      className,
    )}
    {...props}
  >
    <div className="absolute inset-0 flex items-center justify-center">
      {children}
    </div>
  </AspectRatioPrimitive.Root>
));
AspectRatio.displayName = "AspectRatio";

export { AspectRatio };
