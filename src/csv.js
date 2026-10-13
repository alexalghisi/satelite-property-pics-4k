export function formatQuantity(value) {
    if (value == null || !Number.isFinite(value)) {
        return ''
    }
    const rounded = Math.round(value * 100) / 100
    return String(rounded)
}

export function scheduleToCsv(rows) {
    const lines = ['Component,Kind,Quantity,Unit,Marks']
    for (const row of rows) {
        lines.push([
            cell(row.name),
            cell(row.kind),
            cell(formatQuantity(row.quantity)),
            cell(row.unit),
            cell(row.traceCount)
        ].join(','))
    }
    return `${lines.join('\n')}\n`
}

function cell(value) {
    const text = value == null ? '' : String(value)
    if (/[",\n]/.test(text)) {
        return `"${text.replaceAll('"', '""')}"`
    }
    return text
}
