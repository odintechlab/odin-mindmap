interface BadgeProps {
  label: string;
  color?: string;
  className?: string;
}

export function Badge({ label, color, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white ${className}`}
      style={{ backgroundColor: color ?? "#71717a" }}
    >
      {label}
    </span>
  );
}
