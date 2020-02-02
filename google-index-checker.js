// Required Modules
const ck = require('chalk') // Terminal and string styling
const fs = require('fs') // Node file system module
const csv = require('csvtojson') // Convert csv to json module
const axios = require('./lib/axios-queue')(10) // Axios concurrent limit set to 10
const { requestUrl, compareUrl } = require('./lib/url-encoder') // Encoding functions
const { timer } = require('./lib/timer') // Encoding functions
// Settings
const start = Date.now() // Date counter to check duration of script
const site = 'https://www.google.com/search?q=' // Google search query
const urls = './urls.csv' // File containing all the urls to check
const apiUrl = 'http://api.scraperapi.com/?api_key=' // Scrapeapi url
const { apiKey } = require('./APIKEY') // Scrapeapi key

;(() => {
  const app = {
    totalUrls: 0,
    notIndexCounter: 0,

    // Check if file exist and count urls, if it does not exists, exit with message
    init: async () => {
      if (fs.existsSync(urls)) {
        // Store the total amount of urls
        const data = await csv({ noheader: true, output: 'line' }).fromFile(urls)
        app.totalUrls = data.filter(url => url.length !== 0).length
        app.getUrls()
      } else {
        console.log(ck.yellow('No urls.csv file found.'))
        process.exit()
      }
    },

    // Initial request converts the `urls` list into an array and runs the request
    getUrls: async () => {
      // Counter to keep track of current number being checked
      app.num = 1
      // Convert the csv to an array from `urls`
      let data = await csv({ noheader: true, output: 'line' }).fromFile(urls)
      // Filter csv empty lines
      data = data.filter(url => url.length !== 0)
      // Store promises for concurrent requests
      const promises = data.map((url, index) => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(app.runRequest(url, data.length))
          }, index * 10)
        })
      })
      // When resolved check for errors
      await Promise.all(promises).then(() => setTimeout(() => app.checkErrors(), 1000))
    },

    // HTTP request async promise
    runRequest: async (url, len) => {
      // Make requests with encoded URL through axios with header options and write it to results
      try {
        const request = requestUrl(url) // URL encoded for request
        const compare = compareUrl(url, false) // URL encoded to check indexation
        const utfEncoded = compareUrl(url, true) // URL encoded for discrepancies

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
        //
      } catch (err) {
        // When there is an error write it to errors.csv or exceptions.csv
        let msg = ''
        // Send status
        if (err.response) {
          if (err.response.status === 401) {
            console.log(
              ck.yellow(`No scraperapi key found, please add your key in the APIKEY.js file\n`)
            )
            process.exit()
          } else msg = err.response.status
        }
        // The request was made but no response was received
        else if (err.request) msg = err.request.res.statusCode
        // Something happened in setting up the request and triggered an Error
        else {
          app.notIndexCounter += 1
          msg = 'Exception'
        }
        // Log with different color to highlight the error
        console.log(ck.yellow(`Checking: ${app.num++}/${len} ${url} ${ck.red(msg)}`))
        // Create append stream
        const errorStream = fs.createWriteStream(
          msg === 'Exception' ? './exceptions.csv' : './errors.csv',
          { flags: 'a', encoding: 'utf8' }
        )
        // Append to file
        errorStream.write(`${url}\n`)
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

    // Remove url.csv rename it to errors to urls.csv and run request again
    checkErrors: () => {
      // If there's no erros.csv finish and log duration
      if (fs.existsSync('./errors.csv')) {
        fs.renameSync('./errors.csv', urls)
        app.getUrls()
      } else {
        fs.unlinkSync(urls)
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
      }
    }
  }

  // Start the app init function
  return app.init()
})()
