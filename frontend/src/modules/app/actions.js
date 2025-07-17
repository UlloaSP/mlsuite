import * as actionTypes from "./actionTypes";

export const error = (error) => ({
  type: actionTypes.ERROR,
  error,
});
