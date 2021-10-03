// Required Modules
import 'dotenv/config'
import chalk from 'chalk' // Terminal and string styling
import { createWriteStream } from 'fs' // Node file system module
import { access } from 'fs/promises' // Promises Node file system module
import { parseCSV } from './lib/parser.js' // Convert csv to json module
import axios from 'axios' // Axios client
import { requestUrl, compareUrl } from './lib/url-encoder.js' // Encoding functions
import { timer } from './lib/timer.js' // Timer function
// Settings
const { yellow, cyan, white, red, green } = chalk
const start = Date.now() // Date counter to check duration of script
const site = 'https://www.google.com/search?q=' // Google search query
const urlsFile = './urls.csv' // File containing all the urls to check
const apiUrl = 'http://api.scraperapi.com/?api_key=' // ScraperAPI url
const apiKey = process.env.SCRAPERAPI_KEY

let totalUrls = 0
let notIndexCounter = 0
let instances = 0
let urls = []
// Check if file exist and count number of urls, if it does not exists, exit with message
;(async () => {
  try {
    await access(urlsFile)
    urls = await parseCSV(urlsFile)
    totalUrls = urls.length
    batchRequest()
  } catch {
    console.log(yellow('No urls.csv file found.'))
    process.exit()
  }
})()

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
      console.error('There is a problem connecting to Scraperapi')
      process.exit(1)
    }
  }
}

// Batch request with maximun according to account
async function batchRequest() {
  console.log(green('Requesting...'))
  instances = 1

  const data = [...urls]
  const concurrent = await getConcurrent()

  while (data.length) {
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const batch = data.splice(0, concurrent).map((url) => runRequest(url, urls.length))

    const results = await Promise.allSettled(batch)

    for (const { status, reason } of results) {
      if (status === 'rejected') data.push(reason)
    }
  }

  finalMessage()
}

// HTTP request async promise
async function runRequest(url, len) {
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
    const indexation = matchResponse(url, res.data, compare, utfEncoded)
      ? 'Indexed'
      : 'Not Indexed'
    // Print to terminal each url, its number and status code
    console.log(
      cyan(
        `Checking: ${instances++}/${len} ${url} ${green.bold(res.status)} ${white.bold(
          indexation
        )}`
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
  } catch (error) {
    // Request made and server responded
    const status = error.response ? error.response.status : 500

    // Log with different color to highlight the error
    console.error(yellow(`Error: ${url} ${red(status)} ${green('Repeating')}`))

    throw url
  }
}

// Compare url against google response url
function matchResponse(url, res, compare, utfEncoded) {
  let matchURL = false

  if (url.includes(`'`)) {
    matchURL = res.includes(`href="${compare}"`) | res.includes(`href="${utfEncoded}"`)
  } else {
    matchURL = res.includes(`href="${compare}"`)
  }

  // Counter foreach not index
  if (!matchURL) notIndexCounter += 1

  return matchURL
}

function finalMessage() {
  console.log(
    `\n${totalUrls} URLS, results.csv file successfully written in ${timer(
      Date.now() - start
    )}\n`
  )
  console.log(
    `${green.bold(`Indexed: ` + (totalUrls - notIndexCounter))}\n${red.bold(
      `Not indexed: ` + notIndexCounter + `\n`
    )}`
  )
}
