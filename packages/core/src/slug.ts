import { randomBytes } from 'node:crypto';

/** URL-safe slug from arbitrary text. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Slug with a short random suffix to avoid collisions. */
export function uniqueSlug(input: string): string {
  const base = slugify(input) || 'business';
  return `${base}-${randomBytes(3).toString('hex')}`;
}
