import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import liff from '@line/liff';
import { authAPI } from './services/api';

// Pages
import BookingPage from './pages/BookingPage';
import BookingHistoryPage from './pages/BookingHistoryPage';
import TrackingPage from './pages/TrackingPage';
import ReviewPage from './pages/ReviewPage';
import DriverRegisterPage from './pages/DriverRegisterPage';
import DriverDashboardPage from './pages/DriverDashboardPage';
import DriverAvailabilityPage from './pages/DriverAvailabilityPage';
import DriverEarningsPage from './pages/DriverEarningsPage';
import DriverDocumentsPage from './pages/DriverDocumentsPage';
import LoadingScreen from './components/LoadingScreen';

// Page router ตาม URL param
const PAGE_ROUTES = {
  booking:               BookingPage,
  history:               BookingHistoryPage,
  tracking:              TrackingPage,
  review:                ReviewPage,
  'driver-register':     DriverRegisterPage,
  'driver-dashboard':    DriverDashboardPage,
  'driver-availability': DriverAvailabilityPage,
  'driver-earnings':     DriverEarningsPage,
  'driver-documents':    DriverDocumentsPage,
};

// Map page → LIFF ID
const LIFF_IDS = {
  booking:           import.meta.env.VITE_LIFF_ID_BOOKING     || import.meta.env.VITE_LIFF_ID,
  tracking:          import.meta.env.VITE_LIFF_ID_TRACKING    || import.meta.env.VITE_LIFF_ID,
  history:           import.meta.env.VITE_LIFF_ID_HISTORY     || import.meta.env.VITE_LIFF_ID,
  'driver-register': import.meta.env.VITE_LIFF_ID_DRIVER_REG  || import.meta.env.VITE_LIFF_ID,
  'driver-earnings': import.meta.env.VITE_LIFF_ID_DRIVER_EARN || import.meta.env.VITE_LIFF_ID,
  'driver-dashboard':import.meta.env.VITE_LIFF_ID_DRIVER_DASH || import.meta.env.VITE_LIFF_ID,
};

export default function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser]   = useState(null);
  const [error, setError] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const page = params.get('page') || 'booking';
  const PageComponent = PAGE_ROUTES[page] || BookingPage;

  useEffect(() => {
    const initLiff = async () => {
      try {
        const liffId = LIFF_IDS[page] || import.meta.env.VITE_LIFF_ID;
        if (!liffId) throw new Error('LIFF ID not configured for page: ' + page);

        // ping API เพื่อปลุก Render server (fire and forget)
        const apiUrl = import.meta.env.VITE_API_URL || 'https://smile-service-api.onrender.com';
        fetch(`${apiUrl}/health`).catch(() => {});

        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        // ✅ ใช้ cached JWT ถ้ามี — ข้ามการ call API ใหม่
        const cached = localStorage.getItem('smile_token');
        const cachedUser = localStorage.getItem('smile_user');
        if (cached && cachedUser) {
          try {
            setUser(JSON.parse(cachedUser));
            setReady(true);
            // refresh token ใน background โดยไม่ block UI
            const accessToken = liff.getAccessToken();
            if (accessToken) {
              authAPI.loginWithLine(accessToken)
                .then(({ data }) => {
                  localStorage.setItem('smile_token', data.token);
                  localStorage.setItem('smile_user', JSON.stringify(data.user));
                  setUser(data.user);
                })
                .catch(() => {}); // ถ้า fail ก็ไม่เป็นไร token เดิมยังใช้ได้
            }
            return;
          } catch {
            localStorage.removeItem('smile_token');
            localStorage.removeItem('smile_user');
          }
        }

        // ไม่มี cache — login ปกติ
        const accessToken = liff.getAccessToken();
        if (!accessToken) {
          // access token หมด แต่ยังไม่ login loop — แสดง error แทน
          throw new Error('ไม่สามารถรับ access token ได้ กรุณาปิดแล้วเปิดใหม่');
        }

        const { data } = await authAPI.loginWithLine(accessToken);
        localStorage.setItem('smile_token', data.token);
        localStorage.setItem('smile_user', JSON.stringify(data.user));
        setUser(data.user);

      } catch (err) {
        console.error('LIFF init error:', err);
        setError(err.message);
      } finally {
        setReady(true);
      }
    };

    initLiff();
  }, []);

  if (!ready) return <LoadingScreen />;

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
      <div className="text-center bg-white rounded-2xl p-8 shadow-md max-w-sm w-full">
        <div className="text-5xl mb-4">⚠️</div>
        <p className="text-red-600 font-semibold text-lg mb-2">เกิดข้อผิดพลาด</p>
        <p className="text-gray-500 text-sm mb-6">{error}</p>
        <button
          onClick={() => { localStorage.removeItem('smile_token'); localStorage.removeItem('smile_user'); window.location.reload(); }}
          className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold"
        >
          🔄 ลองใหม่อีกครั้ง
        </button>
      </div>
    </div>
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PageComponent user={user} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
