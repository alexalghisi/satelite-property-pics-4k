import { formatQuantity, scheduleToCsv } from '../src/csv.js'
import { loadSampleProperty, measureComponent, measureSwatches } from '../src/measure.js'
import {
    addComponent,
    addProperty,
    addTrace,
    emptyBook,
    findProperty,
    removeComponent,
    removeProperty,
    schedule,
    setScale,
    updateComponent,
    updateProperty
} from '../src/schedule.js'

const STORAGE_KEY = 'parcel-takeoff-v1'
const UNITS = { area: 'sq ft', length: 'ft', count: 'ea' }

const state = {
    book: emptyBook(),
    propertyId: null,
    componentId: null,
    tool: 'area',
    draft: [],
    image: null,
    pixels: null
}

const surface = () => document.querySelector('#surface')

function init() {
    state.book = readBook()
    const first = state.book.properties[0]
    state.propertyId = first ? first.id : null
    bind()
    render()
    if (!first) {
        loadSample().catch(() => setStatus('Sample lot did not load.'))
        return
    }
    setStatus('Property ready.')
    restoreImage().catch(() => setStatus('Saved marks are here. Reload the site image to see them on the picture.'))
}

function bind() {
    document.querySelector('#property-form').addEventListener('submit', (event) => {
        event.preventDefault()
        try {
            state.book = addProperty(state.book, {
                name: value('#property-name'),
                address: value('#property-address')
            })
            state.propertyId = state.book.properties[state.book.properties.length - 1].id
            state.componentId = null
            persist()
            render()
            setStatus('Property added.')
        } catch (error) {
            setStatus(error.message)
        }
    })

    document.querySelector('#save-property').addEventListener('click', () => {
        if (!state.propertyId) {
            setStatus('Select a property to save.')
            return
        }
        try {
            state.book = updateProperty(state.book, state.propertyId, {
                name: value('#property-name'),
                address: value('#property-address')
            })
            persist()
            render()
            setStatus('Property saved.')
        } catch (error) {
            setStatus(error.message)
        }
    })

    document.querySelector('#delete-property').addEventListener('click', () => {
        if (!state.propertyId) {
            return
        }
        state.book = removeProperty(state.book, state.propertyId)
        state.propertyId = state.book.properties[0] ? state.book.properties[0].id : null
        state.componentId = null
        state.draft = []
        persist()
        render()
        setStatus('Property deleted.')
    })

    document.querySelector('#component-form').addEventListener('submit', (event) => {
        event.preventDefault()
        if (!state.propertyId) {
            setStatus('Add a property before components.')
            return
        }
        try {
            state.book = addComponent(state.book, state.propertyId, componentInput())
            const property = findProperty(state.book, state.propertyId)
            state.componentId = property.components[property.components.length - 1].id
            persist()
            render()
            setStatus('Component added.')
        } catch (error) {
            setStatus(error.message)
        }
    })

    document.querySelector('#save-component').addEventListener('click', () => {
        if (!state.propertyId || !state.componentId) {
            setStatus('Select a component to save.')
            return
        }
        try {
            state.book = updateComponent(state.book, state.propertyId, state.componentId, componentInput())
            persist()
            render()
            setStatus('Component saved.')
        } catch (error) {
            setStatus(error.message)
        }
    })

    document.querySelector('#delete-component').addEventListener('click', () => {
        if (!state.propertyId || !state.componentId) {
            return
        }
        state.book = removeComponent(state.book, state.propertyId, state.componentId)
        state.componentId = null
        persist()
        render()
        setStatus('Component deleted.')
    })

    document.querySelector('#component-kind').addEventListener('change', (event) => {
        const unit = document.querySelector('#component-unit')
        const current = unit.value.trim()
        if (!current || Object.values(UNITS).includes(current)) {
            unit.value = UNITS[event.target.value]
        }
    })

    document.querySelector('#properties').addEventListener('click', (event) => {
        const button = event.target.closest('[data-property]')
        if (!button) {
            return
        }
        state.propertyId = button.dataset.property
        state.componentId = null
        state.draft = []
        render()
    })

    document.querySelector('#components').addEventListener('click', (event) => {
        const button = event.target.closest('[data-component]')
        if (!button) {
            return
        }
        state.componentId = button.dataset.component
        const component = selectedComponent()
        document.querySelector('#component-name').value = component.name
        document.querySelector('#component-kind').value = component.kind
        document.querySelector('#component-unit').value = component.unit
        document.querySelector('#component-swatch').value = rgbToHex(component.swatch)
        render()
    })

    document.querySelectorAll('.tool').forEach((button) => {
        button.addEventListener('click', () => {
            state.tool = button.dataset.tool
            state.draft = []
            render()
        })
    })

    document.querySelector('#image-file').addEventListener('change', (event) => {
        const file = event.target.files[0]
        if (!file) {
            return
        }
        useImage(file).catch(() => setStatus('Image did not load.'))
    })

    document.querySelector('#load-sample').addEventListener('click', () => {
        loadSample().catch(() => setStatus('Sample lot did not load.'))
    })

    document.querySelector('#measure-swatches').addEventListener('click', () => {
        measureCurrent().catch((error) => setStatus(error.message))
    })

    document.querySelector('#export-csv').addEventListener('click', exportCsv)

    surface().addEventListener('click', onSurfaceClick)
    document.addEventListener('keydown', onKey)
}

function onSurfaceClick(event) {
    const point = eventPoint(event)
    if (state.tool === 'count') {
        commitTrace([point])
        return
    }
    if (state.tool === 'swatch') {
        pickSwatch(point).catch((error) => setStatus(error.message))
        return
    }
    state.draft.push(point)
    if (state.tool === 'scale' && state.draft.length === 2) {
        commitScale()
        return
    }
    draw()
}

function onKey(event) {
    const typing = event.target.closest('input, select, textarea')
    if (event.key === 'Enter' && !typing) {
        event.preventDefault()
        finishDraft()
    }
    if (event.key === 'Escape') {
        state.draft = []
        draw()
    }
    if (event.key === 'Backspace' && state.draft.length && !typing) {
        event.preventDefault()
        state.draft.pop()
        draw()
    }
}

function finishDraft() {
    if (state.tool === 'area' && state.draft.length >= 3) {
        commitTrace(state.draft)
        return
    }
    if (state.tool === 'length' && state.draft.length >= 2) {
        commitTrace(state.draft)
        return
    }
    setStatus('Add more points before finishing.')
}

function commitTrace(points) {
    if (!state.propertyId || !state.componentId) {
        setStatus('Select a component before marking.')
        return
    }
    state.book = addTrace(state.book, state.propertyId, state.componentId, { points })
    state.draft = []
    persist()
    render()
    setStatus('Mark added.')
}

function commitScale() {
    if (!state.propertyId) {
        setStatus('Select a property before setting scale.')
        state.draft = []
        return
    }
    const known = Number(value('#known-length'))
    const [start, end] = state.draft
    const pixelLength = Math.hypot(end.x - start.x, end.y - start.y)
    try {
        state.book = setScale(state.book, state.propertyId, {
            pixelsPerUnit: pixelLength / known,
            unit: value('#scale-unit')
        })
        state.draft = []
        persist()
        render()
        setStatus('Scale set from the known length.')
    } catch (error) {
        state.draft = []
        draw()
        setStatus(error.message)
    }
}

async function pickSwatch(point) {
    if (!state.pixels || !state.propertyId || !state.componentId) {
        setStatus('Choose a component and an image before sampling color.')
        return
    }
    const x = Math.round(point.x)
    const y = Math.round(point.y)
    if (x < 0 || y < 0 || x >= state.pixels.width || y >= state.pixels.height) {
        setStatus('Click a pixel on the image.')
        return
    }
    const offset = (y * state.pixels.width + x) * 4
    const swatch = [
        state.pixels.data[offset],
        state.pixels.data[offset + 1],
        state.pixels.data[offset + 2]
    ]
    const component = selectedComponent()
    state.book = updateComponent(state.book, state.propertyId, state.componentId, {
        name: component.name,
        kind: component.kind,
        unit: component.unit,
        swatch
    })
    document.querySelector('#component-swatch').value = rgbToHex(swatch)
    state.book = measureComponent(state.book, state.propertyId, state.componentId, state.pixels, tolerance())
    persist()
    render()
    setStatus('Swatch measured.')
}

async function measureCurrent() {
    if (!state.propertyId || !state.pixels) {
        setStatus('Load an image before measuring swatches.')
        return
    }
    state.book = measureSwatches(state.book, state.propertyId, state.pixels, tolerance())
    persist()
    render()
    setStatus('Swatches measured.')
}

async function restoreImage() {
    const property = currentProperty()
    if (!property || property.imageKey !== 'sample') {
        return
    }
    const response = await fetch('sample/lot.png')
    if (!response.ok) {
        throw new Error('Sample image did not load.')
    }
    await useImage(await response.blob())
}

async function loadSample() {
    const response = await fetch('sample/lot.png')
    if (!response.ok) {
        throw new Error('Sample lot did not load.')
    }
    const blob = await response.blob()
    await useImage(blob)
    state.book = loadSampleProperty(state.book, state.pixels)
    state.propertyId = state.book.properties[state.book.properties.length - 1].id
    state.componentId = null
    state.draft = []
    persist()
    render()
    setStatus('Sample lot measured.')
}

async function useImage(source) {
    const bitmap = await createImageBitmap(source)
    state.image = bitmap
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    context.drawImage(bitmap, 0, 0)
    state.pixels = context.getImageData(0, 0, bitmap.width, bitmap.height)
    draw()
}

function exportCsv() {
    if (!state.propertyId) {
        setStatus('Select a property to export.')
        return
    }
    const csv = scheduleToCsv(schedule(state.book, state.propertyId))
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    link.download = 'takeoff.csv'
    link.click()
    URL.revokeObjectURL(link.href)
}

function render() {
    renderProperties()
    renderComponents()
    renderSchedule()
    renderTools()
    renderScale()
    draw()
}

function renderProperties() {
    const list = document.querySelector('#properties')
    list.replaceChildren()
    for (const property of state.book.properties) {
        const item = document.createElement('li')
        const button = document.createElement('button')
        button.type = 'button'
        button.dataset.property = property.id
        button.textContent = property.address ? `${property.name} — ${property.address}` : property.name
        if (property.id === state.propertyId) {
            button.setAttribute('aria-current', 'true')
        }
        item.append(button)
        list.append(item)
    }
    const property = currentProperty()
    if (!property) {
        return
    }
    const name = document.querySelector('#property-name')
    const address = document.querySelector('#property-address')
    if (document.activeElement !== name) {
        name.value = property.name
    }
    if (document.activeElement !== address) {
        address.value = property.address
    }
}

function renderComponents() {
    const list = document.querySelector('#components')
    list.replaceChildren()
    const property = currentProperty()
    if (!property) {
        return
    }
    property.components.forEach((component, index) => {
        const item = document.createElement('li')
        const button = document.createElement('button')
        button.type = 'button'
        button.dataset.component = component.id
        button.textContent = `${index + 1}. ${component.name}`
        if (component.id === state.componentId) {
            button.setAttribute('aria-current', 'true')
        }
        item.append(button)
        list.append(item)
    })
}

function renderSchedule() {
    const body = document.querySelector('#schedule')
    body.replaceChildren()
    if (!state.propertyId) {
        return
    }
    for (const row of schedule(state.book, state.propertyId)) {
        const tr = document.createElement('tr')
        for (const text of [row.name, formatQuantity(row.quantity), row.unit, String(row.traceCount)]) {
            const cell = document.createElement('td')
            cell.textContent = text
            tr.append(cell)
        }
        body.append(tr)
    }
}

function renderTools() {
    document.querySelectorAll('.tool').forEach((button) => {
        button.setAttribute('aria-pressed', button.dataset.tool === state.tool ? 'true' : 'false')
    })
}

function renderScale() {
    const readout = document.querySelector('#scale-readout')
    const property = currentProperty()
    if (!property || !property.scale) {
        readout.textContent = 'Scale not set'
        return
    }
    const pixels = Math.round(property.scale.pixelsPerUnit * 100) / 100
    readout.textContent = `${pixels} px / ${property.scale.unit}`
    const unit = document.querySelector('#scale-unit')
    if (document.activeElement !== unit) {
        unit.value = property.scale.unit
    }
}

function draw() {
    const canvas = surface()
    const context = canvas.getContext('2d')
    const property = currentProperty()
    if (state.image) {
        canvas.width = state.image.width
        canvas.height = state.image.height
        context.drawImage(state.image, 0, 0)
    } else {
        canvas.width = 640
        canvas.height = 400
        context.fillStyle = '#d5dece'
        context.fillRect(0, 0, canvas.width, canvas.height)
    }
    if (!property) {
        return
    }
    property.components.forEach((component, index) => {
        context.strokeStyle = componentColor(component, index)
        context.fillStyle = componentColor(component, index)
        context.lineWidth = 2
        for (const trace of component.traces) {
            context.strokeStyle = componentColor(component, index)
            context.fillStyle = context.strokeStyle
            drawPoints(context, trace.points, component.kind)
            if (trace.bounds) {
                context.strokeStyle = '#fffdf8'
                context.strokeRect(trace.bounds.x + 0.5, trace.bounds.y + 0.5, trace.bounds.width, trace.bounds.height)
            }
        }
    })
    context.strokeStyle = '#8d4b32'
    context.fillStyle = '#8d4b32'
    context.lineWidth = 2
    drawPoints(context, state.draft, state.tool === 'count' ? 'count' : 'length')
}

function drawPoints(context, points, kind) {
    if (!points.length) {
        return
    }
    if (kind === 'count') {
        for (const point of points) {
            context.beginPath()
            context.arc(point.x, point.y, 5, 0, Math.PI * 2)
            context.fill()
        }
        return
    }
    context.beginPath()
    context.moveTo(points[0].x, points[0].y)
    for (const point of points.slice(1)) {
        context.lineTo(point.x, point.y)
    }
    if (kind === 'area' && points.length >= 3) {
        context.closePath()
        context.globalAlpha = 0.28
        context.fill()
        context.globalAlpha = 1
    }
    context.stroke()
}

function componentColor(component, index) {
    if (component.swatch) {
        return `rgb(${component.swatch.join(',')})`
    }
    return ['#1f4d40', '#8d4b32', '#24527a', '#6b3f69'][index % 4]
}

function currentProperty() {
    if (!state.propertyId) {
        return null
    }
    return state.book.properties.find((property) => property.id === state.propertyId) || null
}

function selectedComponent() {
    const property = currentProperty()
    return property.components.find((component) => component.id === state.componentId)
}

function componentInput() {
    return {
        name: value('#component-name'),
        kind: value('#component-kind'),
        unit: value('#component-unit'),
        swatch: hexToRgb(value('#component-swatch'))
    }
}

function eventPoint(event) {
    const canvas = surface()
    const rect = canvas.getBoundingClientRect()
    return {
        x: (event.clientX - rect.left) * (canvas.width / rect.width),
        y: (event.clientY - rect.top) * (canvas.height / rect.height)
    }
}

function tolerance() {
    const number = Number(value('#tolerance'))
    return number >= 0 ? number : 12
}

function hexToRgb(hex) {
    const value = hex.replace('#', '')
    return [
        Number.parseInt(value.slice(0, 2), 16),
        Number.parseInt(value.slice(2, 4), 16),
        Number.parseInt(value.slice(4, 6), 16)
    ]
}

function rgbToHex(swatch) {
    if (!swatch) {
        return '#8d6a4a'
    }
    return `#${swatch.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

function value(selector) {
    return document.querySelector(selector).value
}

function setStatus(message) {
    document.querySelector('#status').textContent = message
}

function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.book))
}

function readBook() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) {
            return emptyBook()
        }
        const parsed = JSON.parse(raw)
        if (!parsed || !Array.isArray(parsed.properties) || !Number.isFinite(parsed.seq)) {
            return emptyBook()
        }
        return parsed
    } catch {
        return emptyBook()
    }
}

init()
