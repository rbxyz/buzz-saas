import * as React from "react"

import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border border-subtle bg-input px-4 py-2.5 text-body text-foreground",
          "placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 focus:border-transparent",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/30",
          "transition-all duration-200 ease-smooth",
          "hover:border-border/80 hover:bg-background/50",
          "file:border-0 file:bg-transparent file:text-caption file:font-medium file:text-foreground",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
