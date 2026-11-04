export function formatQueueAge(createdAt: Date, now = new Date()): string {
  const hours = Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / 3_600_000));
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours === 0 ? `${days}d` : `${days}d ${remainingHours}h`;
}

export function getImportProgress(processed: number, total: number): number {
  if (!Number.isFinite(processed) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((processed / total) * 100)));
}
