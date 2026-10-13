import { estimateComponent } from './estimate.js'
import {
    addComponent,
    addProperty,
    findComponent,
    findProperty,
    replaceTraces,
    setScale
} from './schedule.js'
import { DRIVEWAY, FENCE, ROOF, TREE } from './sampleLot.js'

const SAMPLE_PARTS = [
    { name: 'Roof', kind: 'area', unit: 'sq ft', swatch: ROOF },
    { name: 'Driveway', kind: 'area', unit: 'sq ft', swatch: DRIVEWAY },
    { name: 'Fence', kind: 'length', unit: 'ft', swatch: FENCE },
    { name: 'Trees', kind: 'count', unit: 'ea', swatch: TREE }
]

export function loadSampleProperty(book, image) {
    let next = addProperty(book, { name: 'Sample lot', address: '18 Cedar Lane', imageKey: 'sample' })
    const property = next.properties[next.properties.length - 1]
    next = setScale(next, property.id, { pixelsPerUnit: 4, unit: 'ft' })
    for (const part of SAMPLE_PARTS) {
        next = addComponent(next, property.id, part)
    }
    return measureSwatches(next, property.id, image, 12)
}

export function measureSwatches(book, propertyId, image, tolerance) {
    const property = findProperty(book, propertyId)
    let next = book
    for (const component of property.components) {
        if (!component.swatch) {
            continue
        }
        next = measureComponent(next, propertyId, component.id, image, tolerance)
    }
    return next
}

export function measureComponent(book, propertyId, componentId, image, tolerance) {
    const component = findComponent(book, propertyId, componentId)
    if (!component.swatch) {
        throw new Error('Component has no swatch')
    }
    const estimate = estimateComponent(image, component.swatch, tolerance, component.kind)
    const traces = component.kind === 'count'
        ? [{ points: estimate.points, pixelQuantity: null }]
        : [{ points: [], pixelQuantity: estimate.pixelQuantity, bounds: estimate.bounds }]
    return replaceTraces(book, propertyId, componentId, traces)
}
