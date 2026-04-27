const BASE_URL = "http://localhost:5000/api/v1";

// Token helpers

export const getToken = () => localStorage.getItem("eventura_token");

export const setToken = (token) => localStorage.setItem("eventura_token", token);

export const clearToken = () => localStorage.removeItem("eventura_token");

// Core fetch wrapper

/**
 * Makes an authenticated request to the Eventura API.
 *
 * @param {string} path      - e.g. "/auth/login"
 * @param {object} options   - same as fetch() options
 * @returns {Promise<any>}   - parsed JSON response
 * @throws {object}          - { status, error, message } on non-2xx
 */
async function request(path, options = {}) {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // No-content responses (e.g. some 204s) — return null
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : null;

  if (!res.ok) {
    // Normalise both error shapes from the API:
    //   { error, message }          — standard error
    //   { error, messages: {...} }  — validation error
    throw {
      status: res.status,
      error: data?.error || "Error",
      message: data?.message || null,
      messages: data?.messages || null,
    };
  }

  return data;
}

// Convenience methods 

const api = {
  get: (path, options = {}) =>
    request(path, { method: "GET", ...options }),

  post: (path, body, options = {}) =>
    request(path, { method: "POST", body: JSON.stringify(body), ...options }),

  put: (path, body, options = {}) =>
    request(path, { method: "PUT", body: JSON.stringify(body), ...options }),

  patch: (path, body, options = {}) =>
    request(path, { method: "PATCH", body: JSON.stringify(body), ...options }),

  delete: (path, options = {}) =>
    request(path, { method: "DELETE", ...options }),
};

export default api;

// Domain-specific API calls
// Grouped here so every file imports from one place instead of
// re-typing paths. Add new sections as phases are integrated.

// Auth
export const authApi = {
  signup: (body) => api.post("/auth/signup", body),
  login:  (body) => api.post("/auth/login", body),
  me:     ()     => api.get("/auth/me"),
};

// Event types
export const eventTypesApi = {
  list: () => api.get("/event-types"),
};

// Venues
export const venuesApi = {
  listAvailable: ()         => api.get("/venues"),
  listAll:       ()         => api.get("/venues/all"),
  get:           (id)       => api.get(`/venues/${id}`),
  create:        (body)     => api.post("/venues", body),
  update:        (id, body) => api.put(`/venues/${id}`, body),
  delete:        (id)       => api.delete(`/venues/${id}`),
};

// Themes
export const themesApi = {
  listActive: ()         => api.get("/themes"),
  listAll:    ()         => api.get("/themes/all"),
  create:     (body)     => api.post("/themes", body),
  update:     (id, body) => api.put(`/themes/${id}`, body),
  delete:     (id)       => api.delete(`/themes/${id}`),
};

// Packages
export const packagesApi = {
  events:      { list: () => api.get("/packages/events"),      create: (b) => api.post("/packages/events", b),      update: (id, b) => api.put(`/packages/events/${id}`, b),      delete: (id) => api.delete(`/packages/events/${id}`) },
  photography: { list: () => api.get("/packages/photography"), create: (b) => api.post("/packages/photography", b), update: (id, b) => api.put(`/packages/photography/${id}`, b), delete: (id) => api.delete(`/packages/photography/${id}`) },
  catering:    { list: () => api.get("/packages/catering"),    create: (b) => api.post("/packages/catering", b),    update: (id, b) => api.put(`/packages/catering/${id}`, b),    delete: (id) => api.delete(`/packages/catering/${id}`) },
};

// Bookings
export const bookingsApi = {
  create:       (body)                   => api.post("/bookings", body),
  my:           ()                       => api.get("/bookings/my"),
  all:          (status)                 => api.get(`/bookings/all${status ? `?status=${status}` : ""}`),
  conflicts:    ()                       => api.get("/bookings/conflicts"),
  slots:        (venue_id, meeting_date) => api.get(`/bookings/slots?venue_id=${venue_id}&meeting_date=${meeting_date}`),
  get:          (id)                     => api.get(`/bookings/${id}`),
  updateStatus: (id, status)             => api.patch(`/bookings/${id}/status`, { status }),
  getReview:    (id)                     => api.get (`/bookings/${id}/review`),
};

// Admin
export const adminApi = {
  stats:   ()        => api.get("/admin/stats"),
  revenue: (months)  => api.get(`/admin/revenue${months ? `?months=${months}` : ""}`),
};

// Chat
export const chatApi = {
  send: (messages) => api.post("/chat", { messages }),
};

// AI Recommendations
export const aiApi = {
  recommend: (payload) => request("/ai/recommend", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
};