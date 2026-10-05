#!/usr/bin/env node
// Generate the filled Lucide set from the upstream outline icons.
//
//   node tools/fill-icons/index.mjs [--src DIR] [--out DIR] [--only substr]
//                                   [--names a,b,c]
//
// `--src` must point at the pristine outline icons in `outline/`; running it
// over already-filled output would solidify the silhouettes a second time.
//
// Runs across all CPU cores; each worker owns its own Clipper instance.
//
// Icons approved in the review page (`pnpm fill:review`) are never
// regenerated: their approved drawing is kept in `approved/<set>/` and copied
// back over the output instead. Unapprove an icon there to change it again.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import { cpus } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

const APPROVED_DIR = join(dirname(fileURLToPath(import.meta.url)), 'approved');

function parseArgs(argv) {
  const args = { src: './outline/icons', out: './icons', only: null, names: null, jobs: 0 };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--src') args.src = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--only') args.only = argv[++i];
    else if (a === '--names') args.names = new Set(argv[++i].split(','));
    else if (a === '--jobs') args.jobs = Number(argv[++i]);
  }
  return args;
}

// `fill-rule` is inherited, so it belongs on the root: five icons (bus,
// columns-3-cog, eclipse, package-2, table-2) render differently under the
// default non-zero rule, and keeping it off the path avoids a hyphenated
// attribute travelling into the framework packages' icon data.
const SVG_TEMPLATE = (d) => `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="currentColor"
  fill-rule="evenodd"
>
  <path d="${d}" />
</svg>
`;

async function runWorker(files, { src, out }) {
  const { initGeom, area } = await import('./lib/geom.mjs');
  const { regionToPathData } = await import('./lib/fit.mjs');
  const { useLabOverrides } = await import('./lib/overrides.mjs');
  const { makeRenderer } = await import('./lib/render.mjs');
  useLabOverrides(basename(src) === 'lab');
  const render = makeRenderer(src);
  const { optimize } = await import('svgo');
  await initGeom();

  const results = [];
  for (const file of files) {
    const name = basename(file, '.svg');
    try {
      const region = render(name);
      const d = regionToPathData(region);
      if (!d) throw new Error('empty result');
      // SVGO's relative-command packing takes about a third off the path data
      // at a deviation far below one device pixel. Only the `d` is kept — the
      // file itself stays in Lucide's own layout so `pnpm lint:icons` passes.
      const optimized = optimize(SVG_TEMPLATE(d), {
        floatPrecision: 3,
        plugins: [
          {
            name: 'preset-default',
            params: { overrides: { removeViewBox: false, convertPathData: { floatPrecision: 3 } } },
          },
        ],
      }).data;
      const packed = optimized.match(/<path d="([^"]*)"/)?.[1] ?? d;
      const output = SVG_TEMPLATE(packed);
      await writeFile(join(out, file), output, 'utf8');
      results.push({ name, ok: true, bytes: packed.length, area: area(region) });
    } catch (error) {
      results.push({ name, ok: false, error: String(error?.message ?? error) });
    }
  }
  return results;
}

if (!isMainThread) {
  runWorker(workerData.files, workerData.opts).then((r) => parentPort.postMessage(r));
} else {
  const args = parseArgs(process.argv.slice(2));
  const src = resolve(process.cwd(), args.src);
  const out = resolve(process.cwd(), args.out);
  if (!existsSync(out)) mkdirSync(out, { recursive: true });

  const all = (await readdir(src)).filter((f) => f.endsWith('.svg'));
  let matched = args.only ? all.filter((f) => f.includes(args.only)) : all;
  if (args.names) matched = matched.filter((f) => args.names.has(basename(f, '.svg')));
  if (!matched.length) {
    console.error(`No icons matched ${args.only}`);
    process.exit(1);
  }

  // Approved icons are restored from their snapshot, never regenerated.
  const approvedDir = join(APPROVED_DIR, basename(src));
  const approved = new Set(existsSync(approvedDir) ? await readdir(approvedDir) : []);
  const kept = matched.filter((f) => approved.has(f));
  for (const f of kept) {
    const snapshot = await readFile(join(approvedDir, f), 'utf8');
    const target = join(out, f);
    if (!existsSync(target) || (await readFile(target, 'utf8')) !== snapshot) {
      await writeFile(target, snapshot, 'utf8');
    }
  }
  if (kept.length) console.log(`Kept ${kept.length} approved icon(s) unchanged`);
  const files = matched.filter((f) => !approved.has(f));
  if (!files.length) process.exit(0);

  const jobs = Math.max(1, Math.min(args.jobs || cpus().length, files.length));
  const shards = Array.from({ length: jobs }, () => []);
  files.forEach((f, i) => shards[i % jobs].push(f));

  const started = Date.now();
  const settled = await Promise.all(
    shards.map(
      (shard) =>
        new Promise((res, rej) => {
          const w = new Worker(fileURLToPath(import.meta.url), {
            workerData: { files: shard, opts: { src, out } },
          });
          w.on('message', res);
          w.on('error', rej);
        }),
    ),
  );

  const results = settled.flat().sort((a, b) => a.name.localeCompare(b.name));
  const failed = results.filter((r) => !r.ok);
  const okResults = results.filter((r) => r.ok);
  const totalBytes = okResults.reduce((s, r) => s + r.bytes, 0);

  console.log(
    `Filled ${okResults.length}/${files.length} icons in ${((Date.now() - started) / 1000).toFixed(1)}s ` +
      `(avg path ${Math.round(totalBytes / Math.max(1, okResults.length))} B)`,
  );
  if (failed.length) {
    console.error(`\n${failed.length} failed:`);
    for (const f of failed) console.error(`  ${f.name}: ${f.error}`);
    process.exit(1);
  }
}
