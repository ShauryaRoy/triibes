/**
 * Generate a URL-friendly slug from a title
 * Example: "Gaming Night Party!" -> "gaming-night-party"
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
    .replace(/\-\-+/g, '-')      // Replace multiple - with single -
    .replace(/^-+/, '')          // Trim - from start of text
    .replace(/-+$/, '');         // Trim - from end of text
}

/**
 * Generate a random alphanumeric string
 * Example: generateRandomString(6) -> "a8f3k2"
 */
export function generateRandomString(length: number = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a unique event slug
 * Format: "{title-slug}-{random-6-chars}"
 * Example: "Gaming Night" -> "gaming-night-a8f3k2"
 * 
 * @param title - The event title
 * @param maxTitleLength - Maximum length for the title part (default: 50)
 */
export function generateEventSlug(title: string, maxTitleLength: number = 50): string {
  let titleSlug = slugify(title);
  
  // Truncate title if too long
  if (titleSlug.length > maxTitleLength) {
    titleSlug = titleSlug.substring(0, maxTitleLength);
    // Remove trailing dash if truncation created one
    titleSlug = titleSlug.replace(/-+$/, '');
  }
  
  // Add random string for uniqueness
  const randomPart = generateRandomString(6);
  
  return `${titleSlug}-${randomPart}`;
}

/**
 * Validate if a slug is in the correct format
 */
export function isValidEventSlug(slug: string): boolean {
  // Must be lowercase alphanumeric with dashes, ending in random string
  const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*-[a-z0-9]{6}$/;
  return slugPattern.test(slug);
}

/**
 * Extract the random part from a slug
 * Example: "gaming-night-a8f3k2" -> "a8f3k2"
 */
export function getSlugRandomPart(slug: string): string {
  const parts = slug.split('-');
  return parts[parts.length - 1];
}
