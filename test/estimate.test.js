import assert from 'node:assert/strict'
import test from 'node:test'
import { estimateComponent, maskStats } from '../src/estimate.js'
import { DRIVEWAY, FENCE, ROOF, TREE, paintLot } from '../src/sampleLot.js'

test('sample lot colors stay in separate regions', () => {
    const image = paintLot()
    assert.equal(maskStats(image, ROOF, 0).pixelArea, 160 * 120)
    assert.equal(maskStats(image, DRIVEWAY, 0).pixelArea, 180 * 80)
    const fence = maskStats(image, FENCE, 0)
    assert.equal(fence.pixelArea, 561 * 3)
    assert.equal(fence.bbox.height, 3)
    assert.equal(maskStats(image, TREE, 0).blobs, 3)
})

test('estimate turns a mask into area, length, or a count', () => {
    const image = paintLot()
    assert.equal(estimateComponent(image, ROOF, 0, 'area').pixelQuantity, 19200)
    assert.equal(estimateComponent(image, FENCE, 0, 'length').pixelQuantity, 561)
    assert.equal(estimateComponent(image, TREE, 0, 'count').points.length, 3)
    const blank = { width: 2, height: 2, data: new Uint8ClampedArray(16) }
    assert.equal(estimateComponent(blank, ROOF, 0, 'length').pixelQuantity, 0)
})
