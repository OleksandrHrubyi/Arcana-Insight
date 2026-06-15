import fs from 'node:fs/promises'
import path from 'node:path'
import { getHistoryOutputPath, getLatestOutputPath } from './outputPaths.js'

export async function ensureDirectory(directoryPath) {
  await fs.mkdir(directoryPath, { recursive: true })
}

export async function writeJsonFile(filePath, data) {
  await ensureDirectory(path.dirname(filePath))
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  return filePath
}

export async function writeTextFile(filePath, content) {
  await ensureDirectory(path.dirname(filePath))
  await fs.writeFile(filePath, content.endsWith('\n') ? content : `${content}\n`, 'utf8')
  return filePath
}

export async function writeLatestJson(filename, data, cwd = process.cwd()) {
  return writeJsonFile(getLatestOutputPath(filename, cwd), data)
}

export async function writeLatestText(filename, content, cwd = process.cwd()) {
  return writeTextFile(getLatestOutputPath(filename, cwd), content)
}

export async function writeHistoryJson(runId, filename, data, cwd = process.cwd()) {
  return writeJsonFile(getHistoryOutputPath(runId, filename, cwd), data)
}

export async function writeHistoryText(runId, filename, content, cwd = process.cwd()) {
  return writeTextFile(getHistoryOutputPath(runId, filename, cwd), content)
}
