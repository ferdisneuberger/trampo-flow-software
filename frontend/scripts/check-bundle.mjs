import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const assetsDirectory = join(process.cwd(), 'dist', 'assets');
const limitBytes = 250 * 1024;

let rawTotal = 0;
let gzipTotal = 0;
const files = readdirSync(assetsDirectory).filter((file) =>
  file.endsWith('.js'),
);

for (const file of files) {
  const path = join(assetsDirectory, file);
  const content = readFileSync(path);

  rawTotal += statSync(path).size;
  gzipTotal += gzipSync(content).length;
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

console.log(
  `JS: ${files.length} chunk(s), ${kb(rawTotal)} raw, ${kb(gzipTotal)} gzip`,
);

if (gzipTotal > limitBytes) {
  console.error(
    `Bundle acima do orçamento: ${kb(gzipTotal)} > ${kb(limitBytes)} (gzip).`,
  );
  process.exit(1);
}
