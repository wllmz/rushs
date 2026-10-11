import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "ghost" | "danger";
  size?: "md" | "sm";
};

const variants = {
  primary: "bg-foreground text-background hover:bg-foreground/85",
  ghost: "text-foreground/70 hover:bg-foreground/5 hover:text-foreground",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const sizes = {
  md: "h-10 px-4 text-sm",
  sm: "h-8 px-2 text-xs",
};

export function Button({ variant = "primary", size = "md", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
