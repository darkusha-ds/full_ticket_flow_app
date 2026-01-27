import { useState, useEffect, useMemo } from "react";

// react-router components
import { Route, Switch, Redirect, useLocation } from "react-router-dom";
import ProtectedRoute from "components/ProtectedRoute";
import { isAuthenticated } from "utils/auth";

// @mui material components
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Icon from "@mui/material/Icon";

// Vision UI Dashboard React components
import VuiBox from "components/VuiBox";

// Vision UI Dashboard React example components
import Sidenav from "examples/Sidenav";
import Configurator from "examples/Configurator";

// Vision UI Dashboard React themes
import theme from "assets/theme";
import themeRTL from "assets/theme/theme-rtl";

// RTL plugins
import rtlPlugin from "stylis-plugin-rtl";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";

// Vision UI Dashboard React routes
import routes from "routes";

// Vision UI Dashboard React contexts
import { useVisionUIController, setMiniSidenav, setOpenConfigurator } from "context";

export default function App() {
  const [controller, dispatch] = useVisionUIController();
  const { miniSidenav, direction, layout, openConfigurator, sidenavColor } = controller;
  const [onMouseEnter, setOnMouseEnter] = useState(false);
  const [rtlCache, setRtlCache] = useState(null);
  const { pathname } = useLocation();

  const safeIsAuthed = () => {
    try {
      return isAuthenticated();
    } catch {
      return false;
    }
  };

  const [authed, setAuthedState] = useState(() => safeIsAuthed());

  // Cache for the rtl
  useMemo(() => {
    const cacheRtl = createCache({
      key: "rtl",
      stylisPlugins: [rtlPlugin],
    });

    setRtlCache(cacheRtl);
  }, []);

  // Open sidenav when mouse enter on mini sidenav
  const handleOnMouseEnter = () => {
    if (miniSidenav && !onMouseEnter) {
      setMiniSidenav(dispatch, false);
      setOnMouseEnter(true);
    }
  };

  // Close sidenav when mouse leave mini sidenav
  const handleOnMouseLeave = () => {
    if (onMouseEnter) {
      setMiniSidenav(dispatch, true);
      setOnMouseEnter(false);
    }
  };

  // Change the openConfigurator state
  const handleConfiguratorOpen = () => setOpenConfigurator(dispatch, !openConfigurator);

  // Setting the dir attribute for the body element
  useEffect(() => {
    document.body.setAttribute("dir", direction);
  }, [direction]);

  // Setting page scroll to 0 when changing the route
  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.scrollingElement.scrollTop = 0;
  }, [pathname]);

  // Re-check auth on route changes (avoid crashing render if storage is blocked)
  useEffect(() => {
    setAuthedState(safeIsAuthed());
  }, [pathname]);

  // Also react to storage updates from other tabs
  useEffect(() => {
    const onStorage = () => setAuthedState(safeIsAuthed());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const getRoutes = (allRoutes) =>
    allRoutes.map((route) => {
      if (route.collapse) {
        return getRoutes(route.collapse);
      }

      if (!route.route) return null;

      // If user is NOT authenticated:
      // - block protected routes
      // If user IS authenticated:
      // - optionally redirect away from public auth pages (sign-in / sign-up)
      if (route.protected) {
        return (
          <ProtectedRoute
            exact
            path={route.route}
            authed={authed}
            component={route.component}
            key={route.key}
          />
        );
      }

      if (route.public) {
        const PublicComponent = route.component;

        return (
          <Route
            exact
            path={route.route}
            key={route.key}
            render={(props) => {
              if (authed) {
                return <Redirect to="/dashboard" />;
              }
              return <PublicComponent {...props} />;
            }}
          />
        );
      }

      const Component = route.component;
      return <Route exact path={route.route} key={route.key} render={(props) => <Component {...props} />} />;
    });

  const configsButton = (
    <VuiBox
      display="flex"
      justifyContent="center"
      alignItems="center"
      width="3.5rem"
      height="3.5rem"
      bgColor="info"
      shadow="sm"
      borderRadius="50%"
      position="fixed"
      right="2rem"
      bottom="2rem"
      zIndex={99}
      color="white"
      sx={{ cursor: "pointer" }}
      onClick={handleConfiguratorOpen}
    >
      <Icon fontSize="default" color="inherit">
        settings
      </Icon>
    </VuiBox>
  );

  return direction === "rtl" ? (
    <CacheProvider value={rtlCache}>
      <ThemeProvider theme={themeRTL}>
        <CssBaseline />
        {layout === "dashboard" && authed && (
          <>
            <Sidenav
              color={sidenavColor}
              brand=""
              brandName="VISION UI FREE"
              routes={authed ? routes.filter((r) => !r.public) : routes.filter((r) => !r.protected)}
              onMouseEnter={handleOnMouseEnter}
              onMouseLeave={handleOnMouseLeave}
            />
            <Configurator />
            {configsButton}
          </>
        )}
        {layout === "vr" && <Configurator />}
        <Switch>
          {getRoutes(routes)}
          <Redirect from="*" to={authed ? "/dashboard" : "/authentication/sign-in"} />
        </Switch>
      </ThemeProvider>
    </CacheProvider>
  ) : (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {layout === "dashboard" && authed && (
        <>
          <Sidenav
            color={sidenavColor}
            brand=""
            brandName="VISION UI FREE"
            routes={authed ? routes.filter((r) => !r.public) : routes.filter((r) => !r.protected)}
            onMouseEnter={handleOnMouseEnter}
            onMouseLeave={handleOnMouseLeave}
          />
          <Configurator />
          {configsButton}
        </>
      )}
      {layout === "vr" && <Configurator />}
      <Switch>
        {getRoutes(routes)}
        <Redirect from="*" to={authed ? "/dashboard" : "/authentication/sign-in"} />
      </Switch>
    </ThemeProvider>
  );
}
