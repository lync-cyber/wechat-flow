import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { runBenchmark } from "./perf-runner.ts";
import type { BenchResult } from "./perf-runner.ts";

export async function measureTypingLatency(
  opts: { iterations?: number; docSize?: number } = {}
): Promise<BenchResult> {
  const { iterations = 1000, docSize = 10000 } = opts;

  const doc = "a".repeat(docSize);
  const parent = document.createElement("div");

  const state = EditorState.create({ doc });
  const view = new EditorView({ state, parent });

  let pos = 0;
  const result = await runBenchmark(
    "typing-latency",
    () => {
      view.dispatch({ changes: { from: pos % (docSize + pos), insert: "x" } });
      // Force synchronous DOM measurement to include layout cost
      void view.contentDOM.offsetHeight;
      pos++;
    },
    { iterations }
  );

  try {
    view.destroy();
  } catch {
    // happy-dom MutationObserver proxy incompatibility — safe to ignore in test env
  }

  return result;
}
