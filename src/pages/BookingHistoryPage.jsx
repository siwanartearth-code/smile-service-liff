import { useState, useEffect } from 'react';
import { bookingsAPI } from '../services/api';
import liff from '@line/liff';

const STATUS_MAP = {
  pending:        { label: 'รอคนขับ',         color: 'text-yellow-600 bg-yellow-50',  icon: '⏳' },
  searching:      { label: 'กำลังหาคนขับ',    color: 'text-blue-600 bg-blue-50',      icon: '🔍' },
  confirmed:      { label: 'ยืนยันแล้ว',       color: 'text-green-600 bg-green-50',    icon: '✅' },
  driver_arrived: { label: 'คนขับมาแล้ว',     color: 'text-orange-600 bg-orange-50',  icon: '🚗' },
  in_progress:    { label: 'กำลังเดินทาง',     color: 'text-orange-600 bg-orange-50',  icon: '🛣️' },
  completed:      { label: 'เสร็จสิ้น',        color: 'text-green-700 bg-green-100',   icon: '🎉' },
  cancelled:      { label: 'ยกเลิก',           color: 'text-red-600 bg-red-50',        icon: '❌' },
};

export default function BookingHistoryPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookingsAPI.getMyBookings()
      .then(r => setBookings(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">⏳ กำลังโหลด...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0">
        <h1 className="font-bold text-gray-800 text-lg">📋 ประวัติการจอง</h1>
      </div>

      <div className="p-4 space-y-3">
        {bookings.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🚗</div>
            <p className="text-gray-400">ยังไม่มีประวัติการจอง</p>
          </div>
        ) : (
          bookings.map(b => {
            const s = STATUS_MAP[b.status] || { label: b.status, color: 'text-gray-600 bg-gray-50', icon: '•' };
            return (
              <div key={b.id} className="card space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-green-700 text-sm">#{b.booking_number}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(b.scheduled_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${s.color}`}>
                    {s.icon} {s.label}
                  </span>
                </div>

                <div className="text-sm space-y-1 text-gray-600">
                  <p>📍 {b.pickup_address}</p>
                  <p>🏥 {b.dropoff_address}</p>
                  {b.driver_name && <p>🚗 {b.driver_name} · {b.car_brand} {b.car_model} [{b.car_plate}]</p>}
                </div>

                {b.final_price && (
                  <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-sm text-gray-400">ค่าบริการ</span>
                    <span className="font-bold text-gray-800">฿{b.final_price}</span>
                  </div>
                )}

                {/* ปุ่มรีวิว ถ้าเสร็จแล้ว */}
                {b.status === 'completed' && (
                  <button
                    onClick={() => liff.openWindow({
                      url: `https://liff.line.me/${import.meta.env.VITE_LIFF_ID}?page=review&booking=${b.id}`,
                      external: false,
                    })}
                    className="w-full py-2 rounded-xl text-sm font-semibold bg-green-50 text-green-700 border border-green-200">
                    ⭐ รีวิวคนขับ
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
