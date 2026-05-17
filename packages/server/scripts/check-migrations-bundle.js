#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = fileURLToPath(new URL('.', import.meta.url))
const serverDir = join(scriptDir, '..')
const canonicalDir = join(serverDir, 'migrations')
const legacySrcDir = join(serverDir, 'src', 'db', 'migrations')
const bundlePath = join(serverDir, 'src', 'db', 'migrations-bundle.ts')

function listSql(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((name) => name.endsWith('.sql'))
    .sort()
}

const canonicalFiles = listSql(canonicalDir)
const legacySrcFiles = listSql(legacySrcDir)
const bundleSource = readFileSync(bundlePath, 'utf8')
const bundledFiles = Array
  .from(bundleSource.matchAll(/filename:\s*"([^"]+\.sql)"/g))
  .map((match) => match[1])

const errors = []

if (legacySrcFiles.length > 0) {
  errors.push(
    `Non-canonical SQL migrations found under src/db/migrations: ${legacySrcFiles.join(', ')}. ` +
      'Move them to packages/server/migrations and update migrations-bundle.ts.'
  )
}

const canonicalSet = new Set(canonicalFiles)
const bundledSet = new Set(bundledFiles)
const missingFromBundle = canonicalFiles.filter((file) => !bundledSet.has(file))
const extraInBundle = bundledFiles.filter((file) => !canonicalSet.has(file))

if (missingFromBundle.length > 0) {
  errors.push(`Migrations missing from runtime bundle: ${missingFromBundle.join(', ')}`)
}

if (extraInBundle.length > 0) {
  errors.push(`Runtime bundle references files missing from canonical migrations: ${extraInBundle.join(', ')}`)
}

if (canonicalFiles.length !== bundledFiles.length) {
  errors.push(`Migration count mismatch: canonical=${canonicalFiles.length}, bundled=${bundledFiles.length}`)
}

for (let i = 0; i < Math.min(canonicalFiles.length, bundledFiles.length); i++) {
  if (canonicalFiles[i] !== bundledFiles[i]) {
    errors.push(`Migration order mismatch at index ${i}: canonical=${canonicalFiles[i]}, bundled=${bundledFiles[i]}`)
    break
  }
}

if (errors.length > 0) {
  console.error('Migration bundle drift detected:')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log(`Migration bundle is in sync (${canonicalFiles.length} migrations).`)
