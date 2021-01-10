import { FileDataCache, LoadFileDataFunc } from './FileDataCache'
import { statSync, existsSync } from 'fs'

const NOW = 1610218551523
jest.mock('fs')

Date.now = jest.fn().mockReturnValue(NOW)

const mockedExistsSync = existsSync as jest.Mock
mockedExistsSync.mockReturnValue(true)
const mockedStatSync = statSync as jest.Mock
mockedStatSync.mockReturnValue({
  mtimeMs: NOW,
})

const FILE_PATH = '/somePath/someFile.json'
const FILE_DATA = ['🐼', '🐻']
const FILE_DATA_2 = ['🐼', '🐻', '😼']

const loadFileData: jest.MockedFunction<LoadFileDataFunc> = jest
  .fn()
  .mockReturnValue(FILE_DATA)

describe('loadFileDataWithCache', () => {
  it('loads file and caches it', () => {
    const fileCache = new FileDataCache({
      loadFileData,
      checkInterval: 9999,
    })

    let result = fileCache.loadData(FILE_PATH)

    expect(fileCache.values.size).toBe(1)
    expect(loadFileData).toHaveBeenCalledTimes(1)

    result = fileCache.loadData(FILE_PATH)
    expect(loadFileData).toHaveBeenCalledTimes(1)
    expect(result).toBe(FILE_DATA)
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
      })
    })

    describe('when the file has not been modified', () => {
      it("doesn't reloads it", () => {
        const fileCache = new FileDataCache({
          loadFileData,
          checkInterval: 0,
        })

        let result = fileCache.loadData(FILE_PATH)
        result = fileCache.loadData(FILE_PATH)

        expect(loadFileData).toHaveBeenCalledTimes(1)
        expect(result).toBe(FILE_DATA)
      })
    })
  })
})
