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
import path from "node:path";
import { fileURLToPath } from "node:url";
// import { pathExists } from "path-exists";
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

// if (!burrowInfraDir) {
//   console.error("Error: burrow-infrastructure/terraform directory not found");
//   process.exit(1);
// }

async function verifyingAWSUser() {
  try {
    const { stdout } = await execa("aws", ["sts", "get-caller-identity"]);
    console.log(stdout);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// // verifyingAWSUser();

async function createTerraformStateBucket(region, bucketName) {
  const s = spinner();
  s.start("Creating Terraform state bucket");

  try {
    const normalizedRegion = region.toLowerCase();
    const s3 = new AWS.S3({ region: normalizedRegion });

    // Create bucket
    // Note: LocationConstraint not needed for us-east-1
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
        stdio: "inherit", // Show terraform output
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
    // Fetch all 2 outputs in parallel
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
        `URL: ${cloudfrontDnsRecord.stdout.trim()}\nUsed for: Accessing the Burrow pipeline management UI`
      ),
      "🌐 Pipeline Management UI"
    );

    note(
      formatContent(
        `Username: admin\nPassword: ${adminPassword.stdout.trim()}`
      ),
      "🔒 UI Login Credentials"
    );

    note(
      formatContent(
        `Token: [Generated after deployment]\nUsed for: Authenticating requests to the management API`
      ),
      "🔑 Management API Token"
    );

    note(
      formatContent(
        `Token: ${queryToken.stdout.trim()}\nUsed for: Authenticating requests to the query API`
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

// Get region from user
const region = await text({
  message: "Enter AWS region:",
  validate(value) {
    if (!value) return "Region is required!";
    // Optional: validate region format
    if (!/^[a-z0-9-]+$/i.test(value)) return "Invalid region format";
  },
});

if (isCancel(region)) {
  cancel("Operation cancelled.");
  process.exit(0);
}

// Generate unique bucket name
const uuid = randomUUID().split("-")[0]; // First 8 chars for shorter name
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

await getTerraformOutput(burrowInfraDir);

outro(`You're all set!`);
