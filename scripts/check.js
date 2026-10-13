import { readdirSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const files = []
walk(root, files)
let failed = 0
for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' })
    if (result.status !== 0) {
        failed += 1
    }
}
if (failed > 0) {
    process.exit(1)
}

function walk(dir, out) {
    for (const name of readdirSync(dir)) {
        if (name === '.git' || name === 'node_modules') {
            continue
        }
        const full = path.join(dir, name)
        if (statSync(full).isDirectory()) {
            walk(full, out)
            continue
        }
        if (name.endsWith('.js')) {
            out.push(full)
        }
    }
}
