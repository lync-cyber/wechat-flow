export function buildDualMimePayload(html: string, text: string): ClipboardItem[] {
  const htmlBlob = new Blob([html], { type: "text/html" });
  const plainBlob = new Blob([text], { type: "text/plain" });
  return [
    new ClipboardItem({ "text/html": htmlBlob }),
    new ClipboardItem({ "text/plain": plainBlob }),
  ];
}
