import { listThemes } from "@wechat-flow/core";

export interface CommandDefinition {
  id: string;
  group: string;
  label: string;
  shortcut?: string;
  /** 占位命令：run 为空实现，待对应功能任务接线后移除此标记 */
  placeholder?: true;
  run: () => void;
}

export interface CommandRegistryDeps {
  switchTheme: (themeId: string) => void;
  downloadHtml?: () => void;
  exportLongImage?: () => void;
  openShortcuts?: () => void;
  openPaletteDerive?: () => void;
  toggleLeftPanelCollapsed?: () => void;
}

export function buildEditorCommands(deps: CommandRegistryDeps): CommandDefinition[] {
  const { switchTheme } = deps;

  const viewCommands: CommandDefinition[] = [
    {
      id: "view-focus-mode",
      group: "视图",
      label: "切换专注模式",
      shortcut: "F11",
      placeholder: true,
      run: () => {},
    },
    {
      id: "view-collapse-left",
      group: "视图",
      label: "折叠左栏",
      run: () => deps.toggleLeftPanelCollapsed?.(),
    },
    {
      id: "view-collapse-right",
      group: "视图",
      label: "折叠右栏",
      placeholder: true,
      run: () => {},
    },
    {
      id: "view-toggle-viewport",
      group: "视图",
      label: "切换视口",
      placeholder: true,
      run: () => {},
    },
    {
      id: "view-undo",
      group: "视图",
      label: "撤销",
      shortcut: "Ctrl+Z",
      placeholder: true,
      run: () => {},
    },
    {
      id: "view-redo",
      group: "视图",
      label: "重做",
      shortcut: "Ctrl+Y",
      placeholder: true,
      run: () => {},
    },
    {
      id: "view-find",
      group: "视图",
      label: "查找",
      shortcut: "Ctrl+F",
      placeholder: true,
      run: () => {},
    },
    {
      id: "view-find-replace",
      group: "视图",
      label: "查找替换",
      shortcut: "Ctrl+H",
      placeholder: true,
      run: () => {},
    },
  ];

  const themeCommands: CommandDefinition[] = listThemes().map((theme) => ({
    id: `switch-theme-${theme.id}`,
    group: "主题",
    label: `切换至 ${theme.name} 主题`,
    run: () => switchTheme(theme.id),
  }));

  const themeExtraCommands: CommandDefinition[] = [
    {
      id: "theme-custom-color",
      group: "主题",
      label: "自定义配色",
      placeholder: true,
      run: () => {},
    },
    {
      id: "theme-palette-derive",
      group: "主题",
      label: "调色板派生",
      run: () => deps.openPaletteDerive?.(),
    },
  ];

  const docCommands: CommandDefinition[] = [
    { id: "doc-jump", group: "文档", label: "跳转文档模糊匹配", placeholder: true, run: () => {} },
    { id: "doc-new", group: "文档", label: "新建文档", placeholder: true, run: () => {} },
    { id: "doc-delete", group: "文档", label: "删除当前文档", placeholder: true, run: () => {} },
  ];

  const contentCommands: CommandDefinition[] = [
    {
      id: "content-insert-component",
      group: "内容",
      label: "插入组件",
      placeholder: true,
      run: () => {},
    },
    {
      id: "content-zh-typo",
      group: "内容",
      label: "中文排版修订",
      placeholder: true,
      run: () => {},
    },
  ];

  const exportCommands: CommandDefinition[] = [
    {
      id: "export-copy-html",
      group: "导出",
      label: "复制 inline HTML",
      placeholder: true,
      run: () => {},
    },
    {
      id: "export-download-html",
      group: "导出",
      label: "下载 HTML",
      run: () => deps.downloadHtml?.(),
    },
    {
      id: "export-long-image",
      group: "导出",
      label: "导出长图",
      run: () => deps.exportLongImage?.(),
    },
    {
      id: "export-cover-landscape",
      group: "导出",
      label: "导出封面横版",
      placeholder: true,
      run: () => {},
    },
    {
      id: "export-cover-square",
      group: "导出",
      label: "导出封面方版",
      placeholder: true,
      run: () => {},
    },
  ];

  const helpCommands: CommandDefinition[] = [
    {
      id: "help-shortcuts",
      group: "帮助",
      label: "快捷键手册",
      shortcut: "?",
      run: () => deps.openShortcuts?.(),
    },
    { id: "help-whats-new", group: "帮助", label: "新功能说明", placeholder: true, run: () => {} },
  ];

  return [
    ...viewCommands,
    ...themeCommands,
    ...themeExtraCommands,
    ...docCommands,
    ...contentCommands,
    ...exportCommands,
    ...helpCommands,
  ];
}

export function filterCommands(commands: CommandDefinition[], query: string): CommandDefinition[] {
  if (!query) return commands;
  const q = query.toLowerCase();
  return commands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(q) ||
      cmd.group.toLowerCase().includes(q) ||
      cmd.id.toLowerCase().includes(q)
  );
}

export interface ShortcutEntry {
  group: string;
  label: string;
  shortcut: string;
}

export function listShortcutEntries(): ShortcutEntry[] {
  const commands = buildEditorCommands({ switchTheme: () => {} });
  return commands
    .filter((cmd): cmd is CommandDefinition & { shortcut: string } => Boolean(cmd.shortcut))
    .map((cmd) => ({ group: cmd.group, label: cmd.label, shortcut: cmd.shortcut }));
}
