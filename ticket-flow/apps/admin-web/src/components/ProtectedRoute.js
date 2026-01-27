// apps/admin-web/src/components/ProtectedRoute.js

import React from "react";
import { Route, Redirect } from "react-router-dom";

/**
 * Закрывает доступ на приватные страницы.
 * Если `authed` = false — редиректит на /authentication/sign-in
 *
 * Важно: НЕ дергаем localStorage внутри render (в деве может давать дергание/оверлей).
 */
export default function ProtectedRoute({ component: Component, authed, ...rest }) {
  return (
    <Route
      {...rest}
      render={(props) => {
        if (!authed) {
          return (
            <Redirect
              to={{
                pathname: "/authentication/sign-in",
                state: { from: props.location },
              }}
            />
          );
        }

        return <Component {...props} />;
      }}
    />
  );
}