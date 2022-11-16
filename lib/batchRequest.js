// Pool request // https://www.npmjs.com/package/tiny-async-pool
export async function batchRequest(poolLimit, array, iteratorFn) {
  const promises = []
  const racers = new Set()

  for (const item of array) {
    const pro = Promise.resolve().then(() => iteratorFn(item, array))
    promises.push(pro)
    racers.add(pro)
    const clean = () => racers.delete(pro)

    pro.then(clean).catch(clean)

    if (racers.size >= poolLimit) await Promise.race(racers)
  }

  await Promise.all(promises)
}
