/**
 * Typed content export.
 *
 * Import this module instead of content.json directly:
 *   import content from '@data/content';
 *
 * The `satisfies Content` check enforces that content.json matches the schema
 * defined in src/types/content.ts at build time — any structural mismatch
 * (missing fields, wrong types) will produce a TypeScript error here.
 */
import type { Content } from '../types/content';
import raw from './content.json';

export default raw satisfies Content;
