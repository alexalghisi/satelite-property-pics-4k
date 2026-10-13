import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import test from 'node:test'

test('the workspace page and sample image are served', async () => {
    const child = spawn(process.execPath, ['scripts/serve.js'], {
        env: { ...process.env, PORT: '0' },
        stdio: ['ignore', 'pipe', 'pipe']
    })
    const log = { text: '' }
    child.stdout.on('data', (chunk) => {
        log.text += chunk
    })
    try {
        await waitForPort(child, log)
        const port = Number(log.text.match(/listening (\d+)/)[1])
        const root = await fetch(`http://127.0.0.1:${port}/`, { redirect: 'manual' })
        assert.equal(root.status, 302)
        const page = await fetch(`http://127.0.0.1:${port}/web/`)
        const html = await page.text()
        assert.equal(page.status, 200)
        assert.match(html, /Parcel Takeoff/)
        assert.match(html, /id="schedule"/)
        assert.match(html, /id="load-sample"/)
        const image = await fetch(`http://127.0.0.1:${port}/web/sample/lot.png`)
        const bytes = new Uint8Array(await image.arrayBuffer())
        assert.equal(image.status, 200)
        assert.equal(bytes[0], 137)
        assert.equal(bytes[1], 80)
        const script = await fetch(`http://127.0.0.1:${port}/web/main.js`)
        const source = await script.text()
        assert.equal(script.headers.get('content-type'), 'text/javascript; charset=utf-8')
        assert.match(source, /sample\/lot\.png/)
        const hidden = await fetch(`http://127.0.0.1:${port}/%2e%2e/package.json`)
        assert.equal(hidden.status, 403)
    } finally {
        child.kill()
        await once(child, 'exit')
    }
})

async function waitForPort(child, log) {
    const deadline = Date.now() + 5000
    while (Date.now() < deadline) {
        if (/listening \d+/.test(log.text)) {
            return
        }
        if (child.exitCode != null) {
            throw new Error('server exited before listening')
        }
        await new Promise((resolve) => {
            setTimeout(resolve, 20)
        })
    }
    throw new Error('server did not listen')
}
