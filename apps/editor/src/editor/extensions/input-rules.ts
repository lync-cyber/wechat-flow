import { EditorState, type Extension, type TransactionSpec } from "@codemirror/state";

export interface InputRuleMatch {
  insert: string;
  consumeBefore: number;
}

const HAN_RE = /\p{Script=Han}/u;
const ASCII_ALNUM_RE = /[A-Za-z0-9]/;

export function matchInputRule(before: string, inserted: string): InputRuleMatch | null {
  if (HAN_RE.test(before) && ASCII_ALNUM_RE.test(inserted)) {
    return { insert: ` ${inserted}`, consumeBefore: 0 };
  }
  if (ASCII_ALNUM_RE.test(before) && HAN_RE.test(inserted)) {
    return { insert: ` ${inserted}`, consumeBefore: 0 };
  }

  if (inserted === '"') {
    const isOpen = before === "" || /\s/.test(before);
    return { insert: isOpen ? "“" : "”", consumeBefore: 0 };
  }

  if (inserted === "'") {
    const isOpen = before === "" || /\s/.test(before);
    return { insert: isOpen ? "‘" : "’", consumeBefore: 0 };
  }

  if (inserted === "-" && before === "-") {
    return { insert: "——", consumeBefore: 1 };
  }

  return null;
}

export function inputRulesExtension(enabled: () => boolean = () => true): Extension {
  return EditorState.transactionFilter.of((tr) => {
    if (!enabled()) return tr;
    if (!tr.isUserEvent("input.type") || !tr.docChanged) return tr;

    let spec: TransactionSpec | null = null;

    tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
      if (spec) return;
      if (fromA !== toA) return;
      const insertedText = inserted.toString();
      if ([...insertedText].length !== 1) return;

      const before = fromA === 0 ? "" : tr.startState.doc.sliceString(fromA - 1, fromA);
      const match = matchInputRule(before, insertedText);
      if (!match) return;

      if (match.consumeBefore === 0) {
        spec = {
          changes: { from: fromA, to: fromA, insert: match.insert },
          selection: { anchor: fromA + match.insert.length },
          userEvent: "input.type",
        };
      } else {
        spec = {
          changes: { from: fromA - 1, to: fromA, insert: match.insert },
          selection: { anchor: fromA - 1 + match.insert.length },
          userEvent: "input.type",
        };
      }
    });

    return spec ?? tr;
  });
}
