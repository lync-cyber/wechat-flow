import type { Nodes, Root } from "hast";
import { type Schema, defaultSchema, sanitize } from "hast-util-sanitize";

export function sanitizeHast(node: Readonly<Nodes>, schema?: Readonly<Schema>): Root {
  return sanitize(node, schema ?? defaultSchema) as Root;
}
