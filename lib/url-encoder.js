// Encode URL as google does by removing quotes or their encoded version
module.exports.requestUrl = url => {
  // DecodeURI if not malformed
  try {
    url = decodeURI(url)
  } catch (error) {
    url = url
  }

  // Encode the whole url for google search
  url = encodeURIComponent(url)

  return url
    .replace(/^%22|\%22$/g, '') // Remove the csv " if any
    .replace(/%20/g, '+') // Replace space with `+`, google treats them as spaces
    .replace(/#!/g, '%23!') // Encode # only for Shebang urls
}

// The URL used to compare against google source code
module.exports.compareUrl = (url, utfChar) => {
  // We got a url that already has encoding so return as it is
  if (url.includes('%')) {
    url = url.replace(/ /g, '%20')
    url = url.replace(/^\"|\"$/, '').replace(/\"/g, '%22')
  } else {
    // We got a clean url that needs encoding
    url = encodeURI(url)
    // We have a list of reserve characters we need to un-encode
    const reserve = { '%5B': '[', '%5D': ']' }
    // We create a regex for those reserve characters
    const regex = new RegExp(Object.keys(reserve).join('|'), 'g')
    // And replace only those present
    url = url.replace(regex, match => reserve[match]).replace(/^%22|%22$/g, '')
  }

  // Create a different url for servers that encode apostophe
  if (utfChar) url = url.replace(/\'/g, '%27')

  // Covert & to &amp;
  return url.replace(/&/g, '&amp;')
}
