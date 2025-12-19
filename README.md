# Burrow CLI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

This repository contains the automated deployment process for Burrow, an open-source RAG-as-a-service platform that provides teams with production-grade document processing and advanced retrieval capabilities.

To learn more about Burrow, visit our [website](https://burrow-io.github.io/).

## Infrastructure Overview

Burrow deploys the following key components in your AWS account:

![Diagram](https://i.imgur.com/4INWuMB.png)

**Core Components:**
- **CloudFront**: Handles all HTTPS traffic and routes requests to S3 or the load balancer
- **S3 Buckets**:
  - Static frontend assets (React dashboard)
  - Document storage for uploaded files
- **Application Load Balancer**: Routes API traffic to backend services
- **ECS Fargate Services**:
  - Management API (Express.js) for document lifecycle and authentication
  - Query API (FastAPI) for semantic search and RAG processing
  - Ingestion pipeline (Python) for document parsing and embedding
- **DynamoDB**: Stores document metadata and user information
- **RDS Aurora Serverless**: PostgreSQL database with pgvector for vector embeddings
- **EventBridge**: Triggers event-driven document processing workflows
- **VPC Networking**: Uses your existing VPC and subnet configuration

## Deployment and Management

Burrow provides a Command-Line Interface (CLI) that simplifies the deployment and management of its AWS infrastructure. Powered by Terraform, it uses infrastructure-as-code to ensure efficient and straightforward pipeline deployment.

The CLI handles everything automatically—from provisioning cloud resources to building and deploying the frontend—so you can focus on using Burrow rather than configuring it.

## Prerequisites

To get started with Burrow, ensure the following are set up:

- **An active AWS account**
- **AWS CLI installed and configured**
  Run `aws configure` and provide:
  - AWS Access Key ID
  - AWS Secret Access Key
  - Default region name
- **An existing VPC with subnets**:
  - 2 public subnets
  - 2 private subnets
- **Node.js and npm** installed on your system

## Installation

Clone the burrow-cli repository:

```bash
git clone https://github.com/burrow-io/burrow-cli.git
cd burrow-cli
```

Install the required dependencies:

```bash
npm install
```

## Deploying Burrow

To deploy Burrow infrastructure using the CLI, execute the following command:

```bash
npm run deploy
```

This command will guide you through the deployment process with interactive prompts:

### Configuration Prompts

You will be asked to provide the following information, one prompt at a time:

1. **AWS Region** - The region where you want to deploy Burrow (e.g., `us-east-1`)
2. **VPC ID** - Your existing VPC identifier (e.g., `vpc-0abcd1234efgh5678`)
3. **First Public Subnet ID** - Your existing first public subnet
4. **Second Public Subnet ID** - Your existing second public subnet
5. **First Private Subnet ID** - Your existing first private subnet
6. **Second Private Subnet ID** - Your existing second private subnet

### Automated Deployment

Once you've provided the configuration details, the CLI will:

- Initialize Terraform with your AWS credentials
- Provision all infrastructure components
- Build the React frontend application
- Upload static assets to S3
- Configure CloudFront distribution
- Set up database schemas and initial data
- Deploy containerized services to ECS

Terraform will display progress as resources are created.

### Deployment Outputs

Once deployment completes, you'll receive the following information:

- **CloudFront DNS Name**: The URL to access your Burrow frontend (e.g., `https://d1234abcd5678.cloudfront.net`)
- **Query API Key**: Authentication key for making requests to the Query API
- **Admin Password**: Credentials for logging into the frontend dashboard

Save these outputs—you'll need them to access and use Burrow.

## Accessing the User Interface

Once deployment is complete, navigate to the CloudFront DNS URL provided in the deployment outputs.

### Logging In

Use the admin credentials from the deployment output to log into the dashboard:

- **Username**: `admin`
- **Password**: [provided during deployment]

### Using the Dashboard

From the UI, you can:

- **Upload documents** for processing through a simple drag-and-drop interface
- **View document metadata** including name, size, upload date, and processing status
- **Track processing progress** as documents move through different stages
- **Monitor status updates** delivered via server-sent events from the Management API

The event-driven architecture means you simply upload documents and Burrow handles everything else behind the scenes—no manual intervention required.

## UI Overview

The Burrow dashboard provides comprehensive observability into your document processing pipeline:

### Document Management

- **Document Library**: Browse all uploaded documents with pagination and filtering
- **Metadata Display**: View document names, file sizes, and upload timestamps
- **Processing Status**: Track documents as they transition through stages:
  - **Pending**: Queued for processing
  - **Running**: Currently being processed by an ECS task
  - **Finished**: Successfully embedded and stored
  - **Failed**: Processing encountered an error

### Event-Driven Processing

Behind the scenes, Burrow's architecture automatically:

1. Detects new document uploads via EventBridge
2. Spins up ECS Fargate tasks for processing
3. Parses documents with layout-aware extraction
4. Chunks content using hybrid strategies
5. Generates embeddings via AWS Bedrock
6. Stores vectors in PostgreSQL with pgvector
7. Updates status via server-sent events to the UI

This serverless approach keeps costs low while maintaining responsiveness and scalability.

## Querying Documents

Once documents are processed, you can query them using the Query API.

### Making API Requests

Use the Query API key provided during deployment to authenticate your requests. All requests go through your CloudFront distribution:

```bash
curl -X POST https://your-cloudfront-dns/query-service \
  -H 'x-api-token: YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "What are the main topics discussed?",
    "top_k": 5
  }'
```

### Advanced RAG Features

The Query API supports multiple retrieval techniques:

- **Keyword Search**: Traditional term-based matching
- **Semantic Search**: Vector similarity using embeddings
- **Hybrid Search**: Combines keyword and semantic approaches
- **Reranking**: Re-orders results for improved relevance
- **Metadata Filtering**: Filter by document properties (date, type, etc.)

These features enable you to retrieve the most relevant document chunks for feeding into your LLM-powered RAG applications.

## Destroying Burrow Infrastructure

To tear down the Burrow infrastructure, run the following command:

```bash
npm run destroy
```

This command will perform the following steps:

### Resource Destruction

Deletes all Burrow-related resources in your AWS account, including:

- CloudFront distribution
- S3 buckets (frontend assets and document storage)
- Application Load Balancer
- ECS clusters and services
- DynamoDB tables
- RDS Aurora database
- EventBridge rules and targets
- Security groups and IAM roles

### Preserved Resources

The following resources will **not** be deleted:

- Your VPC
- Public and private subnets you provided

This allows you to safely destroy Burrow without affecting other infrastructure in your AWS account.

Terraform will display progress as resources are destroyed.

### Confirmation

Once complete, you will receive a confirmation message that all Burrow resources have been removed.

⚠️ **Important:**
Destroying the infrastructure will permanently delete all associated resources and data, including uploaded documents and vector embeddings. This action is irreversible, so proceed with caution.

---

**Questions or issues?** Visit our [case study](https://burrow-io.github.io/burrow-case-study/) for detailed documentation or open an issue in this repository.
