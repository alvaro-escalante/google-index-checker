// Required Modules
import 'dotenv/config'
import chalk from 'chalk' // Terminal and string styling
import axios from 'axios' // Axios client
import { createWriteStream, writeFileSync } from 'fs' // Node file system module
import { access } from 'fs/promises' // Promises Node file system module
import { parseCSV } from './lib/parser.js' // Convert csv to json module
import { googlelify, encodeURL } from './lib/url-encoder.js' // Encoding functions
import { timer } from './lib/timer.js' // Timer function
import { batchRequest } from './lib/batchRequest.js'
import sanitizeHtml from 'sanitize-html'

// Settings
const { yellow, cyan, white, red, green } = chalk
const start = Date.now() // Date counter to check duration of script
const site = 'https://www.google.com/search?q=' // Google search query
const urlsFile = './urls.csv' // File containing all the urls to check
const apiUrl = 'http://api.scraperapi.com/?api_key=' // ScraperAPI url
const params = '&device_type=desktop'
const apiKey = process.env.SCRAPERAPI_KEY

let count = 1
let notIndexedCounter = 0
let urls = []
let errors = []
let len = 0

// Collect URLS, get max Concurrent and run request in pool
;(async () => {
  urls = await getUrls()
  len = urls.length
  const maxConcurrent = await getConcurrent()

  await batchRequest(maxConcurrent, urls, runRequest)

  while (errors.length) {
    urls = errors
    errors = []
    await batchRequest(maxConcurrent, urls, runRequest)
  }

  finalMessage(len)
})()

// Gather URLS from file
async function getUrls() {
  try {
    await access(urlsFile)
    return await parseCSV(urlsFile)
  } catch {
    console.log(yellow('No urls.csv file found.'))
    process.exit(1)
  }
}

// Connect to API to get allowed number of concurrent requests
async function getConcurrent() {
  try {
    const { data } = await axios(`http://api.scraperapi.com/account?api_key=${apiKey}`)
    return data.concurrencyLimit
  } catch (error) {
    if (error.response) {
      throw new Error(
        `${error.response.status} - Incorrect or missing API key please check your APIKEY.js file and make sure it includes a correct API key from https://www.scraperapi.com/`
      )
    } else {
      console.error('There is a problem connecting to Scraperapi, please try again later')
      process.exit()
    }
  }
}

// HTTP request async
async function runRequest(url) {
  try {
    // Prepare url to search like google does
    const requestUrl = googlelify(url)

    // HTTP request using axios, scraperapi, google and the enconded url
    const { data, status } = await axios(
      `${apiUrl}${apiKey}&url=${site}${requestUrl}${params}`
    )

    // Check if it matches google search results
    const indexation = matchResponse(url, data)

    // Print to terminal each url, its number and status code
    const counter = `${count++}/${len}`
    const statusPrint = green.bold(status)
    const indexPrint = white.bold(indexation)

    console.log(cyan(`Checking: ${counter} ${url} ${statusPrint} ${indexPrint}`))

    // Create, append and clear stream
    const stream = createWriteStream('./results.csv', { flags: 'a', encoding: 'utf8' })

    // Append evaluation from response to file
    stream.write(`${url}, ${indexation}\n`)
    // End stream to avoid accumulation
    stream.end()
  } catch (error) {
    // Request made and server responded
    const status = error.response ? error.response.status : 500

    if (status === 429) {
      console.error('Too many request, something went wrong check with SpaperAPI')
      process.exit(1)
    }

    if ([500, 501, 502, 503, 504].includes(status)) {
      // Log with different color to highlight the error
      console.error(yellow(`Error: ${url} ${red(status)} ${green('Re-trying')}`))
      errors.push(url)
    }
  }
}

// Compare url against google response url
function matchResponse(url, res) {
  // Look for a tags with href attribute only
  const content = sanitizeHtml(res, {
    allowedTags: ['a'],
    allowedAttributes: { a: ['href'] }
  })

  // Set not index to start
  let indexResult = 'Not Indexed'

  // If the encoded version of the URL is on google
  if (content.includes(`href="${encodeURL(url)}"`)) {
    indexResult = 'Indexed'
  } else {
    notIndexedCounter += 1
  }

  return indexResult
}

function finalMessage(totalUrls) {
  console.log(
    `\n${totalUrls} URLS, results.csv file successfully written in ${timer(
      Date.now() - start
    )}\n`
  )
  console.log(
    `${green.bold(`Indexed: ` + (totalUrls - notIndexedCounter))}\n${red.bold(
      `Not indexed: ` + notIndexedCounter + `\n`
    )}`
  )
}
