/**
 * Module dependencies.
 */
import { default as path, dirname } from "path"
import { fileURLToPath } from "url"
import http from "http"
import createError from "http-errors"
import express from "express"
import cookieParser from "cookie-parser"
import logger from "morgan"
import { purchasesRoutes } from "./routes/purchases.js"
import { stocksRoutes } from "./routes/stocks.js"
import { strikesRoutes } from "./routes/strikes.js"
import { debugServer as debug, error } from "./common/debug.js"

const app = express()
const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
  var port = parseInt(val, 10)

  if (isNaN(port)) {
    // named pipe
    return val
  }

  if (port >= 0) {
    // port number
    return port
  }

  return false
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
  if (error.syscall !== "listen") {
    throw error
  }

  const bind = typeof port === "string"
    ? `Pipe ${port}`
    : `Port ${port}`

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case "EACCES":
      error(`${bind} requires elevated privileges`)
      process.exit(1)
      break
    case "EADDRINUSE":
      error(`${bind} is already in use`)
      process.exit(1)
      break
    default:
      throw error
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  const addr = server.address()
  const bind = typeof addr === "string"
    ? `pipe ${addr}`
    : `port ${addr.port}`

  debug(`Listening on ${bind}`)
}

// view engine setup
app.set("views", path.join(__dirname, "views"))
app.set("view engine", "jade")

app.use(logger("dev"))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, "build")))
express.static.mime.define({ "application/octet-stream": [ "csv" ] })

app.use("/api/purchases", purchasesRoutes)
app.use("/api/stocks", stocksRoutes)
app.use("/api/strikes", strikesRoutes)

app.get("/ping", function (req, res) {
 return res.send("pong")
})

app.get("/*", function (req, res) {
  res.sendFile(path.join(__dirname, "build", "index.html"))
})

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404))
})

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get("env") === "development" ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render("error")
})

/**
 * Get port from environment and store in Express.
 */
const port = normalizePort(process.env.PORT || 5000)
app.set("port", port)

/**
 * Create HTTP server.
 */
const server = http.createServer(app)

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port)
server.on("error", onError)
server.on("listening", onListening)
