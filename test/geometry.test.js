import assert from 'node:assert/strict'
import test from 'node:test'
import { polygonArea, polylineLength } from '../src/geometry.js'

test('polygon area uses the shoelace of the ring', () => {
    assert.equal(polygonArea([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 3 }]), 6)
    assert.equal(polygonArea([{ x: 0, y: 0 }, { x: 0, y: 3 }, { x: 4, y: 0 }]), 6)
    assert.equal(polygonArea([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]), 100)
})

test('polygon area is zero until the ring has three points', () => {
    assert.equal(polygonArea([]), 0)
    assert.equal(polygonArea([{ x: 1, y: 1 }, { x: 4, y: 2 }]), 0)
})

test('polyline length sums segment distances', () => {
    assert.equal(polylineLength([{ x: 0, y: 0 }, { x: 3, y: 4 }]), 5)
    assert.equal(polylineLength([{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 4 }]), 7)
    assert.equal(polylineLength([{ x: 2, y: 2 }]), 0)
})
