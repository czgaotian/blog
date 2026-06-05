import * as React from "react"
import { Pipette } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface ColorPickerProps extends Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> {
  value: string
  onChange: (value: string) => void
}

function ColorPicker({
  value,
  onChange,
  className,
  disabled,
  id,
  ...props
}: ColorPickerProps) {
  const colorInputId = id ? `${id}-native` : undefined
  const normalizedValue = isHexColor(value) ? value : "#64748b"

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <label
        htmlFor={colorInputId}
        className={cn(
          "relative inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-input shadow-sm outline-none focus-within:ring-1 focus-within:ring-ring",
          disabled && "cursor-not-allowed opacity-50"
        )}
        style={{ backgroundColor: normalizedValue }}
        aria-label="Choose color"
      >
        <Pipette className="text-white drop-shadow" />
        <input
          id={colorInputId}
          type="color"
          className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          value={normalizedValue}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      <Input
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder="#64748b"
        {...props}
      />
    </div>
  )
}

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

export { ColorPicker }
