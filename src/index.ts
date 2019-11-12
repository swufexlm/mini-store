import deepmerge from 'deepmerge';

export interface Store<S, D> {
  getId(): string;
  setState: (partial: Partial<S>) => void;
  getState: () => S | undefined;
  subscribe: (
    listener: (newState?: S, oldState?: S) => void,
    type?: keyof S | ((key: keyof S) => boolean),
  ) => () => void;
  setData: (partial: Partial<D>) => void;
  getData: () => D | undefined;
}

function nextId() {
  const timestamp = new Date().getTime();
  const random = parseInt(`${Math.random() * (9999 - 1000 + 1) + 1000}`, 10);
  return `${timestamp}${random}`;
}

export default function createStore<S, D>(
  initialState?: S,
  initalData?: D,
): Store<S, D> {
  let state = initialState;
  let data = initalData;
  const id = nextId();
  const all = '__all__';
  const listeners: {
    [key: string]: any[];
  } = {};

  const functionListeners: Array<{
    func: (key: keyof S) => boolean;
    listener: (newState?: S, oldState?: S) => any;
  }> = [];

  function call(
    listeners: Array<(newState?: S, oldState?: S) => any>,
    newState?: S,
    oldState?: S,
  ) {
    if (listeners && listeners.length) {
      for (let i = 0; i < listeners.length; i++) {
        listeners[i](newState, oldState);
      }
    }
  }

  function setState(partial: Partial<S>) {
    if (partial) {
      const oldState = state;
      state = deepmerge.all([state || {}, partial]) as any;
      const funcs: Array<() => any> = [];
      Object.keys(partial).forEach(key => {
        if (!oldState || (oldState && partial[key] !== oldState[key])) {
          if (listeners[key]) {
            call(listeners[key], state, oldState);
          }
          functionListeners.forEach(item => {
            if (item.func(key as keyof S) && funcs.indexOf(item.listener) < 0) {
              funcs.push(item.listener);
            }
          });
        }
      });
      if (listeners[all]) {
        call(listeners[all], state, oldState);
      }
      if (funcs.length) {
        call(funcs, state, oldState);
      }
    }
  }

  function getState() {
    return state;
  }

  function subscribe(
    listener: (newState?: S, oldState?: S) => any,
    type?: keyof S | ((key: keyof S) => boolean),
  ) {
    if (typeof type === 'function') {
      const funcModel = { func: type, listener };
      functionListeners.push(funcModel);
      return function unsubscribe() {
        const index = functionListeners.indexOf(funcModel);
        functionListeners.splice(index, 1);
      };
    } else {
      const key = (type as string) || all;
      listeners[key] = listeners[key] || [];
      listeners[key].push(listener);

      return function unsubscribe() {
        const thisListners = listeners[key];
        const index = thisListners.indexOf(listener);
        thisListners.splice(index, 1);
      };
    }
  }

  function setData(partial: Partial<D>) {
    data = Object.assign({}, data, partial);
  }

  function getData() {
    return data;
  }

  function getId() {
    return id;
  }

  return {
    setState,
    getState,
    subscribe,
    setData,
    getData,
    getId,
  };
}
