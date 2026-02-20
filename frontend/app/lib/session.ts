export const TOKEN_STORAGE_KEY = 'insights_engine_bearer_token';

export const getStoredToken = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? '';
};

export const setStoredToken = (token: string): void => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

export const clearStoredToken = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
};
