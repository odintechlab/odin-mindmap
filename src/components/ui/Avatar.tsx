interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
}

export function Avatar({ name, src, size = 24 }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-full ring-2 ring-white dark:ring-zinc-900"
      />
    );
  }

  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-indigo-500 text-white font-medium ring-2 ring-white dark:ring-zinc-900"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}
