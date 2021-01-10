# file-data-cache

Tiny util to cache data from files

```js
const loadFileData = (filePath, fileContent) => {
    const result = ..... // Do something
    return result // This value will be cached
}

const fileCache = new FileDataCache({
  loadFileData,
  checkInterval: 60000,
  readFile: true
})

// 1. Initial load of data
let values = fileCache.loadData(SOME_FILE_PATH)

// 2. Second call to `loadData`
// Cached values will be returned if:
// A/ the ellapsed time between this call and the last time the file was loading is smaller than `checkInterval`
// B/ the last modified date of the file hasn't changed

values = fileCache.loadData(SOME_FILE_PATH)



```
