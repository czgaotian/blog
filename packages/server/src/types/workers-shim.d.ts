declare interface D1ResultMeta {
  changes?: number
  last_row_id?: number
  duration?: number
  rows_read?: number
  rows_written?: number
  size_after?: number
}

declare interface D1Result<T = Record<string, unknown>> {
  success: boolean
  meta?: D1ResultMeta
  results?: T[]
}

declare interface R2HTTPMetadata {
  contentType?: string
  contentDisposition?: string
  contentEncoding?: string
  contentLanguage?: string
  contentLength?: number
  cacheControl?: string
  cacheExpiry?: Date
}

declare interface R2Object {
  key?: string
  version?: string
  size?: number
  etag?: string
  uploaded?: Date
  checksums?: Record<string, unknown>
  httpEtag?: string
  customMetadata?: Record<string, string>
  httpMetadata?: R2HTTPMetadata
}

declare interface R2ObjectBody extends R2Object {
  body: ReadableStream | null
  bodyUsed?: boolean
  arrayBuffer(): Promise<ArrayBuffer>
  text(): Promise<string>
  json<T>(): Promise<T>
  blob(): Promise<Blob>
}

declare type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = Record<string, unknown>>(): Promise<T | null>
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>
  raw<T = unknown[]>(): Promise<T[]>
}

declare interface D1Database {
  prepare(query: string): D1PreparedStatement
  batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<Array<D1Result<T>>>
  exec(query: string): Promise<unknown>
  dump?(): Promise<ArrayBuffer>
  withSession?(constraintOrBookmark?: string): D1Database
}

declare interface KVNamespace {
  get(key: string): Promise<string | null>
  get(key: string, type: 'text'): Promise<string | null>
  get<T = unknown>(key: string, type: 'json'): Promise<T | null>
  get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>
  get(key: string, type: 'stream'): Promise<ReadableStream | null>
  put(key: string, value: string | ArrayBuffer | ArrayBufferView | ReadableStream, options?: Record<string, unknown>): Promise<void>
  delete(key: string): Promise<void>
  list<T = unknown>(options?: Record<string, unknown>): Promise<{
    keys: Array<{ name: string; expiration?: number; metadata?: T }>
    list_complete?: boolean
    cursor?: string
  }>
}

declare interface R2Bucket {
  get(key: string, options?: unknown): Promise<R2ObjectBody | null>
  put(key: string, value: unknown, options?: unknown): Promise<unknown>
  delete(key: string | string[]): Promise<void>
  head(key: string): Promise<R2Object | null>
  list(options?: unknown): Promise<unknown>
}

declare interface Queue<T = unknown> {
  send(message: T, options?: unknown): Promise<unknown>
  sendBatch(messages: Iterable<unknown>, options?: unknown): Promise<unknown>
}

declare interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>
  connect?(address: unknown, options?: unknown): unknown
}

declare module '@cloudflare/workers-types' {
  export type D1PreparedStatement = globalThis.D1PreparedStatement
  export type D1ResultMeta = globalThis.D1ResultMeta
  export type D1Result<T = Record<string, unknown>> = globalThis.D1Result<T>
  export type D1Database = globalThis.D1Database
  export type KVNamespace = globalThis.KVNamespace
  export type R2Bucket = globalThis.R2Bucket
  export type Queue<T = unknown> = globalThis.Queue<T>
  export type Fetcher = globalThis.Fetcher
}
