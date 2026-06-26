// Converts half-width ASCII punctuation to full-width when surrounded by CJK context.
const CJK_PAT = "⺀-⻿⼀-⿟぀-ゟ゠-ヿ㄀-ㄯ㈀-㋿㐀-䶿一-鿿豈-﫿︰-﹏";

// Map half-width → full-width for punctuation appearing after CJK characters.
const PUNCT_MAP: Record<string, string> = {
  ",": "，",
  ".": "。",
  "?": "？",
  "!": "！",
  "(": "（",
  ")": "）",
  ":": "：",
  ";": "；",
};

const rHalfwidthAfterCjk = new RegExp(`([${CJK_PAT}])([,.?!():;])`, "gu");

export function applyFullwidthPunctuation(value: string): { value: string; count: number } {
  let count = 0;
  const result = value.replace(rHalfwidthAfterCjk, (_, cjk: string, punct: string) => {
    const fw = PUNCT_MAP[punct];
    if (fw) {
      count++;
      return `${cjk}${fw}`;
    }
    return `${cjk}${punct}`;
  });
  return { value: result, count };
}
