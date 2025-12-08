# Burrow CLI

A CLI tool for building AWS infrastructure.

## Dependencies

This project uses:

- **@clack/prompts** - Beautiful CLI prompts
- **find-up** - Find files by walking up parent directories

## Documentation

For Clack prompts documentation, see:

- [Clack Prompts Documentation](https://github.com/bombshell-dev/clack/tree/main/packages/prompts#readme)

## Installation

```bash
npm ci
```

## Usage

### Deploy Infrastructure

```bash
npm run reploy
```

Deploys AWS infrastructure using Terraform. Prompts for AWS region, VPC ID, and subnet IDs, then initializes Terraform, applies the configuration, and uploads the frontend build to S3.

### Destroy Infrastructure

```bashgit
npm run destroy
```

Destroys all AWS infrastructure managed by Terraform. Runs `terraform destroy` to remove all resources.
