import path from 'node:path'
import { OUTPUT_DIRECTORIES } from './constants.js'

export function getAiOpsRoot(cwd = process.cwd()) {
  return path.resolve(cwd, 'ai-ops')
}

export function getOutputRoot(cwd = process.cwd()) {
  return path.resolve(cwd, OUTPUT_DIRECTORIES.ROOT)
}

export function getLatestOutputDir(cwd = process.cwd()) {
  return path.resolve(cwd, OUTPUT_DIRECTORIES.LATEST)
}

export function getHistoryOutputDir(cwd = process.cwd()) {
  return path.resolve(cwd, OUTPUT_DIRECTORIES.HISTORY)
}

export function getLatestOutputPath(filename, cwd = process.cwd()) {
  return path.resolve(getLatestOutputDir(cwd), filename)
}

export function getHistoryRunDir(runId, cwd = process.cwd()) {
  return path.resolve(getHistoryOutputDir(cwd), runId)
}

export function getHistoryOutputPath(runId, filename, cwd = process.cwd()) {
  return path.resolve(getHistoryRunDir(runId, cwd), filename)
}

