import { type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "outline";
  size?: "sm" | "md" | "icon";
}

const variants = {
  default: "btn-gradient text-white",
  ghost:
    "bg-transparent hover:bg-black/5 dark:hover:bg-white/8 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100",
  outline:
    "border border-[var(--border-strong)] bg-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-zinc-700 dark:text-zinc-300",
};

const sizes = {
  sm: "px-2.5 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2 text-sm rounded-xl",
  icon: "p-2 rounded-xl",
};

export function Button({
  variant = "default",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
