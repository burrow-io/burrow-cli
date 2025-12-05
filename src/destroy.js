import { intro, outro, spinner } from "@clack/prompts";
import { execa } from "execa";
import { findUp } from "find-up";

async function runTerraformDestroy(terraformDir) {
  const s = spinner();
  s.start("Destroying Terraform infrastructure");

  try {
    await execa("terraform", ["destroy", "-auto-approve"], {
      cwd: terraformDir,
      stdio: "inherit",
    });
    s.stop("Terraform destroy completed successfully");
  } catch (error) {
    s.stop("Failed to destroy Terraform infrastructure");
    console.error("Error:", error.message);
    throw error;
  }
}

intro("Terraform Destroy Command Executed");

const burrowInfraDir = await findUp("burrow-infrastructure/terraform", {
  type: "directory",
});

try {
  await runTerraformDestroy(burrowInfraDir);
  outro("All infrastructure has been destroyed.");
} catch (error) {
  console.error("❌ Destroy operation failed:", error.message);
}
