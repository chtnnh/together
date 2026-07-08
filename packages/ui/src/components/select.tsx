import * as SelectPrimitive from "@radix-ui/react-select";
import type { CSSProperties } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  position = "popper",
  style,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  const popperSizeStyle =
    position === "popper"
      ? ({
          width: "var(--radix-select-trigger-width)",
          minWidth: "var(--radix-select-trigger-width)",
        } as CSSProperties)
      : undefined;

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(
          "together-select-content relative z-[130] max-h-[min(var(--radix-select-content-available-height),16rem)] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text)] shadow-md",
          className,
        )}
        position={position}
        side="bottom"
        align="start"
        sideOffset={4}
        style={{ ...popperSizeStyle, ...style }}
        {...props}
      >
        <SelectPrimitive.Viewport className="together-select-viewport p-1">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-md px-3 py-2 text-sm outline-none focus:bg-[var(--border)]",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}
