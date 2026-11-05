/**
 * Convert a string to a clean, URL-friendly slug.
 * e.g. "Prathibha Sangamam" -> "prathibha-sangamam"
 */
export function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

