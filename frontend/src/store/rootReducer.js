import { combineReducers } from "redux";
import app from "../modules/app";

const rootReducer = combineReducers({
  app: app.reducer,
});

export default rootReducer;
