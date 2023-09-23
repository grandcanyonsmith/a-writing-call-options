import { lazy, Suspense } from "react";
import { BrowserRouter as Router, NavLink, Switch, Route, Redirect } from "react-router-dom";
import { Loader } from "components/loader";
import "./app.css";

const LazyLoadComponent = (component) => lazy(() => import(`pages/${component}`));

const PurchasePages = LazyLoadComponent("purchases");
const StockPages = LazyLoadComponent("stocks");
const StrikesPage = LazyLoadComponent("strikes");

export function App() {
  return (
    <div className="App">
      <Router>
        <nav id="main-nav">
          <div className="nav-row">
            <NavLink to="/stocks" className="column btn align-center" activeClassName="is-active">
              STOCKS
            </NavLink>
            <NavLink to="/purchases" className="column btn align-center" activeClassName="is-active">
              PURCHASES
            </NavLink>
          </div>
        </nav>
        <main role="main">
          <Suspense fallback={<Loader className="page-loader" />}>
            <Switch>
              <Route path="/purchases" component={PurchasePages} />
              <Route path="/stocks" component={StockPages} />
              <Redirect from="/" to="/stocks" exact />
              <Route component={StrikesPage} />
            </Switch>
          </Suspense>
        </main>
      </Router>
    </div>
  );
}