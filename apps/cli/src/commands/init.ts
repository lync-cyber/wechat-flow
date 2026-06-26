import * as fs from "node:fs";
import * as path from "node:path";
import process from "node:process";

export interface InitOptions {
  template: "plugin" | "theme";
  dir?: string;
}

export interface InitResult {
  createdDir: string;
  files: string[];
}

function pluginManifest(name: string): string {
  return JSON.stringify(
    {
      name,
      id: name,
      permissions: { network: [] },
      intents: { variants: [] },
    },
    null,
    2
  );
}

function themeManifest(name: string): string {
  return JSON.stringify(
    {
      name,
      id: name,
      type: "theme",
    },
    null,
    2
  );
}

function pluginIndex(): string {
  return "// Plugin entry point\nexport default {};\n";
}

function themeIndex(): string {
  return "// Theme entry point\nexport default {};\n";
}

function packageJson(name: string, template: "plugin" | "theme"): string {
  return JSON.stringify(
    {
      name,
      version: "0.0.0",
      type: "module",
      main: "src/index.ts",
      keywords: [template],
    },
    null,
    2
  );
}

export function runInit(name: string, opts: InitOptions): InitResult {
  const baseDir = opts.dir ?? process.cwd();
  const packDir = path.join(baseDir, name);

  fs.mkdirSync(path.join(packDir, "src"), { recursive: true });

  const manifestContent = opts.template === "plugin" ? pluginManifest(name) : themeManifest(name);
  const indexContent = opts.template === "plugin" ? pluginIndex() : themeIndex();
  const pkgContent = packageJson(name, opts.template);

  const manifestPath = path.join(packDir, "manifest.json");
  const indexPath = path.join(packDir, "src", "index.ts");
  const pkgPath = path.join(packDir, "package.json");

  fs.writeFileSync(manifestPath, manifestContent);
  fs.writeFileSync(indexPath, indexContent);
  fs.writeFileSync(pkgPath, pkgContent);

  return {
    createdDir: packDir,
    files: [manifestPath, indexPath, pkgPath],
  };
}
