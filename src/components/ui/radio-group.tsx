import * as React from "react"
import { Circle } from "lucide-react"
import { cn } from "@/lib/utils"

const RadioGroupContext = React.createContext<{
  value?: string
  onValueChange?: (value: string) => void
} | undefined>(undefined)

const RadioGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: string
    defaultValue?: string
    onValueChange?: (value: string) => void
  }
>(({ className, value, defaultValue, onValueChange, ...props }, ref) => {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <div className={cn("grid gap-2", className)} {...props} ref={ref} />
    </RadioGroupContext.Provider>
  )
})
RadioGroup.displayName = "RadioGroup"

const RadioGroupItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, value, ...props }, ref) => {
  const context = React.useContext(RadioGroupContext)
  const checked = context?.value === value
  
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      value={value}
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onClick={() => context?.onValueChange?.(value)}
      ref={ref}
      {...props}
    >
      <span className={cn("flex items-center justify-center", checked ? "text-current" : "text-transparent")}>
        <Circle className="h-2.5 w-2.5 fill-current text-current" />
      </span>
    </button>
  )
})
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
