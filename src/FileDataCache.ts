import { basename } from 'path'
import { statSync, existsSync, readFileSync } from 'fs'

export const CACHE_CHECK_INTERVAL = 20000

export interface CachedFileData {
  lastModified: number
  fileExists: boolean
  value: any
  lastCheck: {
    time: number
    wasChanged: boolean
  }
}

export interface LoadDataOptions {
  bypassCache?: boolean
}

export interface LoadFileDataFunc {
  (filePath: string, fileContent?: string): any
}

export interface FileDataCacheOptions {
  loadFileData: LoadFileDataFunc
  checkInterval?: number
  readFile?: boolean
}

export type FileDataCacheMap = Map<string, CachedFileData>

export class FileDataCache {
  map: FileDataCacheMap
  loadFileData: LoadFileDataFunc
  checkInterval: number
  readFile?: boolean

  constructor(options: FileDataCacheOptions) {
    this.map = new Map()
    this.loadFileData = options.loadFileData
    this.checkInterval = options.checkInterval ?? CACHE_CHECK_INTERVAL
    this.readFile = Boolean(options.readFile)
  }

  getEntries() {
    return Array.from(this.map.entries()).map(([path, data]) => ({
      ...data,
      path,
    }))
  }

  getPaths() {
    return Array.from(this.map.keys())
  }

  getValues() {
    return Array.from(this.map.values()).map(({ value }) => value)
  }

  getEntry(fullPath: string) {
    return this.map.get(fullPath)
  }

  loadData(filePath: string, options: LoadDataOptions = {}) {
    let hasChanged = false
    const now = Date.now()
    const cachedEntry: CachedFileData = this.getEntry(filePath)
    const { bypassCache = false } = options

    if (cachedEntry && !bypassCache) {
      if (now - cachedEntry.lastCheck.time < this.checkInterval) {
        // The file was recently checked: return cached values
        return cachedEntry.value
      }
    }

    const fileExists = existsSync(filePath)
    let lastModified = 0
    let value
    const filename = basename(filePath)

    if (fileExists) {
      // Check the last modified date of the file
      lastModified = getFileLastModifiedDate(filePath)
      if (cachedEntry && lastModified === cachedEntry.lastModified) {
        // No change
        value = cachedEntry.value
      } else {
        // Changes detected.
        try {
          const fileContent = this.readFile ? readFile(filePath) : undefined
          value = this.loadFileData(filePath, fileContent)
          hasChanged = true
        } catch (e) {
          console.warn(`Fail to load file: ${filename}`, e)
        }
      }
      if (!cachedEntry?.fileExists) {
        hasChanged = true
      }
    } else {
      console.warn('Path not found: ', filePath)
      if (cachedEntry?.fileExists) {
        hasChanged = true
        value = undefined
      }
    }

    const cachedFileData: CachedFileData = {
      lastCheck: {
        time: now,
        wasChanged: hasChanged,
      },
      fileExists,
      lastModified,
      value,
    }

    this.map.set(filePath, cachedFileData)
    return value
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
