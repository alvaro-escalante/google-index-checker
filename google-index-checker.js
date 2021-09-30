// Required Modules
import chalk from 'chalk' // Terminal and string styling
import { existsSync, createWriteStream } from 'fs' // Node file system module
import csv from 'csvtojson' // Convert csv to json module
import axios from 'axios' // Axios client
import { requestUrl, compareUrl } from './lib/url-encoder.js' // Encoding functions
import { timer } from './lib/timer.js' // Timer function
// Settings
const start = Date.now() // Date counter to check duration of script
const site = 'https://www.google.com/search?q=' // Google search query
const urlsFile = './urls.csv' // File containing all the urls to check
const apiUrl = 'http://api.scraperapi.com/?api_key=' // ScraperAPI url

import { apiKey } from './APIKEY.js'
;(() => {
  const app = {
    totalUrls: 0,
    notIndexCounter: 0,

    // Check if file exist and count number of urls, if it does not exists, exit with message
    init: async () => {
      if (existsSync(urlsFile)) {
        // Store the total amount of urls
        const data = await csv({ noheader: true, output: 'line' }).fromFile(urlsFile)
        app.totalUrls = data.filter((url) => url.length !== 0).length
        app.batchRequest()
      } else {
        console.log(yellow('No urls.csv file found.'))
        process.exit()
      }
    },
    // Batch request with maximun according to account
    batchRequest: async () => {
      app.num = 1

      // Convert the csv to an array from `urls`
      let urls = await csv({ noheader: true, output: 'line' }).fromFile(urlsFile)

      // Filter csv empty lines
      urls = urls.filter((url) => url.length !== 0)

      const concurrent = await axios(
        `http://api.scraperapi.com/account?api_key=${apiKey}`
      )

      const data = [...urls]

      let errorCounter = 0

      while (urls.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const batch = urls
          .splice(0, concurrent.data.concurrencyLimit)
          .map((url) => app.runRequest(url, data.length + errorCounter))

        const results = await Promise.allSettled(batch)

        for (const { status, reason } of results) {
          if (status === 'rejected') {
            errorCounter++
            urls.push(reason)
          }
        }
      }

      app.finalMessage()
    },

    // HTTP request async promise
    runRequest: async (url, len) => {
      // Make requests with encoded URL through axios with header options and write it to results
      try {
        // URL encoded for request
        const request = requestUrl(url)
        // URL encoded to check indexation
        const compare = compareUrl(url, false)
        // URL encoded for discrepancies
        const utfEncoded = compareUrl(url, true)
        // HTTPS request using axios, scraperapi, google and the enconded url
        const res = await axios(`${apiUrl}${apiKey}&url=${site}${request}`)
        const indexation = app.matchResponse(url, res.data, compare, utfEncoded)
          ? 'Indexed'
          : 'Not Indexed'
        // Print to terminal each url, its number and status code
        console.log(
          chalk.cyan(
            `Checking: ${app.num++}/${len} ${url} ${chalk.bold.green(
              res.status
            )} ${chalk.bold.white(indexation)}`
          )
        )
        // Create append streamclear
        const stream = createWriteStream('./results.csv', {
          flags: 'a',
          encoding: 'utf8'
        })
        // Append evaluation from response to file
        stream.write(`${url}, ${indexation}\n`)
        // End stream to avoid accumulation
        stream.end()
      } catch (err) {
        // When there is an error write it to errors.csv or exceptions.csv
        let msg = ''

        // Send status
        if (err.response || err.request) {
          if (err.response.status === 401) {
            console.log(
              yellow(
                `No scraperapi key found, please add your key in the APIKEY.js file\n`
              )
            )
            process.exit()
          } else msg = err.response.status
        }
        // Something happened in setting up the request and triggered an Error
        else {
          app.notIndexCounter += 1
          msg = 'Exception'
        }

        // Log with different color to highlight the error
        console.log(chalk.yellow(`Error: ${app.num++}/${len} ${url} ${chalk.red(msg)}`))

        throw url
      }
    },

    // Compare url against google response url
    matchResponse: (url, res, compare, utfEncoded) => {
      let matchURL = false

      if (url.includes(`'`)) {
        matchURL =
          res.includes(`href="${compare}"`) | res.includes(`href="${utfEncoded}"`)
      } else {
        matchURL = res.includes(`href="${compare}"`)
      }

      // Counter foreach not index
      if (!matchURL) app.notIndexCounter += 1

      return matchURL
    },

    finalMessage: () => {
      console.log(
        `\n${app.totalUrls} URLS, results.csv file successfully written in ${timer(
          Date.now() - start
        )}\n`
      )
      console.log(
        `${chalk.bold.green(
          `Indexed: ` + (app.totalUrls - app.notIndexCounter)
        )}\n${chalk.bold.red(`Not indexed: ` + app.notIndexCounter + `\n`)}`
      )
    }
  }

  // Start the app init function
  return app.init()
})()
