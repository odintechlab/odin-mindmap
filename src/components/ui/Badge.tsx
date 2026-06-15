interface BadgeProps {
  label: string;
  color?: string;
  className?: string;
}

export function Badge({ label, color, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white shadow-sm ${className}`}
      style={{ backgroundColor: color ?? "#71717a" }}
    >
      {label}
    </span>
  );
}
