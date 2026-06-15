import { useState, useEffect, useRef } from 'react';
import { driversAPI, bookingsAPI } from '../services/api';
import liff from '@line/liff';

export default function DriverDashboardPage({ user }) {
  const [driver, setDriver] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [activeJob, setActiveJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upcoming');
  const [isSendingGPS, setIsSendingGPS] = useState(false);
  const locationIntervalRef = useRef(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    Promise.all([
      driversAPI.getMe(),
      driversAPI.getMyJobs(tab),
    ]).then(([dRes, jRes]) => {
      setDriver(dRes.data);
      const all = jRes.data;
      const active = all.find(j => ['driver_arrived', 'in_progress'].includes(j.status));
      setActiveJob(active || null);
      setJobs(all.filter(j => !['driver_arrived', 'in_progress'].includes(j.status)));
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [tab]);

  // ── Auto-send GPS เมื่อรับงานอยู่ ────────────────────────────────────────────
  useEffect(() => {
    const job = activeJob;
    const shouldTrack = job && ['driver_arrived', 'in_progress', 'confirmed'].includes(job.status);

    if (!shouldTrack) {
      clearInterval(locationIntervalRef.current);
      setIsSendingGPS(false);
      return;
    }

    const sendLocation = () => {
      if (!navigator.geolocation) return;
      const now = Date.now();
      if (now - lastSentRef.current < 8000) return; // throttle 8 วิ
      lastSentRef.current = now;

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await bookingsAPI.updateLocation(job.id, pos.coords.latitude, pos.coords.longitude);
            setIsSendingGPS(true);
            setTimeout(() => setIsSendingGPS(false), 2000);
          } catch (e) { console.error('[GPS]', e.message); }
        },
        (err) => console.error('[GPS]', err.message),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 }
      );
    };

    sendLocation(); // ส่งทันที
    locationIntervalRef.current = setInterval(sendLocation, 10000);
    return () => clearInterval(locationIntervalRef.current);
  }, [activeJob?.id, activeJob?.status]);

  const toggleOnline = async () => {
    const newState = !driver.is_online;
    await driversAPI.setOnline(newState);
    setDriver(d => ({ ...d, is_online: newState }));
  };

  const updateJobStatus = async (jobId, status) => {
    try {
      // ส่ง GPS ถ้ามี
      let lat, lng;
      if (navigator.geolocation) {
        await new Promise(resolve => navigator.geolocation.getCurrentPosition(
          pos => { lat = pos.coords.latitude; lng = pos.coords.longitude; resolve(); },
          resolve
        ));
      }
      await bookingsAPI.updateStatus(jobId, status, lat, lng);
      // Reload jobs
      const { data } = await driversAPI.getMyJobs('active');
      const active = data.find(j => ['driver_arrived', 'in_progress'].includes(j.status));
      setActiveJob(active || null);
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">⏳ กำลังโหลด...</p>
    </div>
  );

  if (!driver || driver.status !== 'active') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <p className="text-5xl mb-3">{driver?.status === 'pending' ? '⏳' : '❌'}</p>
      <p className="font-bold text-gray-700">
        {driver?.status === 'pending' ? 'รอการอนุมัติ' : 'ยังไม่ได้สมัครเป็นคนขับ'}
      </p>
      <p className="text-gray-400 text-sm mt-1">
        {driver?.status === 'pending' ? 'ทีมงานจะแจ้งผลทาง LINE ภายใน 1-2 วันทำการ' : ''}
      </p>
    </div>
  );

  const tierBadge = { new: '🔵 New', trusted: '⭐ Trusted', verified: '✅ Verified' }[driver.tier];
  const camPct = Math.min(100, Math.round((driver.camera_fund / 4000) * 100));

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-800">สวัสดี, {driver.first_name} 👋</h1>
            <p className="text-xs text-gray-400">{tierBadge} · ⭐ {driver.average_rating} · {driver.total_trips} เที่ยว</p>
          </div>
          {/* Toggle Online */}
          <button onClick={toggleOnline}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm transition-all
              ${driver.is_online ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
            <span className={`w-2 h-2 rounded-full ${driver.is_online ? 'bg-white animate-pulse' : 'bg-gray-400'}`} />
            {driver.is_online ? 'รับงาน' : 'ปิดงาน'}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">

        {/* Active Job Card */}
        {activeJob && (
          <div className="card bg-orange-50 border-2 border-orange-300">
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold text-orange-700">🚗 งานปัจจุบัน</p>
              {isSendingGPS && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                  📡 ส่งพิกัด
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700">📍 {activeJob.pickup_address}</p>
            <p className="text-sm text-gray-700">🏥 {activeJob.dropoff_address}</p>
            <p className="text-sm font-semibold text-gray-800 mt-1">👤 {activeJob.passenger_name}</p>
            {activeJob.passenger_note && (
              <p className="text-xs text-orange-600 mt-1 bg-orange-100 rounded-lg px-2 py-1">
                📝 {activeJob.passenger_note}
              </p>
            )}
            <div className="flex gap-2 mt-3">
              {activeJob.status === 'confirmed' && (
                <button onClick={() => updateJobStatus(activeJob.id, 'driver_arrived')}
                  className="flex-1 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold">
                  🚗 ถึงจุดรับแล้ว
                </button>
              )}
              {activeJob.status === 'driver_arrived' && (
                <button onClick={() => updateJobStatus(activeJob.id, 'in_progress')}
                  className="flex-1 py-2 rounded-xl bg-green-500 text-white text-sm font-semibold">
                  ✅ รับผู้โดยสารแล้ว เริ่มเดินทาง
                </button>
              )}
              {activeJob.status === 'in_progress' && (
                <button onClick={() => updateJobStatus(activeJob.id, 'completed')}
                  className="flex-1 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold">
                  🎉 ส่งผู้โดยสารถึงที่หมาย
                </button>
              )}
            </div>
          </div>
        )}

        {/* Camera Fund */}
        {!driver.has_camera && (
          <div className="card">
            <div className="flex justify-between items-center mb-2">
              <p className="font-semibold text-gray-700 text-sm">📷 กองทุนกล้อง</p>
              <span className="text-sm font-bold text-green-600">฿{Math.round(driver.camera_fund).toLocaleString()} / 4,000</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div className="bg-green-500 h-2.5 rounded-full transition-all" style={{ width: `${camPct}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">สะสมครบ 4,000 บาท รับกล้องฟรี!</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => liff.openWindow({ url: `${window.location.origin}?page=driver-earnings`, external: false })}
            className="card text-center py-4">
            <p className="text-2xl">💰</p>
            <p className="text-sm font-semibold text-gray-700 mt-1">รายได้</p>
          </button>
          <button onClick={() => liff.openWindow({ url: `${window.location.origin}?page=driver-availability`, external: false })}
            className="card text-center py-4">
            <p className="text-2xl">📅</p>
            <p className="text-sm font-semibold text-gray-700 mt-1">ตารางเวลา</p>
          </button>
        </div>

        {/* Jobs Tabs */}
        <div>
          <div className="flex border-b border-gray-100 mb-3">
            {[['upcoming', '📋 งานที่จะมา'], ['history', '🕐 ประวัติ']].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex-1 py-2 text-sm font-medium border-b-2 transition-all
                  ${tab === key ? 'border-green-500 text-green-700' : 'border-transparent text-gray-400'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {jobs.length === 0 ? (
              <div className="text-center py-8 text-gray-300">
                <p className="text-3xl mb-2">{tab === 'upcoming' ? '📭' : '📂'}</p>
                <p className="text-sm">{tab === 'upcoming' ? 'ยังไม่มีงานที่จะมา' : 'ยังไม่มีประวัติ'}</p>
              </div>
            ) : (
              jobs.map(job => (
                <div key={job.id} className="card space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="font-bold text-green-700">#{job.booking_number}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(job.scheduled_at).toLocaleString('th-TH', {
                        timeZone: 'Asia/Bangkok', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-gray-600">📍 {job.pickup_address}</p>
                  <p className="text-gray-600">🏥 {job.dropoff_address}</p>
                  <p className="text-gray-500">👤 {job.passenger_name}</p>
                  {job.driver_earnings && (
                    <p className="font-semibold text-green-700">💰 ฿{job.driver_earnings}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
