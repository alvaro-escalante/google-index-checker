// Pool request // https://www.npmjs.com/package/tiny-async-pool
export async function batchRequest(poolLimit, array, iteratorFn, exception) {
  const promises = []
  const racers = new Set()

  // For each item create promises
  for (const item of array) {
    // Start with creating an iteratorFn promise for each item
    const pro = Promise.resolve().then(() => iteratorFn(item, array))
    // Store the promises
    promises.push(pro)
    racers.add(pro)
    const clean = () => racers.delete(pro)

    pro.then(clean).catch(clean)

    if (racers.size >= poolLimit) await Promise.race(racers)
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
