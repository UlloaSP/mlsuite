import NetworkError from "./NetworkError";

const SERVICE_TOKEN_NAME = "serviceToken";

let networkErrorCallback;
let reauthenticationCallback;

const isJson = (response) => {
  const contentType = response.headers.get("content-type");

  return contentType && contentType.indexOf("application/json") !== -1;
};

const handleOkResponse = (response, onSuccess) => {
  if (!response.ok) {
    return false;
  }

  if (!onSuccess) {
    return true;
  }

  if (response.status === 204) {
    onSuccess();
    return true;
  }

  if (isJson(response)) {
    response.json().then((payload) => onSuccess(payload));
  }

  return true;
};

const handle4xxResponse = (response, onErrors) => {
  if (response.status < 400 || response.status >= 500) {
    return false;
  }

  if (response.status === 401 && reauthenticationCallback) {
    reauthenticationCallback();
    return true;
  }

  if (!isJson(response)) {
    throw new NetworkError();
  }

  if (onErrors) {
    response.json().then((payload) => {
      if (payload.globalError || payload.fieldErrors) {
        onErrors(payload);
      }
    });
  }

  return true;
};

const handleResponse = (response, onSuccess, onErrors) => {
  if (handleOkResponse(response, onSuccess)) {
    return;
  }

  if (handle4xxResponse(response, onErrors)) {
    return;
  }

  throw new NetworkError();
};

export const init = (callback) => (networkErrorCallback = callback);

export const setReauthenticationCallback = (callback) =>
  (reauthenticationCallback = callback);

export const setServiceToken = (serviceToken) =>
  sessionStorage.setItem(SERVICE_TOKEN_NAME, serviceToken);

export const getServiceToken = () => sessionStorage.getItem(SERVICE_TOKEN_NAME);

export const removeServiceToken = () =>
  sessionStorage.removeItem(SERVICE_TOKEN_NAME);

export const config = (method, body) => {
  const config = {
    method: method,
  };

  if (body) {
    if (body instanceof FormData) {
      config.body = body;
    } else {
      config.headers = { "Content-Type": "application/json" };
      config.body = JSON.stringify(body);
    }
  }

  const serviceToken = getServiceToken();

  if (serviceToken) {
    if (config.headers) {
      config.headers["Authorization"] = `Bearer ${serviceToken}`;
    } else {
      config.headers = { Authorization: `Bearer ${serviceToken}` };
    }
  }

  return config;
};

export const appFetch = (path, options, onSuccess, onErrors) =>
  fetch(`${import.meta.env.VITE_BACKEND_URL}${path}`, options)
    .then((response) => handleResponse(response, onSuccess, onErrors))
    .catch(networkErrorCallback);
