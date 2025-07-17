import { IntlProvider } from "react-intl";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import "./index.css";

import { initReactIntl } from "../src/i18n";
import backend, { NetworkError } from "./backend";
import app, { App } from "./modules/app";
import store from "./store";
import { BrowserRouter } from "react-router-dom";

backend.init(() => store.dispatch(app.actions.error(new NetworkError())));

const { locale, messages } = initReactIntl();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <IntlProvider locale={locale} messages={messages}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </IntlProvider>
    </Provider>
  </StrictMode>
);
