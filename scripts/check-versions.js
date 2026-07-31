import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
const serverJson = JSON.parse(readFileSync(new URL('../server.json', import.meta.url)));

const versions = {
  'package.json': pkg.version,
  'server.json': serverJson.version,
  'server.json packages[0]': serverJson.packages?.[0]?.version,
};

const unique = new Set(Object.values(versions));

if (unique.size > 1) {
  console.error('Version mismatch detected:');
  for (const [source, version] of Object.entries(versions)) {
    console.error(`  ${source}: ${version}`);
  }
  process.exit(1);
}

console.log(`All versions match: ${pkg.version}`);
