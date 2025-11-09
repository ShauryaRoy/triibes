/**
 * Utility functions for generating and validating URL slugs
 */

/**
 * Converts a string to a URL-friendly slug
 * - Converts to lowercase
 * - Replaces spaces with hyphens
 * - Removes special characters
 * - Removes consecutive hyphens
 */
export function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars except spaces and hyphens
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with single hyphen
    .replace(/-+/g, '-') // Replace consecutive hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generates a random unique slug
 * Format: random-word-123abc
 */
export function generateRandomSlug(): string {
  const adjectives = [
    'happy', 'vibrant', 'cosmic', 'swift', 'bright', 'bold', 'clever', 
    'daring', 'eager', 'fluent', 'gentle', 'humble', 'jolly', 'keen',
    'lively', 'merry', 'noble', 'proud', 'quirky', 'radiant', 'serene',
    'spirited', 'thriving', 'upbeat', 'vivid', 'witty', 'zealous'
  ];
  
  const nouns = [
    'tribe', 'circle', 'squad', 'crew', 'guild', 'league', 'clan',
    'alliance', 'assembly', 'band', 'brigade', 'coalition', 'collective',
    'company', 'fellowship', 'force', 'gathering', 'network', 'order',
    'party', 'society', 'syndicate', 'union', 'venture', 'wing'
  ];
  
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNumber = Math.random().toString(36).substring(2, 8);
  
  return `${randomAdjective}-${randomNoun}-${randomNumber}`;
}

/**
 * Validates a slug format
 * - Must be 3-100 characters
 * - Only lowercase letters, numbers, and hyphens
 * - Cannot start or end with hyphen
 * - No consecutive hyphens
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length < 3 || slug.length > 100) {
    return false;
  }
  
  // Check format: lowercase, numbers, hyphens only
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

/**
 * Get validation error message for a slug
 */
export function getSlugValidationError(slug: string): string | null {
  if (!slug) {
    return "Slug is required";
  }
  
  if (slug.length < 3) {
    return "Slug must be at least 3 characters";
  }
  
  if (slug.length > 100) {
    return "Slug must be less than 100 characters";
  }
  
  if (/[A-Z]/.test(slug)) {
    return "Slug must be lowercase";
  }
  
  if (/\s/.test(slug)) {
    return "Slug cannot contain spaces";
  }
  
  if (/[^a-z0-9-]/.test(slug)) {
    return "Slug can only contain lowercase letters, numbers, and hyphens";
  }
  
  if (/^-|-$/.test(slug)) {
    return "Slug cannot start or end with a hyphen";
  }
  
  if (/--/.test(slug)) {
    return "Slug cannot contain consecutive hyphens";
  }
  
  return null;
}
