import assert from 'node:assert/strict'
import test from 'node:test'
import { areaInUnits, lengthInUnits, pixelsPerUnit } from '../src/scale.js'

test('pixels per unit is the drawn length divided by the known length', () => {
    assert.equal(pixelsPerUnit(80, 20), 4)
})

test('scale lengths have to be positive', () => {
    assert.throws(() => pixelsPerUnit(0, 10), /positive/)
    assert.throws(() => pixelsPerUnit(10, -2), /positive/)
})

test('length and area convert with the linear scale', () => {
    assert.equal(lengthInUnits(10, 2), 5)
    assert.equal(areaInUnits(16, 2), 4)
    assert.equal(lengthInUnits(10, 0), null)
    assert.equal(areaInUnits(16, null), null)
})
