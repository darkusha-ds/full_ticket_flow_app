// apps/admin-web/src/utils/auth.js

const ACCESS_TOKEN_KEY = "accessToken";
const USER_KEY = "user";

function safeGet(storage, key) {
  try {
    return storage?.getItem ? storage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSet(storage, key, value) {
  try {
    if (storage?.setItem) storage.setItem(key, value);
  } catch {
    // ignore
  }
}

function safeRemove(storage, key) {
  try {
    if (storage?.removeItem) storage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * Получаем токен: сначала localStorage, потом sessionStorage
 */
export function getAccessToken() {
  const fromLocal = safeGet(window?.localStorage, ACCESS_TOKEN_KEY);
  if (fromLocal) return fromLocal;
  return safeGet(window?.sessionStorage, ACCESS_TOKEN_KEY);
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}

export function getStoredUser() {
  const raw =
    safeGet(window?.localStorage, USER_KEY) ||
    safeGet(window?.sessionStorage, USER_KEY);

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Сохраняем токен + user в localStorage или sessionStorage
 */
export function saveAuth({ accessToken, user, rememberMe }) {
  clearAuth();

  const storage = rememberMe ? window?.localStorage : window?.sessionStorage;

  if (accessToken) safeSet(storage, ACCESS_TOKEN_KEY, accessToken);
  if (user) safeSet(storage, USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  safeRemove(window?.localStorage, ACCESS_TOKEN_KEY);
  safeRemove(window?.localStorage, USER_KEY);
  safeRemove(window?.sessionStorage, ACCESS_TOKEN_KEY);
  safeRemove(window?.sessionStorage, USER_KEY);
}

/**
 * Добавляет Authorization header если токен есть
 */
export function authHeaders(extra = {}) {
  const token = getAccessToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}