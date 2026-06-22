import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({ baseURL: API_URL });

// แนบ token ทุก request อัตโนมัติ
api.interceptors.request.use(config => {
  const token = localStorage.getItem('smile_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authAPI = {
  loginWithLine: (accessToken, profile) => api.post('/auth/line', { access_token: accessToken, profile }),
};

export const bookingsAPI = {
  getMyBookings: () => api.get('/bookings'),
  getBooking: (id) => api.get(`/bookings/${id}`),
  createBooking: (data) => api.post('/bookings', data),
  updateStatus: (id, status, lat, lng) => api.patch(`/bookings/${id}/status`, { status, lat, lng }),
  updateLocation: (id, lat, lng) => api.patch(`/bookings/${id}/location`, { lat, lng }),
  submitReview: (id, data) => api.post(`/bookings/${id}/review`, data),
  getEstimate: (carType, distanceKm, durationMin) =>
    api.post('/pricing/estimate', { car_type: carType, distance_km: distanceKm, duration_min: durationMin }),
};

export const driversAPI = {
  register: (data) => api.post('/drivers/register', data),
  getMe: () => api.get('/drivers/me'),
  getMyJobs: (status) => api.get(`/drivers/me/jobs?status=${status}`),
  getMyEarnings: (period) => api.get(`/drivers/me/earnings?period=${period}`),
  setOnline: (isOnline) => api.patch('/drivers/me/online', { is_online: isOnline }),
  setNotifyWhenOffline: (val) => api.patch('/drivers/me/notify-offline', { notify_when_offline: val }),
  getAvailability: () => api.get('/drivers/me/availability'),
  setAvailability: (slots) => api.put('/drivers/me/availability', { availability: slots }),
  requestPayout:  (promptpay_id) => api.post('/drivers/me/request-payout', { promptpay_id }),
};

export const addressesAPI = {
  getAll:    ()       => api.get('/addresses'),
  save:      (data)   => api.post('/addresses', data),
  update:    (id, data) => api.put(`/addresses/${id}`, data),
  remove:    (id)     => api.delete(`/addresses/${id}`),
  recordUse: (id)     => api.patch(`/addresses/${id}/use`),
};

export const paymentsAPI = {
  initiate:  (bookingId, amount) => api.post('/payments/initiate', { booking_id: bookingId, amount }),
  getStatus: (bookingId)         => api.get(`/payments/booking/${bookingId}`),
};

export const pricingAPI = {
  getPackages: () => api.get('/pricing/packages'),
  getPricing: () => api.get('/pricing'),
};

export default api;
