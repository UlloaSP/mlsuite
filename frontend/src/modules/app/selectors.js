const getModuleState = (state) => state.app;

export const getError = (state) => getModuleState(state).error;
