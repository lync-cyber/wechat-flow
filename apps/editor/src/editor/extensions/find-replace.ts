import { search, searchKeymap } from "@codemirror/search";
import type { Extension } from "@codemirror/state";
import { keymap } from "@codemirror/view";

export const findReplaceExtension: Extension[] = [search({ top: true }), keymap.of(searchKeymap)];
