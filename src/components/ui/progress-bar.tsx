export function ProgressBar({
  value,
  max,
  label,
  tone = "rose",
}: {
  value: number;
  max: number;
  label: string;
  tone?: "rose" | "light";
}) {
  const pct = Math.round((Math.min(value, max) / max) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={`h-1.5 w-full overflow-hidden rounded-full ${tone === "light" ? "bg-white/30" : "bg-soft"}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${tone === "light" ? "bg-white" : "bg-rose"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
