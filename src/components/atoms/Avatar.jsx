export function initials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function Avatar({ name, photoUrl, size = 32, danger = false, className = "" }) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, not an optimizable static asset
      <img
        src={photoUrl}
        alt=""
        aria-hidden="true"
        style={{ width: size, height: size }}
        className={`inline-flex shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size >= 48 ? 16 : size >= 34 ? 12 : 11 }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold
        ${danger ? "bg-danger-soft text-danger-soft-foreground" : "bg-primary-soft text-nav-active-foreground"} ${className}`}
    >
      {initials(name)}
    </span>
  );
}
