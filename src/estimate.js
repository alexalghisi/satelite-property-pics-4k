export function countMatchingPixels(image, color, tolerance) {
    return maskStats(image, color, tolerance).pixelArea
}

export function maskStats(image, color, tolerance) {
    const { width, height, data } = image
    const total = width * height
    const match = new Uint8Array(total)
    let pixelArea = 0
    let minX = width
    let minY = height
    let maxX = -1
    let maxY = -1
    for (let index = 0; index < total; index += 1) {
        const offset = index * 4
        if (!near(data[offset], data[offset + 1], data[offset + 2], color, tolerance)) {
            continue
        }
        match[index] = 1
        pixelArea += 1
        const x = index % width
        const y = (index - x) / width
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
    }
    const seen = new Uint8Array(total)
    const centroids = []
    for (let index = 0; index < total; index += 1) {
        if (!match[index] || seen[index]) {
            continue
        }
        const stack = [index]
        seen[index] = 1
        let sumX = 0
        let sumY = 0
        let count = 0
        while (stack.length) {
            const current = stack.pop()
            const x = current % width
            const y = (current - x) / width
            sumX += x
            sumY += y
            count += 1
            if (x > 0) visit(stack, seen, match, current - 1)
            if (x + 1 < width) visit(stack, seen, match, current + 1)
            if (y > 0) visit(stack, seen, match, current - width)
            if (y + 1 < height) visit(stack, seen, match, current + width)
        }
        centroids.push({ x: sumX / count, y: sumY / count })
    }
    const bbox = pixelArea
        ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
        : null
    return { pixelArea, blobs: centroids.length, centroids, bbox }
}

function visit(stack, seen, match, next) {
    if (!match[next] || seen[next]) {
        return
    }
    seen[next] = 1
    stack.push(next)
}

export function estimateComponent(image, color, tolerance, kind) {
    const stats = maskStats(image, color, tolerance)
    if (kind === 'count') {
        return { pixelQuantity: null, points: stats.centroids }
    }
    if (kind === 'length') {
        if (!stats.pixelArea || !stats.bbox) {
            return { pixelQuantity: 0, points: [], bounds: null }
        }
        const span = Math.min(stats.bbox.width, stats.bbox.height)
        return { pixelQuantity: stats.pixelArea / span, points: [], bounds: stats.bbox }
    }
    return { pixelQuantity: stats.pixelArea, points: [], bounds: stats.bbox }
}

function near(red, green, blue, color, tolerance) {
    const dr = red - color[0]
    const dg = green - color[1]
    const db = blue - color[2]
    return dr * dr + dg * dg + db * db <= tolerance * tolerance
}
