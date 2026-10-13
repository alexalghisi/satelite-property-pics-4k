export const LOT_WIDTH = 640
export const LOT_HEIGHT = 400
export const ROOF = [141, 106, 74]
export const DRIVEWAY = [154, 160, 166]
export const FENCE = [58, 58, 58]
export const TREE = [20, 90, 40]
export const GRASS = [110, 161, 90]

export function paintLot() {
    const data = new Uint8ClampedArray(LOT_WIDTH * LOT_HEIGHT * 4)
    fillRect(data, 0, 0, LOT_WIDTH, LOT_HEIGHT, GRASS)
    fillRect(data, 180, 80, 160, 120, ROOF)
    fillRect(data, 340, 150, 180, 80, DRIVEWAY)
    fillRect(data, 40, 299, 561, 3, FENCE)
    fillCircle(data, 80, 70, 12, TREE)
    fillCircle(data, 80, 340, 12, TREE)
    fillCircle(data, 560, 70, 12, TREE)
    return { width: LOT_WIDTH, height: LOT_HEIGHT, data }
}

function fillRect(data, x, y, width, height, color) {
    for (let row = y; row < y + height; row += 1) {
        for (let col = x; col < x + width; col += 1) {
            setPixel(data, col, row, color)
        }
    }
}

function fillCircle(data, centerX, centerY, radius, color) {
    const radiusSquared = radius * radius
    for (let row = centerY - radius; row <= centerY + radius; row += 1) {
        for (let col = centerX - radius; col <= centerX + radius; col += 1) {
            const dx = col - centerX
            const dy = row - centerY
            if (dx * dx + dy * dy <= radiusSquared) {
                setPixel(data, col, row, color)
            }
        }
    }
}

function setPixel(data, x, y, color) {
    if (x < 0 || y < 0 || x >= LOT_WIDTH || y >= LOT_HEIGHT) {
        return
    }
    const offset = (y * LOT_WIDTH + x) * 4
    data[offset] = color[0]
    data[offset + 1] = color[1]
    data[offset + 2] = color[2]
    data[offset + 3] = 255
}
