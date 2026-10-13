import { polygonArea, polylineLength } from './geometry.js'
import { areaInUnits, lengthInUnits } from './scale.js'

const KINDS = new Set(['area', 'length', 'count'])

export function emptyBook() {
    return { seq: 1, properties: [] }
}

export function addProperty(book, input) {
    const issued = issue(book)
    const property = {
        id: issued.id,
        name: requiredText(input.name, 'Property name is required'),
        address: String(input.address || '').trim(),
        imageKey: input.imageKey ? String(input.imageKey) : null,
        scale: null,
        components: []
    }
    return {
        seq: issued.book.seq,
        properties: book.properties.concat(property)
    }
}

export function updateProperty(book, propertyId, input) {
    return mapProperty(book, propertyId, (property) => ({
        ...property,
        name: requiredText(input.name, 'Property name is required'),
        address: String(input.address || '').trim()
    }))
}

export function removeProperty(book, propertyId) {
    const properties = book.properties.filter((property) => property.id !== propertyId)
    if (properties.length === book.properties.length) {
        throw new Error('Property not found')
    }
    return { ...book, properties }
}

export function addComponent(book, propertyId, input) {
    const issued = issue(book)
    const component = componentFrom(input, issued.id)
    const next = mapProperty(issued.book, propertyId, (property) => ({
        ...property,
        components: property.components.concat(component)
    }))
    return next
}

export function updateComponent(book, propertyId, componentId, input) {
    return mapComponent(book, propertyId, componentId, (component) => {
        const next = componentFrom(input, component.id)
        if (next.kind !== component.kind) {
            next.traces = []
        } else {
            next.traces = component.traces
        }
        return next
    })
}

export function removeComponent(book, propertyId, componentId) {
    return mapProperty(book, propertyId, (property) => {
        const components = property.components.filter((component) => component.id !== componentId)
        if (components.length === property.components.length) {
            throw new Error('Component not found')
        }
        return { ...property, components }
    })
}

export function setScale(book, propertyId, scale) {
    if (!scale || !Number.isFinite(scale.pixelsPerUnit) || !(scale.pixelsPerUnit > 0)) {
        throw new Error('Scale must be a positive number of pixels per unit')
    }
    return mapProperty(book, propertyId, (property) => ({
        ...property,
        scale: {
            pixelsPerUnit: scale.pixelsPerUnit,
            unit: requiredText(scale.unit, 'Scale unit is required')
        }
    }))
}

export function clearScale(book, propertyId) {
    return mapProperty(book, propertyId, (property) => ({
        ...property,
        scale: null
    }))
}

export function addTrace(book, propertyId, componentId, trace) {
    const issued = issue(book)
    const stored = storedTrace(issued.id, trace)
    return mapComponent(issued.book, propertyId, componentId, (component) => ({
        ...component,
        traces: component.traces.concat(stored)
    }))
}

export function removeTrace(book, propertyId, componentId, traceId) {
    return mapComponent(book, propertyId, componentId, (component) => {
        const traces = component.traces.filter((trace) => trace.id !== traceId)
        if (traces.length === component.traces.length) {
            throw new Error('Trace not found')
        }
        return { ...component, traces }
    })
}

export function replaceTraces(book, propertyId, componentId, traces) {
    let next = book
    const stored = []
    for (const trace of traces) {
        const issued = issue(next)
        next = issued.book
        stored.push(storedTrace(issued.id, trace))
    }
    return mapComponent(next, propertyId, componentId, (component) => ({
        ...component,
        traces: stored
    }))
}

export function findProperty(book, propertyId) {
    const property = book.properties.find((item) => item.id === propertyId)
    if (!property) {
        throw new Error('Property not found')
    }
    return property
}

export function findComponent(book, propertyId, componentId) {
    const property = findProperty(book, propertyId)
    const component = property.components.find((item) => item.id === componentId)
    if (!component) {
        throw new Error('Component not found')
    }
    return component
}

export function schedule(book, propertyId) {
    const property = findProperty(book, propertyId)
    return property.components.map((component) => ({
        componentId: component.id,
        name: component.name,
        kind: component.kind,
        unit: component.unit,
        traceCount: component.traces.length,
        quantity: componentQuantity(component, property.scale)
    }))
}

function componentQuantity(component, scale) {
    if (component.traces.length === 0) {
        return 0
    }
    const pixelsPerUnit = scale ? scale.pixelsPerUnit : null
    let total = 0
    for (const trace of component.traces) {
        const part = traceQuantity(component.kind, trace, pixelsPerUnit)
        if (part == null) {
            return null
        }
        total += part
    }
    return total
}

function traceQuantity(kind, trace, pixelsPerUnit) {
    if (kind === 'count') {
        return trace.points.length
    }
    const pixels = trace.pixelQuantity == null
        ? (kind === 'area' ? polygonArea(trace.points) : polylineLength(trace.points))
        : trace.pixelQuantity
    if (kind === 'area') {
        return areaInUnits(pixels, pixelsPerUnit)
    }
    return lengthInUnits(pixels, pixelsPerUnit)
}

function componentFrom(input, id) {
    if (!KINDS.has(input.kind)) {
        throw new Error('Component kind must be area, length, or count')
    }
    return {
        id,
        name: requiredText(input.name, 'Component name is required'),
        kind: input.kind,
        unit: requiredText(input.unit, 'Component unit is required'),
        swatch: copySwatch(input.swatch),
        traces: []
    }
}

function storedTrace(id, trace) {
    return {
        id,
        points: copyPoints(trace.points || []),
        pixelQuantity: trace.pixelQuantity == null ? null : finiteNumber(trace.pixelQuantity, 'Trace quantity is invalid'),
        bounds: copyBounds(trace.bounds)
    }
}

function copyBounds(bounds) {
    if (bounds == null) {
        return null
    }
    return {
        x: finiteNumber(bounds.x, 'Trace bounds are invalid'),
        y: finiteNumber(bounds.y, 'Trace bounds are invalid'),
        width: finiteNumber(bounds.width, 'Trace bounds are invalid'),
        height: finiteNumber(bounds.height, 'Trace bounds are invalid')
    }
}

function copyPoints(points) {
    if (!Array.isArray(points)) {
        throw new Error('Trace points are required')
    }
    return points.map((point) => ({
        x: finiteNumber(point.x, 'Trace point is invalid'),
        y: finiteNumber(point.y, 'Trace point is invalid')
    }))
}

function copySwatch(swatch) {
    if (swatch == null) {
        return null
    }
    if (!Array.isArray(swatch) || swatch.length !== 3) {
        throw new Error('Swatch must be an RGB triplet')
    }
    return swatch.map((channel) => {
        const value = Number(channel)
        if (!Number.isInteger(value) || value < 0 || value > 255) {
            throw new Error('Swatch must be an RGB triplet')
        }
        return value
    })
}

function issue(book) {
    return {
        id: `id-${book.seq}`,
        book: { ...book, seq: book.seq + 1 }
    }
}

function mapProperty(book, propertyId, update) {
    let found = false
    const properties = book.properties.map((property) => {
        if (property.id !== propertyId) {
            return property
        }
        found = true
        return update(property)
    })
    if (!found) {
        throw new Error('Property not found')
    }
    return { ...book, properties }
}

function mapComponent(book, propertyId, componentId, update) {
    return mapProperty(book, propertyId, (property) => {
        let found = false
        const components = property.components.map((component) => {
            if (component.id !== componentId) {
                return component
            }
            found = true
            return update(component)
        })
        if (!found) {
            throw new Error('Component not found')
        }
        return { ...property, components }
    })
}

function requiredText(value, message) {
    const text = String(value || '').trim()
    if (!text) {
        throw new Error(message)
    }
    return text
}

function finiteNumber(value, message) {
    const number = Number(value)
    if (!Number.isFinite(number)) {
        throw new Error(message)
    }
    return number
}
