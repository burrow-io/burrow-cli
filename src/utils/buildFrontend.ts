import { spinner } from "@clack/prompts";
import { execa } from "execa";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

export interface FileInfo {
  filePath: string;
  key: string;
}

export async function buildFrontend(frontendDir: string): Promise<void> {
  const s = spinner();
  s.start("Building UI");

  try {
    await execa("npm", ["ci"], { cwd: frontendDir });
    await execa("npm", ["run", "build"], { cwd: frontendDir });
    s.stop("Frontend built!");
  } catch (error) {
    s.stop("Failed to build the frontend");
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error:", errorMessage);
    throw error;
  }
}

export async function getAllFiles(
  dirPath: string,
  baseDir: string = dirPath
): Promise<FileInfo[]> {
  const files: FileInfo[] = [];
  const entries = await readdir(dirPath);

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stats = await stat(fullPath);

    if (stats.isDirectory()) {
      files.push(...(await getAllFiles(fullPath, baseDir)));
    } else {
      const relativePath = path.relative(baseDir, fullPath);
      files.push({
        filePath: fullPath,
        key: relativePath.replace(/\\/g, "/"),
      });
    }
  }

  return files;
}

export function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes: Record<string, string> = {
    ".html": "text/html",
    ".htm": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".eot": "application/vnd.ms-fontobject",
    ".otf": "font/otf",
    ".xml": "application/xml",
    ".txt": "text/plain",
    ".pdf": "application/pdf",
    ".webmanifest": "application/manifest+json",
  };

  return contentTypes[ext] || "application/octet-stream";
}
