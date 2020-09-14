// Required Modules
const ck = require('chalk') // Terminal and string styling
const fs = require('fs') // Node file system module
const csv = require('csvtojson') // Convert csv to json module
const axios = require('axios') // Axios client
const { requestUrl, compareUrl } = require('./lib/url-encoder') // Encoding functions
const { timer } = require('./lib/timer') // Timer function
// Settings
const start = Date.now() // Date counter to check duration of script
const site = 'https://www.google.com/search?q=' // Google search query
const urlsFile = './urls.csv' // File containing all the urls to check
const apiUrl = 'http://api.scraperapi.com/?api_key=' // ScraperAPI url
const { apiKey } = require('./APIKEY') // ScraperAPI key

;(() => {
  const app = {
    totalUrls: 0,
    notIndexCounter: 0,

    // Check if file exist and count number of urls, if it does not exists, exit with message
    init: async () => {
      if (fs.existsSync(urlsFile)) {
        // Store the total amount of urls
        const data = await csv({ noheader: true, output: 'line' }).fromFile(urlsFile)
        app.totalUrls = data.filter((url) => url.length !== 0).length
        app.getUrls()
      } else {
        console.log(ck.yellow('No urls.csv file found.'))
        process.exit()
      }
    },

    // Initial request converts the `urls` list into an array and executes parallel http request
    getUrls: async () => {
      // Counter to keep track of current number being checked
      app.num = 1

      // Convert the csv to an array from `urls`
      let urls = await csv({ noheader: true, output: 'line' }).fromFile(urlsFile)

      // Filter csv empty lines
      urls = urls.filter((url) => url.length !== 0)

      // Parallel batch promises for concurrent requests

      // Get concurrent max number based on API key
      const concurrent = await axios(`http://api.scraperapi.com/account?api_key=${apiKey}`)

      // Clone urls array
      const urlsClone = [...urls]

      // Max concurrent requests allowed and fill each resolved promise
      const promises = new Array(concurrent.data.concurrencyLimit).fill(Promise.resolve())

      // Recursive http request
      const chainNext = (promised) => {
        // If there are items left, run again
        if (urlsClone.length) {
          // Take the first one away from the array and use that for the request
          const url = urlsClone.shift()
          // Execute the request
          return promised.then(() => {
            // Make request for the first entry on the clone array
            const promiseOperation = app.runRequest(url, urls.length)
            // Run again
            return chainNext(promiseOperation)
          })
        }

        // Return results
        return promised
      }

      // When done check for errors
      await Promise.all(promises.map(chainNext)).then(() => app.checkErrors())
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
          ck.cyan(
            `Checking: ${app.num++}/${len} ${url} ${ck.bold.green(res.status)} ${ck.bold.white(
              indexation
            )}`
          )
        )

        // Create append streamclear
        const stream = fs.createWriteStream('./results.csv', { flags: 'a', encoding: 'utf8' })

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
              ck.yellow(`No scraperapi key found, please add your key in the APIKEY.js file\n`)
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
        console.log(ck.yellow(`Checking: ${app.num++}/${len} ${url} ${ck.red(msg)}`))
        // Create append stream
        const errorStream = fs.createWriteStream(
          // If there are invalid urls it will go to the excepctions file
          msg === 'Exception' ? './exceptions.csv' : './errors.csv',
          { flags: 'a', encoding: 'utf8' }
        )

        // Append to file
        errorStream.write(`${url}\n`)

        // End stream to avoid accumulation
        errorStream.end()
      }
    },

    // Compare url against google response url
    matchResponse: (url, res, compare, utfEncoded) => {
      let matchURL = false

      if (url.includes(`'`)) {
        matchURL = res.includes(`href="${compare}"`) | res.includes(`href="${utfEncoded}"`)
      } else {
        matchURL = res.includes(`href="${compare}"`)
      }

      // Counter foreach not index
      if (!matchURL) app.notIndexCounter += 1

      return matchURL
    },

    // Remove urls.csv, rename errors.csv to urls.csv and run request again
    checkErrors: () => {
      // If there's no errors.csv, finish and log duration
      fs.rename('./errors.csv', urlsFile, (err) => {
        if (err) {
          fs.unlink(urlsFile, (err) => {
            if (err) console.log('Error deleting url.csv')
          })
          console.log(
            `\n${app.totalUrls} URLS, results.csv file successfully written in ${timer(
              Date.now() - start
            )}\n`
          )
          console.log(
            `${ck.bold.green(`Indexed: ` + (app.totalUrls - app.notIndexCounter))}\n${ck.bold.red(
              `Not indexed: ` + app.notIndexCounter + `\n`
            )}`
          )
        } else {
          app.getUrls()
        }
      })
    }
  }

  // Start the app init function
  return app.init()
})()
