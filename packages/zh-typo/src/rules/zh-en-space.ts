// Inserts a half-width space between Chinese characters and ASCII letters/digits.
const CJK = "⺀-⻿⼀-⿟぀-ゟ゠-ヿ㄀-ㄯ㈀-㋿㐀-䶿一-鿿豈-﫿︰-﹏";
const ASCII = "A-Za-z0-9";

const rCjkBeforeAscii = new RegExp(`([${CJK}])([${ASCII}])`, "gu");
const rAsciiBeforeCjk = new RegExp(`([${ASCII}])([${CJK}])`, "gu");

export function applyZhEnSpace(value: string): { value: string; count: number } {
  let count = 0;
  let result = value.replace(rCjkBeforeAscii, (_, cjk: string, asc: string) => {
    count++;
    return `${cjk} ${asc}`;
  });
  result = result.replace(rAsciiBeforeCjk, (_, asc: string, cjk: string) => {
    count++;
    return `${asc} ${cjk}`;
  });
  return { value: result, count };
}
