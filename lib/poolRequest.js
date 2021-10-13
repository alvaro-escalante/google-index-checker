// Pool request // https://www.npmjs.com/package/tiny-async-pool
export async function poolRequest(poolLimit, array, iteratorFn, exception) {
  const promises = []
  const racers = []

  // For each item create promises
  for (const item of array) {
    // Start with creating an iteratorFn promise for each item
    const pro = Promise.resolve().then(() => iteratorFn(item, array))
    // Store the promises
    promises.push(pro)

    // As long as the limit is bellow the length of the array
    if (poolLimit <= array.length) {
      // Take one promise
      const racer = pro
        .then(() => racers.splice(racers.indexOf(racer), 1))
        .catch(() => racers.splice(racers.indexOf(racer), 1))
      racers.push(racer)
      if (racers.length >= poolLimit) await Promise.race(racers)
    }
  }

  const results = await Promise.allSettled(promises)

  // Collect errors rejected by iteratorFn,
  const rejected = results
    .filter(({ status, reason }) => status === 'rejected' && reason.name === exception)
    .map(({ reason }) => reason.error)

  if (rejected.length) {
    await poolRequest(poolLimit, rejected, iteratorFn, exception)
  }
}
