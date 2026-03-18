/**
 * Formats an ISO date string as a compact human-readable timestamp:
 * "MMM DD  HH:mm" (e.g. "Mar  5  09:04").
 * Returns an empty string if the input cannot be parsed.
 */
export function formatDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return '';
    const month = d.toLocaleString('en-US', { month: 'short' });
    const day = d.getDate().toString().padStart(2, ' ');
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${month} ${day}  ${hours}:${mins}`;
  } catch {
    return '';
  }
}

/**
 * Formats an ISO date string as a short month+day: "Mar  5".
 * Returns an empty string if the input cannot be parsed.
 */
export function formatCommitDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return '';
    const month = d.toLocaleString('en-US', { month: 'short' });
    const day = d.getDate().toString().padStart(2, ' ');
    return `${month} ${day}`;
  } catch {
    return '';
  }
}
