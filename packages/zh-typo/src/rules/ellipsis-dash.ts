const rThreeDots = /\.\.\./g;
const rDoubleDash = /--/g;

export function applyEllipsisDash(value: string): { value: string; count: number } {
  let count = 0;
  let result = value.replace(rThreeDots, () => {
    count++;
    return "……";
  });
  result = result.replace(rDoubleDash, () => {
    count++;
    return "——";
  });
  return { value: result, count };
}
