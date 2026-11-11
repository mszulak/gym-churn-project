export const SESSION_COOKIE_NAME = "session_token";

export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export const AUTH_ROUTES = {
  login: "/login",
  register: "/register",
  signout: "/auth/signout",
  home: "/",
  dashboard: "/dashboard",
} as const;
