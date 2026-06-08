function encodeRFC5987Value(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  )
}

function isAscii(value: string): boolean {
  return /^[\x00-\x7F]*$/.test(value)
}

function extractFilename(contentDisposition: string): string | null {
  const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''([^;\s]+)/i)
  if (filenameStarMatch) {
    try {
      return decodeURIComponent(filenameStarMatch[1])
    } catch {
      return filenameStarMatch[1]
    }
  }

  const quotedFilenameMatch = contentDisposition.match(/filename="([^"]+)"/i)
  if (quotedFilenameMatch) return quotedFilenameMatch[1]

  const filenameMatch = contentDisposition.match(/filename=([^;\s]+)/i)
  return filenameMatch?.[1] ?? null
}

export function createContentDisposition(filename: string, disposition = 'inline'): string {
  const extension = filename.match(/\.([A-Za-z0-9]{1,12})$/)?.[1]
  const baseName = filename.replace(/\.[^.]*$/, '')
  const asciiBaseName = baseName
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/["\\]/g, '')
    .replace(/[^A-Za-z0-9._ -]/g, '-')
    .replace(/[- ]+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')

  const fallbackFilename = `${asciiBaseName || 'download'}${extension ? `.${extension}` : ''}`

  return `${disposition}; filename="${fallbackFilename}"; filename*=UTF-8''${encodeRFC5987Value(filename)}`
}

export function ensureAsciiContentDisposition(
  contentDisposition: string,
  fallbackFilename = 'download',
): string {
  if (isAscii(contentDisposition)) return contentDisposition

  const disposition = contentDisposition.match(/^\s*([A-Za-z][A-Za-z0-9!#$&+.^_`|~-]*)/)?.[1] || 'inline'
  const filename = extractFilename(contentDisposition) || fallbackFilename

  return createContentDisposition(filename, disposition)
}
