import fs from 'node:fs/promises'
import { getLatestOutputPath } from './outputPaths.js'

export async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

export async function readTextFile(filePath) {
  return fs.readFile(filePath, 'utf8')
}

export async function readLatestJson(filename, cwd = process.cwd()) {
  return readJsonFile(getLatestOutputPath(filename, cwd))
}

export async function readLatestText(filename, cwd = process.cwd()) {
  return readTextFile(getLatestOutputPath(filename, cwd))
}

