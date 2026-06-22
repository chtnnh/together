import * as SwitchPrimitive from "@radix-ui/react-switch";

export function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root className={className ? `together-switch ${className}` : "together-switch"} {...props}>
      <SwitchPrimitive.Thumb className="together-switch-thumb" />
    </SwitchPrimitive.Root>
  );
}
