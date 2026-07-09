import {
  HARD_REMOVE_TAGS,
  type PatchChange,
  type PatchLog,
  WECHAT_PASTE_UNSAFE_TAGS,
} from "@wechat-flow/contracts";
import {
  type ApplyRulesetResult,
  type RuleDefinition,
  applyRuleset,
  builtinRules,
} from "@wechat-flow/ruleset";
import type { Element, Node, Root } from "hast";
import { fromHtml } from "hast-util-from-html";
import { toHtml } from "hast-util-to-html";

export interface PlatformAdapter {
  id: string;
  name: string;
  patch(hast: Root, rules?: RuleDefinition[]): ApplyRulesetResult;
  inspect(html: string): PatchLog;
}

const PLATFORM_FILTER_RULES: RuleDefinition[] = builtinRules.filter(
  (rule) => rule.stage === "output" && (rule.scope === "strip" || rule.scope === "patch")
);

const UNSAFE_TAGS = new Set<string>([...WECHAT_PASTE_UNSAFE_TAGS, ...HARD_REMOVE_TAGS]);

function patch(hast: Root, rules: RuleDefinition[] = builtinRules): ApplyRulesetResult {
  return applyRuleset(hast, rules, "output");
}

function isParentNode(node: Node): node is Node & { children: Node[] } {
  return "children" in node;
}

function stripUnsafeTags(root: Root, changes: PatchChange[]): Root {
  function walk(node: Node): Node[] {
    if (node.type === "element") {
      const el = node as Element;
      const children = el.children.flatMap((child) => walk(child));

      if (UNSAFE_TAGS.has(el.tagName)) {
        changes.push({
          patch: `strip-tag:${el.tagName}`,
          count: 1,
          samples: [{ before: toHtml({ ...el, children: el.children } as Element) }],
        });
        return children;
      }

      return [{ ...el, children } as Element];
    }

    if (isParentNode(node)) {
      return [{ ...node, children: node.children.flatMap((child) => walk(child)) } as Node];
    }

    return [node];
  }

  const newChildren = root.children.flatMap((child) => walk(child));
  return { ...root, children: newChildren } as Root;
}

function inspect(html: string): PatchLog {
  const tree = fromHtml(html, { fragment: true }) as unknown as Root;
  const { hast: filteredHast, nodeChangeRecords } = applyRuleset(
    tree,
    PLATFORM_FILTER_RULES,
    "output"
  );

  const changes: PatchChange[] = nodeChangeRecords.map((record) => ({
    patch: record.triggerRuleId,
    count: 1,
    samples: [{ selector: record.nodeSelector, before: record.before }],
  }));

  const finalHast = stripUnsafeTags(filteredHast, changes);
  const patchedHtml = toHtml(finalHast);

  return { patchedHtml, changes };
}

export const wechatAdapter: PlatformAdapter = {
  id: "wechat",
  name: "微信公众号",
  patch,
  inspect,
};
