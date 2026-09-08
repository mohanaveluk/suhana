/**
 * Formats a past timestamp as a short relative string — "Just now", "5 min ago",
 * "3 hours ago", "Yesterday", "4 days ago" — falling back to a plain date once
 * it's more than a week old. No existing shared date-util covers this; the only
 * relative-date helpers in the app (chat.ts's isToday/isYesterday) only bucket
 * into Today/Yesterday/full-date for a day separator, not a fine-grained "ago".
 */
export function timeAgo(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 0) return 'Just now';
  if (seconds < 60) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;

  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
