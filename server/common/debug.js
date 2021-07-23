import createDebug from "debug"

export const logger = createDebug("stockscraper")
export const debugServer = logger.extend("server")
export const debugWorker = logger.extend("worker")
export const error = logger.extend("error")

logger.log = console.log.bind(console)
debugServer.log = console.info.bind(console)
debugWorker.log = console.info.bind(console)

