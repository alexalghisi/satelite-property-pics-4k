export function pixelsPerUnit(pixelLength, realLength) {
    if (!(pixelLength > 0) || !(realLength > 0)) {
        throw new Error('Scale lengths must be positive')
    }
    return pixelLength / realLength
}

export function lengthInUnits(pixelLength, pixelsPerUnit) {
    if (!(pixelsPerUnit > 0)) {
        return null
    }
    return pixelLength / pixelsPerUnit
}

export function areaInUnits(pixelArea, pixelsPerUnit) {
    if (!(pixelsPerUnit > 0)) {
        return null
    }
    return pixelArea / (pixelsPerUnit * pixelsPerUnit)
}
