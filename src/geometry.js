export function polygonArea(points) {
    if (!points || points.length < 3) {
        return 0
    }
    let sum = 0
    for (let index = 0; index < points.length; index += 1) {
        const current = points[index]
        const next = points[(index + 1) % points.length]
        sum += current.x * next.y - next.x * current.y
    }
    return Math.abs(sum) / 2
}

export function polylineLength(points) {
    if (!points || points.length < 2) {
        return 0
    }
    let length = 0
    for (let index = 1; index < points.length; index += 1) {
        const previous = points[index - 1]
        const current = points[index]
        length += Math.hypot(current.x - previous.x, current.y - previous.y)
    }
    return length
}
