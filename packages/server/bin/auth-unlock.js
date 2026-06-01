#!/usr/bin/env node

import { execFileSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { dirname, join, resolve } from 'path';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const prefixes = [
  'ratelimit:login:',
  'security:bf:',
  'security:locked:',
];

function log(message, color = '') {
  console.log(`${color}${message}${colors.reset}`);
}

function findProjectDir() {
  let dir = process.cwd();

  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, 'wrangler.toml'))) {
      return dir;
    }

    const serverDir = join(dir, 'packages', 'server');
    if (existsSync(join(serverDir, 'wrangler.toml'))) {
      return serverDir;
    }

    dir = dirname(dir);
  }

  return null;
}

function getKvDatabasePaths(projectDir) {
  const kvDir = join(projectDir, '.wrangler', 'state', 'v3', 'kv', 'miniflare-KVNamespaceObject');
  if (!existsSync(kvDir)) return [];

  return readdirSync(kvDir)
    .filter((file) => file.endsWith('.sqlite') && file !== 'metadata.sqlite')
    .map((file) => join(kvDir, file));
}

function sqlite(dbPath, sql) {
  return execFileSync('sqlite3', [dbPath, sql], { encoding: 'utf-8' }).trim();
}

function sqlString(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function main() {
  log('\nWorker Blog auth unlock', colors.cyan + colors.bold);
  log('=======================\n', colors.cyan);

  const projectDir = findProjectDir();
  if (!projectDir) {
    log('Error: could not find packages/server/wrangler.toml or wrangler.toml.', colors.red);
    process.exit(1);
  }

  const kvDatabases = getKvDatabasePaths(projectDir);
  if (kvDatabases.length === 0) {
    log(`No local KV database found under ${join(projectDir, '.wrangler/state/v3/kv')}.`, colors.yellow);
    return;
  }

  const whereClause = prefixes
    .map((prefix) => `key LIKE ${sqlString(`${prefix}%`)}`)
    .join(' OR ');

  let totalDeleted = 0;

  for (const dbPath of kvDatabases) {
    const absoluteDbPath = resolve(dbPath);
    const matchingKeys = sqlite(
      absoluteDbPath,
      `SELECT key FROM _mf_entries WHERE ${whereClause} ORDER BY key;`
    ).split('\n').filter(Boolean);

    if (matchingKeys.length === 0) {
      log(`No auth lockout keys found in ${absoluteDbPath}.`, colors.yellow);
      continue;
    }

    sqlite(absoluteDbPath, `DELETE FROM _mf_entries WHERE ${whereClause};`);
    totalDeleted += matchingKeys.length;

    log(`Cleared ${matchingKeys.length} key(s) from ${absoluteDbPath}:`, colors.green);
    for (const key of matchingKeys) {
      log(`  - ${key}`);
    }
  }

  log(`\nDone. Cleared ${totalDeleted} local auth lockout/rate-limit key(s).`, colors.green + colors.bold);
}

try {
  main();
} catch (error) {
  if (error?.code === 'ENOENT') {
    log('Error: sqlite3 is required to clear local Miniflare KV state.', colors.red);
  } else {
    log(`Error: ${error instanceof Error ? error.message : String(error)}`, colors.red);
  }
  process.exit(1);
}
