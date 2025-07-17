import { combineReducers } from "redux";

import * as actionTypes from "./actionTypes";

const initialState = {
  error: null,
};

const error = (state = initialState.error, action) => {
  if (action.type === actionTypes.ERROR) {
    return action.error;
  } else {
    return state;
  }
};

const reducer = combineReducers({
  error,
});

export default reducer;
