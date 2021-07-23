import { lazy } from "react"
import { Switch, Route, useRouteMatch } from "react-router-dom"

const StocksIndexPage = lazy(() => import("pages/stocks/index").then(module => ({ default: module.StocksIndexPage })))
const StocksShowPage = lazy(() => import("pages/stocks/show").then(module => ({ default: module.StocksShowPage })))

export function StockPages() {
  const { path } = useRouteMatch()

  return (
    <Switch>
      <Route path={`${path}/:ticker`} component={StocksShowPage} />
      <Route path={path} component={StocksIndexPage} />
    </Switch>
  );
}
