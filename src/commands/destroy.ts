import { intro, outro } from "@clack/prompts";
import { findUp } from "find-up";
import { runTerraformDestroy } from "../utils/terraform.js";

export async function destroy(): Promise<void> {
  intro("Terraform Destroy Command Executed");

  const burrowInfraDir = await findUp("burrow-infrastructure/terraform", {
    type: "directory",
  });

  if (!burrowInfraDir) {
    throw new Error("Could not find burrow-infrastructure/terraform directory");
  }

  try {
    await runTerraformDestroy(burrowInfraDir);
    outro("All infrastructure has been destroyed.");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Destroy operation failed:", errorMessage);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  try {
    await destroy();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("\n❌ Destroy operation failed!");
    console.error(`Error: ${errorMessage}`);
    process.exit(1);
  }
}

main();
