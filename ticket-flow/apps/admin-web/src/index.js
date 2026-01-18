import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "App";

// Vision UI Dashboard React Context Provider
import { VisionUIControllerProvider } from "context";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

// Ловим реальные причины крашей в дев-режиме (CRA overlay часто маскирует источник)
window.addEventListener("unhandledrejection", (event) => {
  // eslint-disable-next-line no-console
  console.error("[unhandledrejection]", event.reason);
});

window.addEventListener("error", (event) => {
  // eslint-disable-next-line no-console
  console.error("[window.error]", event.error || event.message);
});

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("[RootErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return null; // не роняем всё приложение оверлеем
    }
    return this.props.children;
  }
}

root.render(
  <BrowserRouter basename="/vision-ui-dashboard-react">
    <VisionUIControllerProvider>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </VisionUIControllerProvider>
  </BrowserRouter>
);