import { useState, useEffect } from 'react';
import { driversAPI } from '../services/api';
import liff from '@line/liff';

export default function DriverEarningsPage() {
  const [earnings, setEarnings] = useState(null);
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    driversAPI.getMyEarnings(period)
      .then(r => setEarnings(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  const camPct = earnings ? Math.min(100, Math.round((earnings.camera_fund_total / earnings.camera_threshold) * 100)) : 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0">
        <div className="flex items-center gap-3">
          <button onClick={() => liff.closeWindow()} className="text-xl">←</button>
          <h1 className="font-bold text-gray-800 text-lg">💰 รายได้ของฉัน</h1>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 px-4 py-3 bg-white border-b border-gray-100">
        {[['7', '7 วัน'], ['30', '30 วัน'], ['90', '3 เดือน']].map(([val, label]) => (
          <button key={val} onClick={() => setPeriod(val)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all
              ${period === val ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-500 border-gray-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-gray-400">⏳ กำลังโหลด...</p>
        </div>
      ) : (
        <div className="p-4 space-y-4">

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon="🚗" label="เที่ยวทั้งหมด" value={`${earnings?.trips || 0} เที่ยว`} />
            <StatCard icon="💵" label="รายได้สุทธิ" value={`฿${Math.round(earnings?.net || 0).toLocaleString()}`} green />
          </div>

          {/* Breakdown */}
          <div className="card space-y-3">
            <p className="section-title">สรุปรายได้ {period} วันที่ผ่านมา</p>
            <Row label="รายได้รวมก่อนหัก" value={`฿${Math.round(earnings?.gross || 0).toLocaleString()}`} />
            <Row label="ค่า commission" value={`-฿${Math.round(earnings?.fee || 0).toLocaleString()}`} negative />
            <Row label="กองทุนกล้อง" value={`-฿${Math.round(earnings?.cam_fund || 0).toLocaleString()}`} negative />
            <Row label="Tip จากลูกค้า" value={`+฿${Math.round(earnings?.tips || 0).toLocaleString()}`} green />
            <div className="pt-3 border-t border-gray-100">
              <Row label="รับจริง" value={`฿${Math.round(earnings?.net || 0).toLocaleString()}`} bold />
            </div>
          </div>

          {/* Camera Fund Progress */}
          {!earnings?.has_camera && (
            <div className="card">
              <p className="section-title">📷 กองทุนกล้องสะสม</p>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">สะสมแล้ว</span>
                <span className="font-bold text-green-600">
                  ฿{Math.round(earnings?.camera_fund_total || 0).toLocaleString()} / ฿{earnings?.camera_threshold?.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div className="bg-green-500 h-3 rounded-full transition-all"
                  style={{ width: `${camPct}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {camPct >= 100
                  ? '🎉 ครบแล้ว! กล้องกำลังส่งให้คุณ'
                  : `อีก ฿${Math.round((earnings?.camera_threshold || 4000) - (earnings?.camera_fund_total || 0)).toLocaleString()} จะได้รับกล้อง`}
              </p>
              <div className="mt-3 bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
                💡 คนขับที่มีกล้องได้รับ commission ต่ำลง 2% และได้รับงานก่อนในระบบ
              </div>
            </div>
          )}

          {earnings?.has_camera && (
            <div className="card bg-green-50 border border-green-200 text-center py-4">
              <p className="text-2xl mb-1">📷</p>
              <p className="font-bold text-green-800">คุณมีกล้องติดรถแล้ว!</p>
              <p className="text-xs text-green-600 mt-1">ได้รับสิทธิ์ commission พิเศษ + งานก่อน</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, green }) {
  return (
    <div className={`card text-center py-4 ${green ? 'bg-green-50 border border-green-100' : ''}`}>
      <p className="text-2xl">{icon}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
      <p className={`font-bold text-lg mt-0.5 ${green ? 'text-green-700' : 'text-gray-800'}`}>{value}</p>
    </div>
  );
}

function Row({ label, value, negative, green, bold }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`font-${bold ? 'bold' : 'medium'} ${negative ? 'text-red-500' : green ? 'text-green-600' : 'text-gray-800'}`}>
        {value}
      </span>
    </div>
  );
}
