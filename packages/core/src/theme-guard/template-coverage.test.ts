// NOTE: dev-plan AC-004 measures validity with fields {valid, templateCount, missingElements},
// but ARCH defines ThemeTemplateValidationResult as {pass, themeId, templates[], failingTemplates[]}.
// All assertions in this file follow the ARCH contract (pass / templates / failingTemplates).

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { defineTemplate, resetTemplateRegistry } from "../registry/template.ts";
import { validateTemplateCoverage, validateThemeTemplates } from "./template-coverage.ts";

const THEMES_DIR = join(process.cwd(), "packages/themes");
const BUILTIN_THEMES = ["default", "magazine", "literary", "business", "tech"] as const;

beforeEach(() => {
  resetTemplateRegistry();
});

// ──────────────────────────────────────────────────────────────────────────────
// AC-003: template markdown covers 9 basic elements + ≥6 core block containers
// ──────────────────────────────────────────────────────────────────────────────
describe("AC-003: validateTemplateCoverage detects missing elements in incomplete markdown", () => {
  it("returns pass=true with coveredElements listing all 9 basic elements when markdown is complete", () => {
    const fullMarkdown = `
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

A paragraph with [a link](https://example.com).

- list item 1
- list item 2

> A blockquote

\`\`\`js
const x = 1;
\`\`\`

---

![an image](img.png)

| col1 | col2 |
|------|------|
| a    | b    |

:::callout
Callout content
:::

:::card
Card content
:::

:::steps
Step content
:::

:::quote
Quote content
:::

:::pull-quote
Pull quote
:::

:::compare
Compare content
:::
`;
    const report = validateTemplateCoverage("default", "full-test", fullMarkdown);
    expect(report.pass).toBe(true);
    expect(report.coveredElements).toContain("h1");
    expect(report.coveredElements).toContain("paragraph");
    expect(report.coveredElements).toContain("table");
    expect(report.missingElements).toEqual([]);
    expect(report.missingBlocks).toEqual([]);
  });

  it("returns pass=false and missingElements contains 'table' when table is absent", () => {
    const noTableMarkdown = `
# Heading 1
## H2
### H3
#### H4
##### H5
###### H6

A paragraph with [link](https://x.com).

- item

> quote

\`\`\`js
code
\`\`\`

---

![img](img.png)

:::callout
x
:::

:::card
x
:::

:::steps
x
:::

:::quote
x
:::

:::pull-quote
x
:::

:::compare
x
:::
`;
    const report = validateTemplateCoverage("default", "no-table", noTableMarkdown);
    expect(report.pass).toBe(false);
    expect(report.missingElements).toContain("table");
  });

  it("returns pass=false and missingBlocks contains 'callout' when callout block is absent", () => {
    const noCalloutMarkdown = `
# H1
## H2
### H3
#### H4
##### H5
###### H6

Para [link](https://x.com).

- item

> blockquote

\`\`\`
code
\`\`\`

---

![img](img.png)

| a | b |
|---|---|
| 1 | 2 |

:::card
x
:::

:::steps
x
:::

:::quote
x
:::

:::pull-quote
x
:::

:::compare
x
:::
`;
    const report = validateTemplateCoverage("default", "no-callout", noCalloutMarkdown);
    expect(report.pass).toBe(false);
    expect(report.missingBlocks).toContain("callout");
  });

  it("coveredBlocks lists only the block types present in markdown", () => {
    const onlyCalloutMarkdown = `
# H1
## H2
### H3
#### H4
##### H5
###### H6

Para [link](https://x.com).

- item

> q

\`\`\`
c
\`\`\`

---

![img](img.png)

| a | b |
|---|---|
| 1 | 2 |

:::callout
x
:::
`;
    const report = validateTemplateCoverage("default", "only-callout", onlyCalloutMarkdown);
    expect(report.coveredBlocks).toContain("callout");
    expect(report.missingBlocks).toContain("card");
    expect(report.missingBlocks).toContain("steps");
  });

  it("CoverageReport has all ARCH-specified fields with correct types", () => {
    const report = validateTemplateCoverage("default", "t", "# H1");
    expect(typeof report.pass).toBe("boolean");
    expect(Array.isArray(report.coveredElements)).toBe(true);
    expect(Array.isArray(report.missingElements)).toBe(true);
    expect(Array.isArray(report.coveredBlocks)).toBe(true);
    expect(Array.isArray(report.missingBlocks)).toBe(true);
    // With only H1, most elements are missing → pass must be false
    expect(report.pass).toBe(false);
    expect(report.missingElements.length).toBeGreaterThan(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// AC-004: validateThemeTemplates returns ThemeTemplateValidationResult per ARCH
// ──────────────────────────────────────────────────────────────────────────────
describe("AC-004: validateThemeTemplates returns ARCH ThemeTemplateValidationResult shape", () => {
  const FULL_MARKDOWN = `
# H1
## H2
### H3
#### H4
##### H5
###### H6

Para [link](https://x.com).

- item

> blockquote

\`\`\`js
code
\`\`\`

---

![img](img.png)

| a | b |
|---|---|
| 1 | 2 |

:::callout
x
:::

:::card
x
:::

:::steps
x
:::

:::quote
x
:::

:::pull-quote
x
:::

:::compare
x
:::
`;

  it("returns pass=true and empty failingTemplates when all templates cover all elements/blocks", () => {
    defineTemplate({
      themeId: "complete-theme",
      templateId: "complete",
      markdown: FULL_MARKDOWN,
      metadata: { description: "Complete" },
    });

    const result = validateThemeTemplates("complete-theme");
    expect(result.pass).toBe(true);
    expect(result.themeId).toBe("complete-theme");
    expect(result.templates.length).toBeGreaterThanOrEqual(1);
    expect(result.failingTemplates).toEqual([]);
    expect(result.templates[0].templateId).toBe("complete");
    expect(typeof result.templates[0].coverage.pass).toBe("boolean");
  });

  it("returns pass=false and failingTemplates contains templateId when coverage is incomplete", () => {
    defineTemplate({
      themeId: "incomplete-theme",
      templateId: "sparse",
      markdown: "# Just a heading",
      metadata: { description: "Sparse" },
    });

    const result = validateThemeTemplates("incomplete-theme");
    expect(result.pass).toBe(false);
    expect(result.themeId).toBe("incomplete-theme");
    expect(result.failingTemplates).toContain("sparse");
  });

  it("failing template's coverage.missingElements contains specific missing element names", () => {
    defineTemplate({
      themeId: "missing-elem-theme",
      templateId: "no-table-no-image",
      markdown: `
# H1
## H2
### H3
#### H4
##### H5
###### H6
Para [link](https://x.com).
- item
> quote
\`\`\`
code
\`\`\`
---
:::callout
x
:::
:::card
x
:::
:::steps
x
:::
:::quote
x
:::
:::pull-quote
x
:::
:::compare
x
:::
`,
      metadata: { description: "Missing table and image" },
    });

    const result = validateThemeTemplates("missing-elem-theme");
    const failingTemplate = result.templates.find((t) => t.templateId === "no-table-no-image");
    expect(failingTemplate?.coverage.missingElements).toContain("table");
    expect(failingTemplate?.coverage.missingElements).toContain("image");
  });

  it("returns pass=false for themeId with no registered templates", () => {
    const result = validateThemeTemplates("empty-theme");
    expect(result.pass).toBe(false);
    expect(result.themeId).toBe("empty-theme");
    expect(result.templates).toEqual([]);
  });

  it("ThemeTemplateValidationResult has all ARCH-specified fields with correct types", () => {
    defineTemplate({
      themeId: "shape-check-theme",
      templateId: "t1",
      markdown: "# H",
      metadata: { description: "T1" },
    });
    const result = validateThemeTemplates("shape-check-theme");
    expect(typeof result.pass).toBe("boolean");
    expect(typeof result.themeId).toBe("string");
    expect(Array.isArray(result.templates)).toBe(true);
    expect(Array.isArray(result.failingTemplates)).toBe(true);
  });

  it("multiple templates: pass=false when any template fails, failingTemplates lists only failing ones", () => {
    defineTemplate({
      themeId: "mixed-theme",
      templateId: "passing",
      markdown: FULL_MARKDOWN,
      metadata: { description: "Complete" },
    });
    defineTemplate({
      themeId: "mixed-theme",
      templateId: "failing",
      markdown: "# Sparse",
      metadata: { description: "Incomplete" },
    });

    const result = validateThemeTemplates("mixed-theme");
    expect(result.pass).toBe(false);
    expect(result.failingTemplates).toContain("failing");
    expect(result.failingTemplates).not.toContain("passing");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// AC-005: each built-in theme has ≥1 template that passes guard (real fixture files)
// ──────────────────────────────────────────────────────────────────────────────
describe("AC-005: each built-in theme ≥1 template passes coverage guard (real fixture files)", () => {
  for (const themeId of BUILTIN_THEMES) {
    it(`theme '${themeId}': fixture directory has ≥1 .md file`, () => {
      const templatesDir = join(THEMES_DIR, themeId, "templates");
      let files: string[];
      try {
        files = readdirSync(templatesDir).filter((f) => f.endsWith(".md"));
      } catch {
        throw new Error(
          `packages/themes/${themeId}/templates/ directory not found — GREEN must create it`
        );
      }
      expect(files.length).toBeGreaterThanOrEqual(1);
      const content = readFileSync(join(templatesDir, files[0]), "utf-8");
      expect(content.length).toBeGreaterThan(0);
    });

    it(`theme '${themeId}': at least one template passes validateThemeTemplates after package load`, async () => {
      try {
        await import(`../../../../packages/themes/${themeId}/src/templates/index.ts`);
      } catch {
        throw new Error(
          `packages/themes/${themeId}/src/templates/index.ts not found — GREEN must create it`
        );
      }

      const result = validateThemeTemplates(themeId);
      const anyPassing = result.templates.some((t) => t.coverage.pass);
      expect(anyPassing).toBe(true);
    });
  }
});
