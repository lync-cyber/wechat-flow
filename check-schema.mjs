import { defaultSchema } from "hast-util-sanitize";
const wildcardAttrs = defaultSchema.attributes?.["*"] ?? [];
console.log("wildcard attrs:", JSON.stringify(wildcardAttrs));
const allAttrs = Object.entries(defaultSchema.attributes ?? {});
const dangerous = allAttrs.filter(
  ([tag, attrs]) =>
    Array.isArray(attrs) &&
    attrs.some((a) => typeof a === "string" && (a.startsWith("on") || a === "srcdoc"))
);
console.log("event handler / srcdoc entries:", JSON.stringify(dangerous));
const hasStyle = wildcardAttrs.includes("style");
console.log("style in default wildcard:", hasStyle);
