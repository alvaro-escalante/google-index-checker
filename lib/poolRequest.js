// Pool request
export async function poolRequest(poolLimit, array, iteratorFn, exception) {
  const promises = []
  const racers = []

  for (const item of array) {
    const pro = Promise.resolve().then(() => iteratorFn(item, array))
    promises.push(pro)

    if (poolLimit <= array.length) {
      const racer = pro.then(() => racers.splice(racers.indexOf(racer), 1))
      racers.push(racer)
      if (racers.length >= poolLimit) {
        await Promise.race(racers).catch((err) => console.log(err))
      }
    }
  }

  const results = await Promise.allSettled(promises)

  for (const { status, reason } of results) {
    if (status === 'rejected') {
      const { name, error } = reason
      if (name === exception) {
        await poolRequest(poolLimit, [error], iteratorFn, 'timeout')
      }
    }
  }
}
