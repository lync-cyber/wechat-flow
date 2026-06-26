const rDoubleQuotePair = /\x22([^\x22]+)\x22/g;
const rSingleQuotePair = /\x27([^\x27]+)\x27/g;

export function applySmartQuotes(value: string): { value: string; count: number } {
  let count = 0;
  let result = value.replace(rDoubleQuotePair, (_, inner: string) => {
    count++;
    return `“${inner}”`;
  });
  result = result.replace(rSingleQuotePair, (_, inner: string) => {
    count++;
    return `‘${inner}’`;
  });
  return { value: result, count };
}
