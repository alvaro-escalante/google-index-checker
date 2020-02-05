// https://medium.com/@matthew_1129/axios-js-maximum-concurrent-requests-b15045eb69d0
const axios = require('axios')

module.exports = concurrent => {
  const MAX_REQUESTS_COUNT = concurrent
  const INTERVAL_MS = 10
  let PENDING_REQUESTS = 0

  // Create new axios instance
  const api = axios.create({})

  // Axios Request Interceptor
  api.interceptors.request.use(config => {
    return new Promise((resolve, reject) => {
      let interval = setInterval(() => {
        if (PENDING_REQUESTS < MAX_REQUESTS_COUNT) {
          PENDING_REQUESTS++
          clearInterval(interval)
          resolve(config)
        }
      }, INTERVAL_MS)
    })
  })

  // Axios Response Interceptor
  api.interceptors.response.use(
    response => {
      PENDING_REQUESTS = Math.max(0, PENDING_REQUESTS - 1)
      return Promise.resolve(response)
    },
    error => {
      PENDING_REQUESTS = Math.max(0, PENDING_REQUESTS - 1)
      return Promise.reject(error)
    }
  )

  return api
}
