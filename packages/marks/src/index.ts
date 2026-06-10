import { onMarkRegistryReset, registerMark } from "@wechat-flow/core/src/registry/mark.ts";
import { badge } from "./marks/badge.ts";
import { bold } from "./marks/bold.ts";
import { emphasis } from "./marks/emphasis.ts";
import { highlight } from "./marks/highlight.ts";
import { inlineCode } from "./marks/inline-code.ts";
import { insert } from "./marks/insert.ts";
import { italic } from "./marks/italic.ts";
import { link } from "./marks/link.ts";
import { sub } from "./marks/sub.ts";
import { sup } from "./marks/sup.ts";
import { underline } from "./marks/underline.ts";
import { wavy } from "./marks/wavy.ts";

const ALL_MARKS = [
  bold,
  italic,
  link,
  inlineCode,
  badge,
  emphasis,
  highlight,
  underline,
  wavy,
  insert,
  sup,
  sub,
];

function registerAll(): void {
  for (const mark of ALL_MARKS) {
    registerMark(mark);
  }
}

registerAll();
onMarkRegistryReset(registerAll);
