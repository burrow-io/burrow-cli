import { intro, outro, text, isCancel, cancel } from "@clack/prompts";
import { randomUUID } from "crypto";
import { findUp } from "find-up";
import path from "node:path";
import { createTerraformStateBucket, uploadToS3 } from "../utils/aws.js";
import {
  runTerraformInit,
  runTerraApply,
  getTerraformOutput,
  getTerraformOutputValue,
} from "../utils/terraform.js";
import { buildFrontend } from "../utils/buildFrontend.js";
import { burrowSquirrel } from "../assets/ascii.js";
import { cloneRepo } from "../utils/cloneRepos.js";

export async function clone(): Promise<void> {
  const burrowInfrastructure =
    "https://github.com/teamFiveCapstone/burrow-infrastructure.git";
  const burrowFrontend =
    "https://github.com/teamFiveCapstone/burrow-frontend.git";
  const oneUpDir = path.dirname(process.cwd());

  await cloneRepo(burrowInfrastructure, oneUpDir);
  await cloneRepo(burrowFrontend, oneUpDir);
}

export async function deploy(): Promise<void> {
  const terraformDir = await findUp("burrow-infrastructure/terraform", {
    type: "directory",
  });

  if (!terraformDir) {
    throw new Error("Could not find burrow-infrastructure/terraform directory");
  }

  intro(burrowSquirrel);

  const region = await text({
    message: "Enter AWS region:",
    validate(value) {
      if (!value) return "Region is required!";
      if (!/^[a-z0-9-]+$/i.test(value)) return "Invalid region format";
      return;
    },
  });

  if (isCancel(region) || typeof region !== "string") {
    cancel("Operation cancelled.");
    process.exit(0);
  }

  const uuid = randomUUID().split("-")[0];
  const bucketName = `burrow-terraform-state-${region.toLowerCase()}-${uuid}`;

  const awsVPCId = await text({
    message: "Enter VPC ID:",
    validate(value) {
      if (value.length === 0) return `Value is required!`;
      return;
    },
  });

  if (isCancel(awsVPCId) || typeof awsVPCId !== "string") {
    cancel("Operation cancelled.");
    process.exit(0);
  }

  const publicSubnet1 = await text({
    message: "Enter Public Subnet ID #1:",
    validate(value) {
      if (value.length === 0) return `Value is required!`;
      return;
    },
  });

  if (isCancel(publicSubnet1) || typeof publicSubnet1 !== "string") {
    cancel("Operation cancelled.");
    process.exit(0);
  }

  const publicSubnet2 = await text({
    message: "Enter Public Subnet ID #2:",
    validate(value) {
      if (value.length === 0) return `Value is required!`;
      return;
    },
  });

  if (isCancel(publicSubnet2) || typeof publicSubnet2 !== "string") {
    cancel("Operation cancelled.");
    process.exit(0);
  }

  const privateSubnet1 = await text({
    message: "Enter Private Subnet ID #1:",
    validate(value) {
      if (value.length === 0) return `Value is required!`;
      return;
    },
  });

  if (isCancel(privateSubnet1) || typeof privateSubnet1 !== "string") {
    cancel("Operation cancelled.");
    process.exit(0);
  }

  const privateSubnet2 = await text({
    message: "Enter Private Subnet ID #2:",
    validate(value) {
      if (value.length === 0) return `Value is required!`;
      return;
    },
  });

  if (isCancel(privateSubnet2) || typeof privateSubnet2 !== "string") {
    cancel("Operation cancelled.");
    process.exit(0);
  }

  await createTerraformStateBucket(region, bucketName);
  await runTerraformInit(terraformDir, bucketName, region);
  await runTerraApply(
    terraformDir,
    awsVPCId,
    publicSubnet1,
    publicSubnet2,
    privateSubnet1,
    privateSubnet2,
    region
  );

  const frontendDir = await findUp("burrow-frontend", {
    type: "directory",
  });

  if (!frontendDir) {
    throw new Error("Could not find burrow-frontend directory");
  }

  await buildFrontend(frontendDir);
  const distDir = await findUp("burrow-frontend/dist", {
    type: "directory",
  });

  if (!distDir) {
    throw new Error("Could not find burrow-frontend/dist directory");
  }

  const frontEndBucket = await getTerraformOutputValue(
    terraformDir,
    "front-end-bucket"
  );

  await uploadToS3({ frontEndBucket, distDir });
  await getTerraformOutput(terraformDir);

  outro(`You're all set!`);
}

async function main(): Promise<void> {
  try {
    await clone();
    await deploy();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("\n❌ Deployment failed!");
    console.error(`Error: ${errorMessage}`);
    process.exit(1);
  }
}

main();
