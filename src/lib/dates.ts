const DAY = 86_400_000;

export function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function daysAgo(n: number, from = new Date()) {
  return new Date(from.getTime() - n * DAY);
}

export function relativeTime(iso: string, now = new Date()) {
  const diff = now.getTime() - new Date(iso).getTime();
  const abs = Math.abs(diff);
  const future = diff < 0;
  const fmt = (v: number, u: string) => (future ? `in ${v}${u}` : `${v}${u} ago`);
  if (abs < 60_000) return "just now";
  if (abs < 3_600_000) return fmt(Math.round(abs / 60_000), "m");
  if (abs < DAY) return fmt(Math.round(abs / 3_600_000), "h");
  if (abs < 7 * DAY) return fmt(Math.round(abs / DAY), "d");
  return formatDate(iso);
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return d.toLocaleDateString("en-US", opts);
}

export function daysUntil(dateStr: string, now = new Date()) {
  const target = startOfDay(new Date(`${dateStr}T12:00:00`));
  return Math.round((target.getTime() - startOfDay(now).getTime()) / DAY);
}

export function weekdayName(d = new Date()) {
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

export function greetingFor(d = new Date()) {
  const h = d.getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function isoDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export { DAY };
