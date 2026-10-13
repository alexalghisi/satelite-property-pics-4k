import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { scheduleToCsv } from '../src/csv.js'
import { loadSampleProperty, measureSwatches } from '../src/measure.js'
import { encodePng } from '../src/png.js'
import { paintLot } from '../src/sampleLot.js'
import { emptyBook, schedule } from '../src/schedule.js'

test('a sample lot produces the roof, paving, fence, and tree quantities', () => {
    const image = paintLot()
    const book = loadSampleProperty(emptyBook(), image)
    const property = book.properties[0]
    assert.equal(property.address, '18 Cedar Lane')
    assert.equal(property.imageKey, 'sample')
    assert.equal(property.scale.pixelsPerUnit, 4)
    const rows = schedule(book, property.id)
    assert.deepEqual(rows.map((row) => [row.name, row.quantity, row.unit]), [
        ['Roof', 1200, 'sq ft'],
        ['Driveway', 900, 'sq ft'],
        ['Fence', 140.25, 'ft'],
        ['Trees', 3, 'ea']
    ])
    const csv = scheduleToCsv(rows)
    assert.match(csv, /Roof,area,1200,sq ft,1/)
    assert.match(csv, /Fence,length,140.25,ft,1/)
    assert.match(csv, /Trees,count,3,ea,1/)
})

test('remeasuring a swatch replaces the previous marks', () => {
    const image = paintLot()
    let book = loadSampleProperty(emptyBook(), image)
    const propertyId = book.properties[0].id
    const before = book.properties[0].components[0].traces[0].id
    book = measureSwatches(book, propertyId, image, 12)
    assert.notEqual(book.properties[0].components[0].traces[0].id, before)
    assert.equal(schedule(book, propertyId)[0].quantity, 1200)
    book = loadSampleProperty(book, image)
    assert.equal(book.properties.length, 2)
    assert.equal(schedule(book, propertyId)[0].quantity, 1200)
})

test('the shipped sample image matches the lot painter', () => {
    const png = readFileSync(new URL('../web/sample/lot.png', import.meta.url))
    assert.deepEqual(png, encodePng(paintLot()))
    assert.equal(png.readUInt32BE(16), 640)
    assert.equal(png.readUInt32BE(20), 400)
})
