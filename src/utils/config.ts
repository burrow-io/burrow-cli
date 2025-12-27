import { readFile, writeFile } from 'node:fs/promises';

export interface BurrowConfig {
  bucketName: string;
  region: string;
  awsVPCId: string;
  publicSubnet1: string;
  publicSubnet2: string;
  privateSubnet1: string;
  privateSubnet2: string;
}

export async function saveConfig(config: BurrowConfig): Promise<void> {
  await writeFile('.burrow-config.json', JSON.stringify(config));
}

export async function loadConfig(): Promise<BurrowConfig | null> {
  try {
    const content = await readFile('.burrow-config.json', 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}
