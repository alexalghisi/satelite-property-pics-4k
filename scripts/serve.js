import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
}

const server = createServer(async (request, response) => {
    try {
        const url = new URL(request.url, 'http://127.0.0.1')
        if (url.pathname === '/favicon.ico') {
            response.writeHead(204)
            response.end()
            return
        }
        if (url.pathname === '/') {
            response.writeHead(302, { Location: '/web/' })
            response.end()
            return
        }
        const pathname = url.pathname === '/web' || url.pathname === '/web/'
            ? '/web/index.html'
            : decodeURIComponent(url.pathname)
        const target = path.normalize(path.join(root, pathname))
        const relative = path.relative(root, target)
        const allowed = relative.startsWith(`web${path.sep}`) || relative.startsWith(`src${path.sep}`)
        if (!allowed || relative.startsWith('..') || path.isAbsolute(relative)) {
            response.writeHead(403)
            response.end()
            return
        }
        const file = await readFile(target)
        const type = types[path.extname(target)] || 'application/octet-stream'
        response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' })
        response.end(file)
    } catch {
        response.writeHead(404)
        response.end()
    }
})

const port = Number(process.env.PORT ?? 4173)
server.listen(port, '127.0.0.1', () => {
    const address = server.address()
    process.stdout.write(`listening ${address.port}\n`)
})
