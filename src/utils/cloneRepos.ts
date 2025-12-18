import { spinner } from "@clack/prompts";
import { execa } from "execa";
import path from "node:path";
import { access } from "node:fs/promises";

export const cloneRepo = async (URL: string, dir: string) => {
  const repoName = path.basename(URL, ".git");
  const targetPath = path.join(dir, repoName);

  try {
    await access(targetPath);
    console.log(`✅ ${repoName} already exists`);
    return;
  } catch {
    // Directory doesn't exist, proceed with clone
  }


  const s = spinner();
  s.start(`Cloning ${repoName}`);

  try {
    await execa("git", ["clone", `${URL}`], { cwd: dir });
    s.stop(`${repoName} cloned succesfully!`);
  } catch (error) {
    s.stop(`Failed to clone ${repoName}`);
    throw error;
  }
};
