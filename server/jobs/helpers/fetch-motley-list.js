import { debugWorker as debug, error } from "../../common/debug.js"

const loginUrl = "https://www.fool.com/secure/login.aspx",
      screenerUrl = "https://www.fool.com/premium/screener/"

export async function fetchMotleyList(page) {
  debug("Loading Motley Login")

  // go to the login page
  await page.goto(loginUrl)
  await page.waitForSelector("#usernameOrEmail")

  debug("Filling Out Motley Login Form")

  await page.type("#usernameOrEmail", process.env.MOTLEY_USERNAME);
  await page.type("#password", process.env.MOTLEY_PASSWORD);

  const loginPromise = page.waitForNavigation({ timeout: 60000 })

  await page.click("#btn-login")

  debug("Waiting for Navigation")

  try {
    await loginPromise
  } catch(err) {
    error(err)
    debug(await page.content())
  }

  debug("Loading Screener Table")

  // go to the screener (target) page
  await page.goto(screenerUrl);

  await page.waitForSelector("#scorecard-table-universe", { timeout: 45000 })

  debug("Evaluating Stock List")

  const stocks = await page.evaluate(() => {
    function getNumber(value) {
      return `${value || 0.0}`.replace(/[^0-9.]/g, "")
    }

    //Extract each row's basic details
    const table = document.getElementById("scorecard-table-universe"),
          data = [],
          headers = [ ...table.querySelector("thead tr").querySelectorAll("th") ].map(th => th.dataset.name),
          rows = [ ...table.querySelectorAll("tbody tr") ].map((cell) => [ ...cell.querySelectorAll("td") ].map((td) => td.innerText))

    for(const row of rows) {
      const object = {}

      const findValue = (str) => {
        str = String(str || "").split("\n").find(ln => ln.replace(/\s*/g, ""))
        return String(str || "").replace(/^\s*|\s*$/g, "")
      }

      for(let i = 0; i < headers.length; i++) {
        switch (headers[i]) {
          case "rank":
            row[i] = parseInt(getNumber(findValue(row[i])))
            break
          case "company":
            row[i] = findValue(row[i])
            break
          case "ticker":
            row[i] = findValue(row[i]).toUpperCase()
            break
          case "prosocial":
            row[i] = findValue(row[i]).toLowerCase() === "yes"
            break
          case "asset-class":
          case "volatility":
          case "services":
            row[i] = findValue(row[i]).toLowerCase()
            break
          case "dividend-yield":
          case "glass-door":
          case "price":
          case "revenue-growth":
            row[i] = parseFloat(getNumber(findValue(row[i])) || 0.0)
            break
          default:
            continue;
        }

        object[headers[i].replace(/-/g, "_")] = row[i]
      }

      data.push(object)
    }

    return data
  });

  return stocks
}
