import { useState, useEffect, useRef } from 'react';
import { bookingsAPI } from '../services/api';

const STATUS_STEPS = [
  { key: 'confirmed',      label: 'ยืนยันแล้ว',        icon: '✅' },
  { key: 'driver_arrived', label: 'คนขับมาถึงแล้ว',    icon: '🚗' },
  { key: 'in_progress',    label: 'กำลังเดินทาง',       icon: '🛣️' },
  { key: 'completed',      label: 'ถึงที่หมายแล้ว',     icon: '🎉' },
];

const STATUS_ORDER = ['confirmed', 'driver_arrived', 'in_progress', 'completed'];

export default function TrackingPage() {
  const params = new URLSearchParams(window.location.search);
  const bookingId = params.get('booking');

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  const fetchBooking = async () => {
    if (!bookingId) return;
    try {
      const { data } = await bookingsAPI.getBooking(bookingId);
      setBooking(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
    // Poll ทุก 15 วินาที
    intervalRef.current = setInterval(fetchBooking, 15000);
    return () => clearInterval(intervalRef.current);
  }, [bookingId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">⏳ กำลังโหลด...</p>
    </div>
  );

  if (!booking) return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <p className="text-5xl mb-3">🔍</p>
        <p className="text-gray-500">ไม่พบข้อมูลการจอง</p>
      </div>
    </div>
  );

  const currentStep = STATUS_ORDER.indexOf(booking.status);

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0">
        <h1 className="font-bold text-gray-800 text-lg">📍 ติดตามรถ</h1>
        <p className="text-xs text-gray-400">#{booking.booking_number} · รีเฟรชทุก 15 วินาที</p>
      </div>

      <div className="p-4 space-y-4">

        {/* Status Steps */}
        <div className="card">
          <div className="space-y-4">
            {STATUS_STEPS.map((step, i) => {
              const done = i <= currentStep;
              const active = i === currentStep;
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0
                    ${active ? 'bg-green-500 ring-4 ring-green-100' : done ? 'bg-green-400' : 'bg-gray-100'}`}>
                    {done ? step.icon : <span className="text-gray-300">○</span>}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${active ? 'text-green-700' : done ? 'text-gray-700' : 'text-gray-300'}`}>
                      {step.label}
                    </p>
                    {active && <p className="text-xs text-green-500 animate-pulse">● ตำแหน่งปัจจุบัน</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Driver Info */}
        {booking.driver_name && (
          <div className="card">
            <p className="section-title">🚗 ข้อมูลคนขับ</p>
            <div className="space-y-1 text-sm text-gray-700">
              <p>👤 {booking.driver_name}</p>
              <p>🚗 {booking.car_brand} {booking.car_model} · สี{booking.car_color}</p>
              <p>🔢 ทะเบียน <span className="font-bold text-gray-900">{booking.car_plate}</span></p>
            </div>
          </div>
        )}

        {/* Trip Info */}
        <div className="card space-y-2 text-sm text-gray-600">
          <p>📍 <span className="text-gray-800">{booking.pickup_address}</span></p>
          <p>🏥 <span className="text-gray-800">{booking.dropoff_address}</span></p>
          <p>🕐 {new Date(booking.scheduled_at).toLocaleString('th-TH', {
            timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short'
          })}</p>
        </div>

        {/* GPS Map Placeholder (ต่อ Google Maps API ภายหลัง) */}
        {booking.current_lat && booking.current_lng ? (
          <div className="card bg-blue-50 border border-blue-100">
            <p className="text-blue-700 text-sm font-semibold">📡 GPS คนขับ</p>
            <p className="text-xs text-blue-500 mt-1">
              {booking.current_lat.toFixed(5)}, {booking.current_lng.toFixed(5)}
            </p>
            <a
              href={`https://maps.google.com/?q=${booking.current_lat},${booking.current_lng}`}
              target="_blank" rel="noreferrer"
              className="text-xs text-blue-600 underline mt-1 block">
              เปิดใน Google Maps →
            </a>
          </div>
        ) : (
          <div className="card bg-gray-50 text-center py-4 text-gray-400 text-sm">
            🗺️ แผนที่จะแสดงเมื่อคนขับเริ่มเดินทาง
          </div>
        )}

        {booking.status === 'completed' && (
          <div className="card bg-green-50 border border-green-200 text-center py-4">
            <p className="text-2xl mb-1">🎉</p>
            <p className="font-bold text-green-800">ถึงที่หมายปลอดภัยแล้ว!</p>
            {booking.final_price && (
              <p className="text-green-600 mt-1">ค่าบริการ ฿{booking.final_price}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
