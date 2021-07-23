export async function retry(promiseFactory, retryCount, totalTries) {
  try {
    return await promiseFactory();
  } catch (error) {
    if (retryCount <= 0) {
      throw error;
    }
    totalTries = totalTries || retryCount
    await new Promise(r => setTimeout(r, (totalTries - retryCount) * 1000))
    return await retry(promiseFactory, retryCount - 1, totalTries);
  }
}

export function retriable(promiseFactory, retryCount, totalTries) {
  return async () => await retry(promiseFactory, retryCount, totalTries)
}
