/**
 * Escapes a user-supplied search term so it matches literally.
 *
 * Without this a stray `(` or `*` is interpreted as a pattern, which at best
 * returns nothing and at worst builds an expression that is expensive to run.
 */
export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
