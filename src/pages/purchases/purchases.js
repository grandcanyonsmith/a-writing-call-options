import { lazy } from "react"
import { Switch, Route, useRouteMatch } from "react-router-dom"

const PurchasesIndexPage = lazy(() => import("pages/purchases/index").then(module => ({ default: module.PurchasesIndexPage })))

export function PurchasePages() {
  const { path } = useRouteMatch()

  return (
    <Switch>
      <Route path={path} component={PurchasesIndexPage} />
    </Switch>
  );
}
