import { configureStore } from "@reduxjs/toolkit";

import rootReducer from "./rootReducer";

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["project/app/error"],
        ignoredPaths: ["app.error"],
      },
    }),
});

export default store;
