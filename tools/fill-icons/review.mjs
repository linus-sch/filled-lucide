#!/usr/bin/env node
// Review page for the filled set: click an icon to approve or unapprove it.
//
//   node tools/fill-icons/review.mjs [--port 4321]
//
// Approving copies the icon's current drawing to `approved/<set>/NAME.svg`.
// From then on `index.mjs` restores that snapshot instead of regenerating the
// icon, so it stays exactly as approved until it is unapproved here.
import { createServer } from 'node:http';
import { copyFile, mkdir, readdir, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const APPROVED_DIR = join(here, 'approved');
const SETS = {
  icons: { title: 'Icons', filled: join(root, 'icons'), outline: join(root, 'outline/icons') },
  lab: { title: 'Lab', filled: join(root, 'lab'), outline: join(root, 'outline/lab') },
};

const argv = process.argv.slice(2);
const portArg = argv.indexOf('--port');
const port = Number(portArg === -1 ? 4321 : argv[portArg + 1]);

const NAME = /^[a-z0-9-]+$/;
const svgNames = async (dir) =>
  existsSync(dir)
    ? (await readdir(dir))
        .filter((f) => f.endsWith('.svg'))
        .map((f) => f.slice(0, -4))
        .sort()
    : [];

async function state() {
  const sets = {};
  for (const [key, set] of Object.entries(SETS)) {
    sets[key] = {
      title: set.title,
      names: await svgNames(set.filled),
      approved: await svgNames(join(APPROVED_DIR, key)),
    };
  }
  return sets;
}

function paths(key, name) {
  const set = SETS[key];
  if (!set || !NAME.test(name)) throw new Error('unknown icon');
  const source = join(set.filled, `${name}.svg`);
  if (!existsSync(source)) throw new Error(`${key}/${name}.svg does not exist`);
  return { source, snapshot: join(APPROVED_DIR, key, `${name}.svg`) };
}

/** Returns whether anything changed. An existing snapshot is never overwritten. */
async function setApproved(key, name, approved) {
  const { source, snapshot } = paths(key, name);
  if (approved === existsSync(snapshot)) return false;
  if (approved) {
    await mkdir(dirname(snapshot), { recursive: true });
    await copyFile(source, snapshot);
  } else {
    await rm(snapshot);
  }
  return true;
}

const send = (res, status, body, type = 'application/json') => {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/') {
      return send(res, 200, await readFile(join(here, 'review.html')), 'text/html; charset=utf-8');
    }
    if (req.method === 'GET' && url.pathname === '/api/state') {
      return send(res, 200, await state());
    }
    if (req.method === 'POST' && url.pathname === '/api/approve') {
      let body = '';
      for await (const chunk of req) body += chunk;
      // { items: [{ set, name }], approved } — one icon or a bulk selection.
      const { items, approved } = JSON.parse(body);
      for (const { set, name } of items) paths(set, name); // validate all before writing any
      for (const { set, name } of items) {
        if (await setApproved(set, name, Boolean(approved))) {
          console.log(`${approved ? 'approved  ' : 'unapproved'} ${set}/${name}`);
        }
      }
      return send(res, 200, { ok: true });
    }
    // /svg/<set>/<filled|outline>/<name>.svg
    const m = url.pathname.match(/^\/svg\/(icons|lab)\/(filled|outline)\/([a-z0-9-]+)\.svg$/);
    if (req.method === 'GET' && m) {
      const file = join(SETS[m[1]][m[2]], `${m[3]}.svg`);
      if (existsSync(file)) return send(res, 200, await readFile(file), 'image/svg+xml');
    }
    send(res, 404, { error: 'not found' });
  } catch (error) {
    send(res, 400, { error: String(error?.message ?? error) });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Review filled icons at http://localhost:${port}`);
});
