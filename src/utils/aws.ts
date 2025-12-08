import { spinner } from "@clack/prompts";
import AWS, { type S3 } from "aws-sdk";
import { readFile } from "node:fs/promises";
import { getAllFiles, getContentType } from "./buildFrontend";

interface CreateBucket {
  Bucket: string;
  CreateBucketConfiguration?: {
    LocationConstraint: string;
  };
}

export async function createTerraformStateBucket(
  region: string,
  bucketName: string
): Promise<string> {
  const s = spinner();
  s.start("Creating Terraform state bucket");

  try {
    const normalizedRegion = region.toLowerCase();
    const s3 = new AWS.S3({ region: normalizedRegion });

    const createBucketParams: CreateBucket = {
      Bucket: bucketName,
    };

    if (normalizedRegion !== "us-east-1") {
      createBucketParams.CreateBucketConfiguration = {
        LocationConstraint: normalizedRegion,
      };
    }

    await s3
      .createBucket(createBucketParams as S3.CreateBucketRequest)
      .promise();

    console.log(`✅ Created Terraform state bucket: ${bucketName}`);
    s.stop(`Created state bucket: ${bucketName}`);
    return bucketName;
  } catch (error) {
    s.stop("Failed to create bucket");
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to create bucket: ${errorMessage}`);
    throw error;
  }
}

const uploadFile = async (
  s3: S3,
  bucket: string,
  filePath: string,
  key: string
) => {
  const fileContent = await readFile(filePath);
  const contentType = getContentType(filePath);

  try {
    const response = await s3
      .putObject({
        Bucket: bucket,
        Key: key,
        Body: fileContent,
        ContentType: contentType,
      })
      .promise();

    return response;
  } catch (error) {
    console.error(
      `Error uploading ${key}:`,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
};

export const uploadToS3 = async ({
  frontEndBucket,
  distDir,
}: {
  frontEndBucket: string;
  distDir: string;
}) => {
  const s = spinner();
  s.start("Uploading frontend to S3");
  const s3 = new AWS.S3();

  try {
    const files = await getAllFiles(distDir);

    for (const file of files) {
      await uploadFile(s3, frontEndBucket, file.filePath, file.key);
    }
    s.stop("Frontend uploaded successfully!");
  } catch (error) {
    s.stop("Failed to upload frontend.");
    console.error("Error during upload:", error);
    throw error;
  }
};
