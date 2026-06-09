import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, placeholder } from "@codemirror/view";
import { type Ref, onBeforeUnmount, ref } from "vue";
import { markdownLanguageExtension } from "../lib/cm-markdown-lang";
import { cmBaseTheme, cmSyntaxHighlighting } from "../lib/cm-theme";
import { PREVIEW_DEBOUNCE_MS } from "../lib/constants";

export interface UseCodemirrorOptions {
  initialValue?: string;
  readonly?: boolean;
  onValueChange?: (value: string) => void;
}

export interface UseCodemirrorReturn {
  editorView: Ref<EditorView | null>;
  mount: (el: HTMLElement) => void;
  destroy: () => void;
  setValue: (value: string) => void;
  getValue: () => string;
}

export function useCodemirror(options: UseCodemirrorOptions = {}): UseCodemirrorReturn {
  const { initialValue = "", readonly = false, onValueChange } = options;
  const editorView: Ref<EditorView | null> = ref(null);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function mount(el: HTMLElement): void {
    if (editorView.value) return;

    const extensions = [
      lineNumbers(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      ...markdownLanguageExtension(),
      cmBaseTheme,
      cmSyntaxHighlighting,
      EditorState.readOnly.of(readonly),
    ];

    if (onValueChange) {
      extensions.push(
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            if (debounceTimer !== null) {
              clearTimeout(debounceTimer);
            }
            debounceTimer = setTimeout(() => {
              onValueChange(update.state.doc.toString());
              debounceTimer = null;
            }, PREVIEW_DEBOUNCE_MS);
          }
        })
      );
    }

    const state = EditorState.create({
      doc: initialValue,
      extensions,
    });

    editorView.value = new EditorView({ state, parent: el });
  }

  function destroy(): void {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    try {
      editorView.value?.destroy();
    } catch {
      // happy-dom MutationObserver proxy incompatibility — safe to ignore in test env
    }
    editorView.value = null;
  }

  function setValue(value: string): void {
    const view = editorView.value;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    });
  }

  function getValue(): string {
    return editorView.value?.state.doc.toString() ?? "";
  }

  onBeforeUnmount(() => {
    destroy();
  });

  return { editorView, mount, destroy, setValue, getValue };
}
