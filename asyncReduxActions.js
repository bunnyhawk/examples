// EXAMPLE USAGE
// export const requestReturns = asyncAction({
//   baseName: 'REQUEST_RETURNS',
//   action: action => payload => dispatch => {
//     dispatch(action.start());
//     return http
//       .post(join(config.returnsUrl, 'search', 'v2'), payload)
//       .then(response => dispatch(action.success(response)))
//       .catch(error => dispatch(action.error({ error })));
//   }
// });

const identity = val => val;

export function createAction(type, payloadCreator, metaCreator) {
  const useIdentity = payloadCreator && payloadCreator.noPayload ? null : identity;
  const finalPayloadCreator = typeof payloadCreator === 'function' ? payloadCreator : useIdentity;

  const actionCreator = (...args) => {
    const hasError = args[0] instanceof Error;

    const action = {
      type
    };

    let payload = null;
    if (finalPayloadCreator !== null) {
      payload = hasError ? args[0] : finalPayloadCreator(...args);
    }
    if (!(payload === null || payload === undefined)) {
      action.payload = payload;
    }

    if (hasError || payload instanceof Error) {
      // Handle FSA errors where the payload is an Error object. Set error.
      action.error = true;
    }

    if (typeof metaCreator === 'function') {
      action.meta = metaCreator(...args);
    }

    return action;
  };

  actionCreator.toString = () => type.toString();
  actionCreator.type = type.toString();

  return actionCreator;
}

export function asyncAction(config) {
  const event = {
    name: config.baseName,
    start: `${config.baseName}_START`,
    success: `${config.baseName}_SUCCESS`,
    error: `${config.baseName}_ERROR`
  };

  const request = (type, error) => payload => ({
    type,
    payload,
    request: {
      id: config.baseName,
      error: error ? payload : null
    }
  });

  const dispatchers = {
    start: request(event.start),
    success: request(event.success),
    error: request(event.error,  true)
  };

  const action = config.action(dispatchers);

  action.event = event;

  return action;
}