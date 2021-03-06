import { FileDataCache, LoadFileDataFunc } from './FileDataCache'
import { statSync, existsSync, readFileSync } from 'fs'

const FILE_PATH = '/somePath/someFile.json'
const FILE_PATH_2 = '/somePath/someFile2.json'
const FILE_DATA = ['🐼', '🐻']
const FILE_DATA_2 = ['🐼', '🐻', '😼']

const NOW = 1610218551523
Date.now = jest.fn().mockReturnValue(NOW)

const FILE_CONTENT = 'Panda,bear'
jest.mock('fs')
const mockedExistsSync = existsSync as jest.Mock
mockedExistsSync.mockReturnValue(true)
const mockedStatSync = statSync as jest.Mock
mockedStatSync.mockReturnValue({
  mtimeMs: NOW,
})
const mockedReadFileSync = readFileSync as jest.Mock
mockedReadFileSync.mockReturnValue(FILE_CONTENT)

const loadFileData: jest.MockedFunction<LoadFileDataFunc> = jest
  .fn()
  .mockReturnValue(FILE_DATA)

describe('loadFileDataWithCache', () => {
  it('loads file and caches it', () => {
    const fileCache = new FileDataCache({
      loadFileData,
      checkInterval: 9999,
    })

    fileCache.loadData(FILE_PATH)

    expect(fileCache.getEntries().length).toBe(1)
    expect(loadFileData).toHaveBeenCalledTimes(1)
    expect(fileCache.getEntry(FILE_PATH).lastCheck.wasChanged).toBe(true)

    const result = fileCache.loadData(FILE_PATH)
    expect(loadFileData).toHaveBeenCalledTimes(1)
    expect(result).toBe(FILE_DATA)
  })

  describe('`readFile` option', () => {
    describe('when `true`', () => {
      it('returns file content to the `loadData` handler', () => {
        const fileCache = new FileDataCache({
          loadFileData,
          readFile: true,
        })

        fileCache.loadData(FILE_PATH)

        expect(loadFileData).toHaveBeenCalledWith(FILE_PATH, FILE_CONTENT)
      })
    })

    describe('when `false`', () => {
      it("doesn't return file content to the `loadData` handler", () => {
        const fileCache = new FileDataCache({
          loadFileData,
          readFile: false,
        })

        fileCache.loadData(FILE_PATH)

        expect(loadFileData).toHaveBeenCalledWith(FILE_PATH, undefined)
      })
    })
  })

  describe('when the interval between two checks is smaller than the check interval', () => {
    it("uses the cache value and doesn't recheck the file in the file system", () => {
      const fileCache = new FileDataCache({
        loadFileData,
        checkInterval: 9999,
      })

      let result = fileCache.loadData(FILE_PATH)
      result = fileCache.loadData(FILE_PATH)
      result = fileCache.loadData(FILE_PATH)
      result = fileCache.loadData(FILE_PATH)

      expect(loadFileData).toHaveBeenCalledTimes(1)
      expect(mockedExistsSync).toHaveBeenCalledTimes(1)
      expect(mockedStatSync).toHaveBeenCalledTimes(1)
      expect(result).toBe(FILE_DATA)
    })
  })

  describe('when the interval between two checks is greater than the check interval', () => {
    describe('when the file has been modified', () => {
      it('reloads it', () => {
        const fileCache = new FileDataCache({
          loadFileData,
          checkInterval: 0,
        })

        mockedStatSync.mockReturnValueOnce({
          mtimeMs: NOW - 1000,
        })
        let result = fileCache.loadData(FILE_PATH)

        mockedStatSync.mockReturnValueOnce({
          mtimeMs: NOW,
        })
        loadFileData.mockReturnValueOnce(FILE_DATA_2)

        result = fileCache.loadData(FILE_PATH)

        expect(loadFileData).toHaveBeenCalledTimes(2)
        expect(result).toBe(FILE_DATA_2)
        expect(fileCache.getEntry(FILE_PATH).lastCheck.wasChanged).toBe(true)
      })
    })

    describe('when the file has not been modified', () => {
      it("doesn't reloads it", () => {
        const fileCache = new FileDataCache({
          loadFileData,
          checkInterval: 0,
        })

        fileCache.loadData(FILE_PATH)
        const result = fileCache.loadData(FILE_PATH)

        expect(loadFileData).toHaveBeenCalledTimes(1)
        expect(result).toBe(FILE_DATA)
        expect(fileCache.getEntry(FILE_PATH).lastCheck.wasChanged).toBe(false)
      })
    })
  })

  it('provides getter functions: `getValues`, `getPaths`, `getEntries`', () => {
    const fileCache = new FileDataCache({
      loadFileData,
    })

    fileCache.loadData(FILE_PATH)

    loadFileData.mockReturnValueOnce(FILE_DATA_2)
    fileCache.loadData(FILE_PATH_2)

    expect(fileCache.getValues()).toEqual([FILE_DATA, FILE_DATA_2])

    expect(fileCache.getPaths()).toEqual([FILE_PATH, FILE_PATH_2])

    const lastCheck = {
      time: NOW,
      wasChanged: true,
    }
    expect(fileCache.getEntries()).toEqual([
      {
        path: FILE_PATH,
        value: FILE_DATA,
        fileExists: true,
        lastModified: NOW,
        lastCheck,
      },

      {
        path: FILE_PATH_2,
        value: FILE_DATA_2,
        fileExists: true,
        lastModified: NOW,
        lastCheck,
      },
    ])
  })
})
