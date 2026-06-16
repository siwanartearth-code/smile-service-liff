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

export default function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  // หน้าที่แสดงตาม ?page= query param (แต่ละ LIFF ID ชี้มาที่ URL นี้)
  const params = new URLSearchParams(window.location.search);
  const page = params.get('page') || 'booking';
  const PageComponent = PAGE_ROUTES[page] || BookingPage;

  useEffect(() => {
    const initLiff = async () => {
      try {
        const liffId = import.meta.env.VITE_LIFF_ID;
        if (!liffId) throw new Error('VITE_LIFF_ID not set');

        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const accessToken = liff.getAccessToken();
        const { data } = await authAPI.loginWithLine(accessToken);
        localStorage.setItem('smile_token', data.token);
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
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-red-600 font-semibold">เกิดข้อผิดพลาด</p>
        <p className="text-gray-500 text-sm mt-2">{error}</p>
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
