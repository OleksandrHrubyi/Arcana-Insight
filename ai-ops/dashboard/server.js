import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const DEFAULT_PORT = 4173
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
}

function getMimeType(filePath) {
  return MIME_TYPES[path.extname(filePath)] || 'text/plain; charset=utf-8'
}

function resolvePort() {
  const raw = process.env.AI_OPS_DASHBOARD_PORT
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_PORT
}

function resolvePathname(requestUrl = '/') {
  const url = new URL(requestUrl, 'http://localhost')
  return decodeURIComponent(url.pathname)
}

async function readFileFromRepo(rootDir, pathname) {
  const relativePath = pathname === '/' ? '/ai-ops/dashboard/' : pathname
  const requestedPath = relativePath.endsWith('/')
    ? `${relativePath}index.html`
    : relativePath
  const absolutePath = path.resolve(rootDir, `.${requestedPath}`)

  const relative = path.relative(rootDir, absolutePath)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    const error = new Error('Forbidden')
    error.statusCode = 403
    throw error
  }

  try {
    const stats = await fs.stat(absolutePath)
    if (stats.isDirectory()) {
      return readFileFromRepo(rootDir, `${requestedPath}/`)
    }
    return {
      body: await fs.readFile(absolutePath),
      contentType: getMimeType(absolutePath),
    }
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      const notFound = new Error('Not found')
      notFound.statusCode = 404
      throw notFound
    }
    throw error
  }
}

export function createDashboardServer(rootDir = process.cwd()) {
  return http.createServer(async (request, response) => {
    try {
      const pathname = resolvePathname(request.url)
      const file = await readFileFromRepo(rootDir, pathname)
      response.writeHead(200, {
        'Content-Type': file.contentType,
        'Cache-Control': 'no-store',
      })
      response.end(file.body)
    } catch (error) {
      const statusCode = error?.statusCode || 500
      response.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' })
      response.end(statusCode === 500 ? 'Internal server error\n' : `${error.message}\n`)
    }
  })
}

async function main() {
  const port = resolvePort()
  const server = createDashboardServer(process.cwd())

  server.listen(port, () => {
    process.stdout.write(`AI Ops dashboard: http://localhost:${port}/ai-ops/dashboard/\n`)
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main()
}

