/**
 * HtmlSanitizer - Single Responsibility: Sanitize HTML to prevent XSS
 */

export class HtmlSanitizer {
  private static readonly ESCAPE_MAP: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }

  static escape(text: string): string {
    return text.replace(/[&<>"']/g, (char) => HtmlSanitizer.ESCAPE_MAP[char])
  }
}
