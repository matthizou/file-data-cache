import { basename } from 'path'
import { statSync, existsSync, readFileSync } from 'fs'

export const CACHE_CHECK_INTERVAL = 20000

interface CachedFileData {
  lastModified: number
  fileExists: boolean
  values: any
  lastChecked: number
}

export interface LoadFileDataFunc {
  (filePath: string, fileContent?: string): any
}

interface FileDataCacheOptions {
  loadFileData: LoadFileDataFunc
  checkInterval?: number
  readFile?: boolean
}

export class FileDataCache {
  map: Map<string, CachedFileData>
  loadFileData: LoadFileDataFunc
  checkInterval: number
  readFile?: boolean

  constructor(options: FileDataCacheOptions) {
    this.map = new Map()
    this.loadFileData = options.loadFileData
    this.checkInterval = options.checkInterval ?? CACHE_CHECK_INTERVAL
    this.readFile = Boolean(options.readFile)
  }

  get values() {
    return this.map
  }

  loadData(filePath: string) {
    const now = Date.now()
    const cachedData: CachedFileData = this.retrieveFromCache(filePath)

    if (cachedData) {
      if (now - cachedData.lastChecked < this.checkInterval) {
        // The file was recently checked: return cached values
        return cachedData.values
      }
    }

    const fileExists = existsSync(filePath)
    let lastModified = 0
    let values
    const filename = basename(filePath)

    if (fileExists) {
      // Check the last modified date of the file
      lastModified = getFileLastModifiedDate(filePath)
      if (cachedData && lastModified === cachedData.lastModified) {
        // No change
        return cachedData.values
      }

      // Changes detected.
      try {
        const fileContent = this.readFile ? readFile(filePath) : undefined
        values = this.loadFileData(filePath, fileContent)
      } catch (e) {
        console.warn(`Fail to load file: ${filename}`, e)
      }
    } else {
      console.warn('Path not found: ', filePath)
    }

    const cachedFileData: CachedFileData = {
      lastChecked: now,
      fileExists,
      lastModified,
      values,
    }

    this.map.set(filePath, cachedFileData)
    return values || null
  }

  retrieveFromCache(fullPath: string) {
    return this.map.get(fullPath)
  }
}

function readFile(filePath) {
  let fileContent
  try {
    fileContent = readFileSync(filePath, 'utf8')
  } catch (e) {}
  return fileContent
}

function getFileLastModifiedDate(path) {
  try {
    const stats = statSync(path)
    return stats.mtimeMs
  } catch (e) {
    return null
  }
}
