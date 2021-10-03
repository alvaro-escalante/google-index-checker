import { readFile } from 'fs/promises'
;(async () => {
  try {
    const data = await readFile('./urls.csv', 'utf8')
    const arr = data.split('\n')
    console.log(arr)
  } catch (error) {
    console.log(error)
  }
})()
