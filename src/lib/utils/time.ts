export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

export function percentChange(
  current: number,
  previous: number,
): { value: string; positive: boolean } {
  if (previous === 0 && current === 0) return { value: "0%", positive: true };
  if (previous === 0) return { value: "+∞", positive: false };
  const change = ((current - previous) / previous) * 100;
  return {
    value: `${change >= 0 ? "+" : ""}${Math.round(change)}%`,
    positive: change <= 0,
  };
}
