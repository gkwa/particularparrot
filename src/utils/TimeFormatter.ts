/**
 * TimeFormatter - Single Responsibility: Format seconds into readable time strings
 */

export class TimeFormatter {
  static format(seconds: number): string {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    const parts: string[] = []

    if (days > 0) {
      parts.push(`${days}d`)
    }
    if (hours > 0) {
      parts.push(`${hours}h`)
    }
    if (minutes > 0) {
      parts.push(`${minutes}m`)
    }
    if (secs > 0 || parts.length === 0) {
      parts.push(`${secs}s`)
    }

    return parts.join("")
  }
}
