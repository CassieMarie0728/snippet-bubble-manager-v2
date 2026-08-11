type AuthListener = () => void;

const listeners = new Set<AuthListener>();

export function subscribeToAuthChanges(listener: AuthListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyAuthChanged() {
  listeners.forEach((listener) => listener());
}
