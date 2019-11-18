// EXAMPLE USAGE
// import { http } from './http';
// return http
//         .post(join(url, 'search', 'v2'), payload)
//         .then(response => dispatch(action.success(response)))
//         .catch(error => dispatch(action.error({ error })));

import fetch from './fetch';

const globalHeaders = {};

export function setGlobalHeader(name, value) {
  globalHeaders[name] = value;
}

export function encodeQuery(params) {
  return encodeURIComponent(JSON.stringify(params));
}

function processError(r, contentType) {
  if (contentType && contentType.startsWith('application/json')) {
    return r.json().then(res => {
      throw new Error(
        res
          // ERROR_CODE::Response message here
          ? r.status.toString().concat('::').concat(res.message)
          : r.status
      );
    });
  }
  throw new Error();
}

function processResponse(r) {
  const contentType = r.headers.get('content-type');

  if (!r.ok) {
    return processError(r, contentType);
  }
  if (contentType) {
    if (contentType.startsWith('application/json')) {
      return r.json();
    } else if (contentType.startsWith('text/plain')) {
      return r.text();
    } else if (
      contentType === 'application/octet-stream' ||
      contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      return r.blob();
    }
  }

  return r;
}

export default {
  post(url, payload, headers) {
    return fetch(url, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, globalHeaders, headers),
      body: JSON.stringify(payload)
    }).then(processResponse);
  },
  get(url) {
    return fetch(url, {
      headers: globalHeaders
    }).then(processResponse);
  },
  delete(url, payload) {
    return fetch(url, {
      method: 'DELETE',
      headers: globalHeaders,
      body: JSON.stringify(payload)
    }).then(processResponse);
  },
  put(url, payload, headers) {
    return fetch(url, {
      method: 'PUT',
      headers: Object.assign({ 'Content-Type': 'application/json' }, globalHeaders, headers),
      body: JSON.stringify(payload)
    }).then(processResponse);
  }
};
