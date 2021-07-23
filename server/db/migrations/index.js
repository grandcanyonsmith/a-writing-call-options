const path = require("path")
const fs = require("fs")

const files = fs.readdirSync(__dirname)
                .sort()
                .filter(file => /[0-9]+-.*.js/.test(file))
                .map(file => {
                  const mod = require(path.resolve(__dirname, file)),
                        [ key ] = file.split("-")
                  return [ file, key, mod ]
                })

module.exports = {
  files
}
