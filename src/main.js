import {
  intro,
  outro,
  text,
  spinner,
  isCancel,
  cancel,
  note,
} from "@clack/prompts";
import { execa } from "execa";
import { randomUUID } from "crypto";
import AWS from "aws-sdk";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findUp, findDown } from "find-up";

const other = `
                                               .####*.          .##+.                               
                                              :#*+++*#=        :#####:                              
                                             .##+++++*################.                             
                                              *#+++=++#+++++++++++*###:                             
                                              :#*-...-*++++++++++++++##+.                           
                                               .*#-.....=++++++++++++++##                           
                                               .#=........-+++++++++++++##                          
                                              .#=...........=+++++++++++*#.                         
                                             .#=.............:+++++++++++#-                         
                                          .*#*.................+++++++=..#.                         
                              ..:-=+=--:.. *=.........:###=....:+:.:+:=++#                          
                           .#####+++++*####+*#.........###-...........#-.:#:                        
                         +##*++++++++++++++###...................=#......#-                         
                       =##+++=:........=++++###=........................##                          
                     .##+++=.............+++*###*.....................-#=                           
                    .##+++..-+++++++=-...++++##*....................+#:                             
                   .##+++.=+++++++++++++++++*##=.................-==#:                              
                  .=#+++++++++++++++++++++++##*.........=-.....:#####=.                             
                  .##++++++++++++++++++++++###............#*:############                           
                  -#++++++++++++++++++++++##*=........-=+++*#############-                          
                  =#+++++++++++++++++++++##*+=........=+++++++##########*#:                         
                  -#++++++++++++++++++++##*++=.........++++++*########*+##.                         
                  :#*++++++++++++++++++##*++++.......-###################:                          
                  .##+++++++++++++++++*##+++++=...............=#######*.                            
                   .#+++++++++++++++++##+++++++=.....................#*                             
                   .-#+++++++++++++++##*++++++++++*+.................+#-                            
                    .=#*+++++++++++++##+++++++++++++*#................+#-                           
                      :##++++++++++*###++++++++++++++*#..............-+##                           
                       .####*++++*#####+++++++++++++++#-.............++##                           
                         .#############*+++++++++++++*#:............=++#*                           
                            =###########*+++++++++++-:=###:........=++=:*#+.                        
                              ..+#########+++++++++......-#+.....=++++....##.                       
                           :-=====+++++***#################################*====-.                  
                ███████████                                                         
                ░░███░░░░░███                                                        
                  ░███    ░███ █████ ████ ████████  ████████   ██████  █████ ███ █████
                  ░██████████ ░░███ ░███ ░░███░░███░░███░░███ ███░░███░░███ ░███░░███ 
                  ░███░░░░░███ ░███ ░███  ░███ ░░░  ░███ ░░░ ░███ ░███ ░███ ░███ ░███ 
                  ░███    ░███ ░███ ░███  ░███      ░███     ░███ ░███ ░░███████████  
                  ███████████  ░░████████ █████     █████    ░░██████   ░░████░████   
                  ░░░░░░░░░░░    ░░░░░░░░ ░░░░░     ░░░░░      ░░░░░░     ░░░░ ░░░░    
          `;

const burrowInfraDir = await findUp("burrow-infrastructure/terraform", {
  type: "directory",
});

async function createTerraformStateBucket(region, bucketName) {
  const s = spinner();
  s.start("Creating Terraform state bucket");

  try {
    const normalizedRegion = region.toLowerCase();
    const s3 = new AWS.S3({ region: normalizedRegion });

    const createBucketParams = {
      Bucket: bucketName,
    };

    if (normalizedRegion !== "us-east-1") {
      createBucketParams.CreateBucketConfiguration = {
        LocationConstraint: normalizedRegion,
      };
    }

    await s3.createBucket(createBucketParams).promise();

    console.log(`✅ Created Terraform state bucket: ${bucketName}`);
    s.stop(`Created state bucket: ${bucketName}`);
    return bucketName;
  } catch (error) {
    s.stop("Failed to create bucket");
    console.error(`❌ Failed to create bucket: ${error.message}`);
    throw error;
  }
}

async function runTerraformInit(terraformDir, bucketName, region) {
  const s = spinner();
  s.start("Initializing Terraform");

  try {
    await execa(
      "terraform",
      [
        "init",
        "-reconfigure",
        `-backend-config=bucket=${bucketName}`,
        "-backend-config=key=burrow/terraform-main.tfstate",
        `-backend-config=region=${region}`,
        "-backend-config=encrypt=true",
      ],
      { cwd: terraformDir }
    );
    s.stop("Terraform initialized successfully");
  } catch (error) {
    s.stop("Failed to initialize Terraform");
    console.error("Error:", error.message);
    throw error;
  }
}

async function runTerraApply(
  terraformDir,
  awsVPCId,
  publicSubnet1,
  publicSubnet2,
  privateSubnet1,
  privateSubnet2,
  region
) {
  const s = spinner();
  s.start("Applying Terraform");

  try {
    await execa(
      "terraform",
      [
        "apply",
        "-auto-approve",
        `-var=vpc_id=${awsVPCId}`,
        `-var=public_subnet_1_id=${publicSubnet1}`,
        `-var=public_subnet_2_id=${publicSubnet2}`,
        `-var=private_subnet_1_id=${privateSubnet1}`,
        `-var=private_subnet_2_id=${privateSubnet2}`,
        `-var=region=${region}`,
      ],
      {
        cwd: terraformDir,
        stdio: "inherit",
      }
    );
    s.stop("Terraform applied successfully");
  } catch (error) {
    s.stop("Failed to apply Terraform");
    console.error("Error:", error.message);
    throw error;
  }
}

async function getTerraformOutput(terraformDir) {
  const s = spinner();
  s.start("Getting Terraform outputs");

  try {
    const [adminPassword, queryToken, cloudfrontDnsRecord] = await Promise.all([
      execa("terraform", ["output", "-raw", "admin-password"], {
        cwd: terraformDir,
      }),
      execa("terraform", ["output", "-raw", "query-api-token"], {
        cwd: terraformDir,
      }),
      execa("terraform", ["output", "-raw", "cloudfront-dns-record"], {
        cwd: terraformDir,
      }),
    ]);

    s.stop("Deployed! Here's all the information you'll need:");

    const formatContent = (content, minLines = 2, width = 60) => {
      const lines = content.split("\n");
      // Pad each line to the same width
      const paddedLines = lines.map((line) => line.padEnd(width));
      // Ensure minimum number of lines
      while (paddedLines.length < minLines) {
        paddedLines.push("".padEnd(width));
      }
      return paddedLines.join("\n");
    };

    note(
      formatContent(
        `URL:      ${cloudfrontDnsRecord.stdout.trim()}\nUsername: admin\nPassword: ${adminPassword.stdout.trim()}\nUsed for: Accessing the Burrow pipeline management UI`
      ),
      "🌐🔒 Pipeline Management UI"
    );

    note(
      formatContent(
        `Token:    [Generated after deployment]\nUsed for: Authenticating requests to the management API`
      ),
      "🔑 Management API Token"
    );

    note(
      formatContent(
        `Token:    ${queryToken.stdout.trim()}\nUsed for: Authenticating requests to the query API`
      ),
      "🔑 Query API Token"
    );
  } catch (error) {
    s.stop("Failed to get Terraform outputs");
    console.error("Error:", error.message);
    throw error;
  }
}

intro(other);

const region = await text({
  message: "Enter AWS region:",
  validate(value) {
    if (!value) return "Region is required!";
    if (!/^[a-z0-9-]+$/i.test(value)) return "Invalid region format";
  },
});

if (isCancel(region)) {
  cancel("Operation cancelled.");
  process.exit(0);
}

const uuid = randomUUID().split("-")[0];
const bucketName = `burrow-terraform-state-${region.toLowerCase()}-${uuid}`;

const awsVPCId = await text({
  message: "Enter VPC ID:",
  validate(value) {
    if (value.length === 0) return `Value is required!`;
  },
});

if (isCancel(awsVPCId)) {
  cancel("Operation cancelled.");
  process.exit(0);
}

const publicSubnet1 = await text({
  message: "Enter Public Subnet ID #1:",
  validate(value) {
    if (value.length === 0) return `Value is required!`;
  },
});

if (isCancel(publicSubnet1)) {
  cancel("Operation cancelled.");
  process.exit(0);
}

const publicSubnet2 = await text({
  message: "Enter Public Subnet ID #2:",
  validate(value) {
    if (value.length === 0) return `Value is required!`;
  },
});

if (isCancel(publicSubnet2)) {
  cancel("Operation cancelled.");
  process.exit(0);
}

const privateSubnet1 = await text({
  message: "Enter Private Subnet ID #1:",
  validate(value) {
    if (value.length === 0) return `Value is required!`;
  },
});

if (isCancel(privateSubnet1)) {
  cancel("Operation cancelled.");
  process.exit(0);
}

const privateSubnet2 = await text({
  message: "Enter Private Subnet ID #2:",
  validate(value) {
    if (value.length === 0) return `Value is required!`;
  },
});

if (isCancel(privateSubnet2)) {
  cancel("Operation cancelled.");
  process.exit(0);
}

await createTerraformStateBucket(region, bucketName);
await runTerraformInit(burrowInfraDir, bucketName, region);
await runTerraApply(
  burrowInfraDir,
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

async function buildFrontend(frontendDir) {
  const s = spinner();
  s.start("Building UI");

  try {
    await execa("npm", ["run", "build"], { cwd: frontendDir });
    s.stop("Terraform initialized successfully");
  } catch (error) {
    s.stop("Failed to build the frontend");
    console.error("Error:", error.message);
    throw error;
  }
}

await getTerraformOutput(burrowInfraDir);
await buildFrontend(frontendDir);
const distDir = await findUp("burrow-frontend/dist", {
  type: "directory",
});

let frontEndBucket = await execa(
  "terraform",
  ["output", "-raw", "front-end-bucket"],
  {
    cwd: burrowInfraDir,
  }
);

frontEndBucket = frontEndBucket.stdout.trim();

async function getAllFiles(dirPath, baseDir = dirPath) {
  const files = [];
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
        key: relativePath.replace(/\\/g, "/"), // Ensure forward slashes for S3 keys
      });
    }
  }

  return files;
}

const uploadFile = async (s3, bucket, filePath, key) => {
  const fileContent = await readFile(filePath);

  try {
    const response = await s3
      .putObject({
        Bucket: bucket,
        Key: key,
        Body: fileContent,
      })
      .promise();

    // console.log(`Uploaded: ${key}`);
    return response;
  } catch (error) {
    console.error(`Error uploading ${key}:`, error.message);
    throw error;
  }
};

const uploadToS3 = async ({ frontEndBucket, distDir }) => {
  const s3 = new AWS.S3();

  try {
    const files = await getAllFiles(distDir);

    for (const file of files) {
      await uploadFile(s3, frontEndBucket, file.filePath, file.key);
    }
  } catch (error) {
    console.error("Error during upload:", error);
    throw error;
  }
};

uploadToS3({ frontEndBucket, distDir });

outro(`You're all set!`);
