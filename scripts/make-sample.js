import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { encodePng } from '../src/png.js'
import { paintLot } from '../src/sampleLot.js'

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../web/sample')
await mkdir(dir, { recursive: true })
await writeFile(path.join(dir, 'lot.png'), encodePng(paintLot()))
