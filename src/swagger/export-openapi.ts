import 'reflect-metadata';
import 'dotenv/config';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import * as YAML from 'yaml';
import { createOpenApiDocument } from './openapi';

async function main(): Promise<void> {
  const document = await createOpenApiDocument();
  const target = resolve(process.cwd(), 'openapi.yaml');
  writeFileSync(target, YAML.stringify(document), 'utf8');
  console.log(`openapi.yaml ditulis ke ${target}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
