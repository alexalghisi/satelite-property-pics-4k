import { crc32, deflateSync } from 'node:zlib'

export function encodePng(image) {
    const { width, height, data } = image
    const stride = width * 4
    const raw = Buffer.alloc((stride + 1) * height)
    for (let y = 0; y < height; y += 1) {
        const row = y * (stride + 1)
        raw[row] = 0
        for (let index = 0; index < stride; index += 1) {
            raw[row + 1 + index] = data[y * stride + index]
        }
    }
    const header = Buffer.alloc(13)
    header.writeUInt32BE(width, 0)
    header.writeUInt32BE(height, 4)
    header[8] = 8
    header[9] = 6
    header[10] = 0
    header[11] = 0
    header[12] = 0
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    return Buffer.concat([
        signature,
        chunk('IHDR', header),
        chunk('IDAT', deflateSync(raw)),
        chunk('IEND', Buffer.alloc(0))
    ])
}

function chunk(type, data) {
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length, 0)
    const body = Buffer.concat([Buffer.from(type), data])
    const checksum = Buffer.alloc(4)
    checksum.writeUInt32BE(crc32(body) >>> 0, 0)
    return Buffer.concat([length, body, checksum])
}
