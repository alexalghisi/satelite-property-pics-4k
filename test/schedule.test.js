import assert from 'node:assert/strict'
import test from 'node:test'
import { scheduleToCsv } from '../src/csv.js'
import {
    addComponent,
    addProperty,
    addTrace,
    clearScale,
    emptyBook,
    removeComponent,
    removeProperty,
    removeTrace,
    schedule,
    setScale,
    updateComponent,
    updateProperty
} from '../src/schedule.js'

function lot() {
    let book = addProperty(emptyBook(), { name: 'Cedar', address: '18 Cedar Lane' })
    const propertyId = book.properties[0].id
    book = setScale(book, propertyId, { pixelsPerUnit: 2, unit: 'ft' })
    book = addComponent(book, propertyId, { name: 'Roof', kind: 'area', unit: 'sq ft' })
    book = addComponent(book, propertyId, { name: 'Fence', kind: 'length', unit: 'ft' })
    book = addComponent(book, propertyId, { name: 'Windows', kind: 'count', unit: 'ea' })
    return { book, propertyId }
}

test('property and component records can be added, renamed, and removed', () => {
    let book = addProperty(emptyBook(), { name: '  Cedar  ', address: ' 18 Cedar Lane ' })
    const propertyId = book.properties[0].id
    assert.equal(book.properties[0].name, 'Cedar')
    assert.equal(book.properties[0].address, '18 Cedar Lane')
    book = updateProperty(book, propertyId, { name: 'Cedar house', address: '' })
    assert.equal(book.properties[0].name, 'Cedar house')
    assert.equal(book.properties[0].address, '')
    book = addComponent(book, propertyId, { name: 'Roof', kind: 'area', unit: 'sq ft', swatch: [141, 106, 74] })
    const componentId = book.properties[0].components[0].id
    book = updateComponent(book, propertyId, componentId, { name: 'Main roof', kind: 'area', unit: 'sq ft' })
    assert.equal(book.properties[0].components[0].name, 'Main roof')
    assert.equal(book.properties[0].components[0].swatch, null)
    book = removeComponent(book, propertyId, componentId)
    assert.equal(book.properties[0].components.length, 0)
    book = removeProperty(book, propertyId)
    assert.deepEqual(book.properties, [])
})

test('manual traces roll into a scaled schedule', () => {
    const { book: seeded, propertyId } = lot()
    let book = seeded
    const [roof, fence, windows] = book.properties[0].components
    book = addTrace(book, propertyId, roof.id, {
        points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]
    })
    book = addTrace(book, propertyId, fence.id, {
        points: [{ x: 0, y: 0 }, { x: 3, y: 4 }]
    })
    book = addTrace(book, propertyId, windows.id, {
        points: [{ x: 1, y: 1 }, { x: 2, y: 2 }]
    })
    const rows = schedule(book, propertyId)
    assert.deepEqual(rows.map((row) => row.quantity), [25, 2.5, 2])
    const traceId = book.properties[0].components[0].traces[0].id
    book = removeTrace(book, propertyId, roof.id, traceId)
    assert.equal(schedule(book, propertyId)[0].quantity, 0)
})

test('area and length stay blank until a scale exists', () => {
    const { book: seeded, propertyId } = lot()
    let book = clearScale(seeded, propertyId)
    const roof = book.properties[0].components[0]
    book = addTrace(book, propertyId, roof.id, {
        points: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }]
    })
    assert.equal(schedule(book, propertyId)[0].quantity, null)
    book = setScale(book, propertyId, { pixelsPerUnit: 2, unit: 'ft' })
    assert.equal(schedule(book, propertyId)[0].quantity, 4)
})

test('changing kind drops marks that no longer match', () => {
    const { book: seeded, propertyId } = lot()
    let book = seeded
    const windows = book.properties[0].components[2]
    book = addTrace(book, propertyId, windows.id, { points: [{ x: 1, y: 1 }] })
    book = updateComponent(book, propertyId, windows.id, { name: 'Fence', kind: 'length', unit: 'ft' })
    assert.equal(book.properties[0].components[2].traces.length, 0)
})

test('schedule csv quotes odd names and leaves unscaled quantities empty', () => {
    const { book, propertyId } = lot()
    const csv = scheduleToCsv(schedule(book, propertyId))
    assert.equal(csv, 'Component,Kind,Quantity,Unit,Marks\nRoof,area,0,sq ft,0\nFence,length,0,ft,0\nWindows,count,0,ea,0\n')
    const quoted = scheduleToCsv([{ name: 'Roof, main', kind: 'area', quantity: null, unit: 'sq ft', traceCount: 0 }])
    assert.match(quoted, /"Roof, main",area,,sq ft,0/)
})

test('bad records are rejected', () => {
    const book = emptyBook()
    assert.throws(() => addProperty(book, { name: '  ' }), /Property name/)
    const withProperty = addProperty(book, { name: 'Cedar', address: '' })
    const propertyId = withProperty.properties[0].id
    assert.throws(() => addComponent(withProperty, propertyId, { name: 'Roof', kind: 'volume', unit: 'cf' }), /kind/)
    assert.throws(() => setScale(withProperty, propertyId, { pixelsPerUnit: 0, unit: 'ft' }), /Scale/)
    assert.throws(() => setScale(withProperty, propertyId, { pixelsPerUnit: Number.POSITIVE_INFINITY, unit: 'ft' }), /Scale/)
    assert.throws(() => removeProperty(withProperty, 'missing'), /Property not found/)
})
