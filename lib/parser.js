import { createReadStream } from 'fs'
import csv from 'csv-parser'

export const parseCSV = (data) => {
  return new Promise((resolve, reject) => {
    const arr = []
    createReadStream(data)
      .pipe(csv({ headers: false }))
      .on('error', (err) => reject(err))
      .on('data', (line) => {
        const url = Object.values(line)
        if (/(http(s?)):\/\//i.test(...url)) arr.push(...url)
      })
      .on('end', () => resolve(arr))
  })
}
