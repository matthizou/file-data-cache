import { basename } from 'path'
import { statSync, existsSync, readFileSync } from 'fs'

export const CACHE_CHECK_INTERVAL = 20000

export interface CachedFileData {
  lastModified: number
  fileExists: boolean
  value: any
  lastChecked: number
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

  getValues() {
    return Array.from(this.map.values())
  }

  getPaths() {
    return Array.from(this.map.keys())
  }

  getValue(fullPath: string) {
    return this.map.get(fullPath)
  }

  loadData(filePath: string, options: LoadDataOptions = {}) {
    let hasChanged = false
    const now = Date.now()
    const cachedData: CachedFileData = this.getValue(filePath)
    const { bypassCache = false } = options

    if (cachedData && !bypassCache) {
      if (now - cachedData.lastChecked < this.checkInterval) {
        // The file was recently checked: return cached values
        return {
          value: cachedData.value,
          hasChanged: false,
        }
      }
    }

    const fileExists = existsSync(filePath)
    let lastModified = 0
    let value
    const filename = basename(filePath)

    if (fileExists) {
      // Check the last modified date of the file
      lastModified = getFileLastModifiedDate(filePath)
      if (cachedData && lastModified === cachedData.lastModified) {
        // No change
        return {
          value: cachedData.value,
          hasChanged: false,
        }
      }

      // Changes detected.
      try {
        const fileContent = this.readFile ? readFile(filePath) : undefined
        value = this.loadFileData(filePath, fileContent)
        hasChanged = true
      } catch (e) {
        console.warn(`Fail to load file: ${filename}`, e)
      }
      if (!cachedData?.fileExists) {
        hasChanged = true
      }
    } else {
      console.warn('Path not found: ', filePath)
      if (cachedData?.fileExists) {
        hasChanged = true
      }
    }

    const cachedFileData: CachedFileData = {
      lastChecked: now,
      fileExists,
      lastModified,
      value,
    }

    this.map.set(filePath, cachedFileData)
    return {
      value: value || null,
      hasChanged,
    }
  }

  // reloadAll() {
  //   let result = []
  //   this.map.forEach((_, filePath) => {
  //     result.push({ path: filePath, ...this.loadData(filePath) })
  //   })
  //   return result
  // }
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
