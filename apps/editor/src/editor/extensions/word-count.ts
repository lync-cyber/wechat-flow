import { StateField } from "@codemirror/state";

export interface WordCount {
  chineseChars: number;
  totalChars: number;
}

const CJK_RE = /\p{Script=Han}/gu;

export function countWords(text: string): WordCount {
  if (text.length === 0) return { chineseChars: 0, totalChars: 0 };
  const chineseChars = (text.match(CJK_RE) ?? []).length;
  const totalChars = [...text].length;
  return { chineseChars, totalChars };
}

export const wordCountField = StateField.define<WordCount>({
  create(state) {
    return countWords(state.doc.toString());
  },
  update(value, tr) {
    if (!tr.docChanged) return value;
    return countWords(tr.newDoc.toString());
  },
});
