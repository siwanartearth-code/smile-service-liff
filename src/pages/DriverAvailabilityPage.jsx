import { useState, useEffect } from 'react';
import { driversAPI } from '../services/api';
import liff from '@line/liff';

const DAYS      = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const DAYS_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];

const DEFAULT_SLOTS = DAYS.map((_, i) => ({
  day_of_week: i,
  enabled:     i >= 1 && i <= 5,
  start_time:  '08:00',
  end_time:    '17:00',
  max_trips:   5,
}));

export default function DriverAvailabilityPage() {
  const [slots,            setSlots]    = useState(DEFAULT_SLOTS);
  const [isOnline,         setOnline]   = useState(false);
  const [notifyOffline,    setNotify]   = useState(false);
  const [loading,          setLoading]  = useState(true);
  const [saving,           setSaving]   = useState(false);
  const [saved,            setSaved]    = useState(false);
  const [togglingOnline,   setTogOnline] = useState(false);

  useEffect(() => {
    Promise.all([
      driversAPI.getAvailability(),
      driversAPI.getMe(),
    ]).then(([avail, me]) => {
      // ตาราง
      if (avail.data?.length > 0) {
        const updated = DEFAULT_SLOTS.map(d => {
          const saved = avail.data.find(s => s.day_of_week === d.day_of_week);
          return saved
            ? { ...d, enabled: true, start_time: saved.start_time.slice(0, 5), end_time: saved.end_time.slice(0, 5), max_trips: saved.max_trips }
            : { ...d, enabled: false };
        });
        setSlots(updated);
      }
      // สถานะออนไลน์
      if (me.data) {
        setOnline(!!me.data.is_online);
        setNotify(!!me.data.notify_when_offline);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const updateSlot = (day, key, val) =>
    setSlots(prev => prev.map(s => s.day_of_week === day ? { ...s, [key]: val } : s));

  // Toggle online/offline
  const handleToggleOnline = async () => {
    setTogOnline(true);
    try {
      const newVal = !isOnline;
      await driversAPI.setOnline(newVal);
      setOnline(newVal);
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setTogOnline(false);
    }
  };

  // Toggle notify_when_offline
  const handleToggleNotify = async () => {
    try {
      const newVal = !notifyOffline;
      await driversAPI.setNotifyWhenOffline(newVal);
      setNotify(newVal);
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  // บันทึกตาราง
  const handleSave = async () => {
    setSaving(true);
    try {
      const enabled = slots.filter(s => s.enabled).map(s => ({
        day_of_week: s.day_of_week,
        start_time:  s.start_time,
        end_time:    s.end_time,
        max_trips:   s.max_trips,
      }));
      await driversAPI.setAvailability(enabled);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">⏳ กำลังโหลด...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => liff.closeWindow()} className="text-xl text-gray-500">←</button>
          <h1 className="font-bold text-gray-800 text-lg">📅 ตารางรับงาน</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">

        {/* ══ Online Toggle ══ */}
        <div className={`rounded-2xl p-4 shadow-sm border transition-all ${isOnline ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-lg">{isOnline ? '🟢 รับงานอยู่' : '🔴 ปิดรับงาน'}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {isOnline
                  ? 'ระบบกำลังส่งงานให้คุณ'
                  : 'กดเปิดเพื่อเริ่มรับงาน'}
              </p>
            </div>
            <button
              onClick={handleToggleOnline}
              disabled={togglingOnline}
              className={`relative w-16 h-8 rounded-full transition-colors shadow-inner ${isOnline ? 'bg-green-500' : 'bg-gray-300'} ${togglingOnline ? 'opacity-60' : ''}`}
            >
              <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${isOnline ? 'left-9' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* ══ Notify When Offline ══ */}
        <div className="card">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="font-semibold text-gray-800">💼 รับงานนอกเวลา</p>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                แม้ปิดรับงานอยู่ ระบบจะแจ้งงานที่ไม่มีคนรับหลังจาก 3 นาที
                คุณเลือกรับหรือปฏิเสธได้เอง
              </p>
              {notifyOffline && (
                <p className="text-xs text-blue-600 mt-1.5 font-medium">
                  ✅ เปิดแล้ว — คุณจะได้รับแจ้งงานสำรองพร้อมราคาที่ชัดเจน
                </p>
              )}
            </div>
            <button
              onClick={handleToggleNotify}
              className={`relative w-14 h-7 rounded-full transition-colors flex-shrink-0 mt-0.5 ${notifyOffline ? 'bg-blue-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all ${notifyOffline ? 'left-7' : 'left-0.5'}`} />
            </button>
          </div>
        </div>

        {/* ══ ตารางเวลา ══ */}
        <div>
          <p className="text-sm font-semibold text-gray-600 mb-2 px-1">📆 ตารางเวลาประจำ</p>
          <p className="text-xs text-gray-400 mb-3 px-1">
            ระบบจะส่งงานให้คุณก่อนในช่วงเวลาที่ตั้งไว้ ถ้ามีงานนอกช่วงเวลา
            ระบบจะยิงหาคนขับออนไลน์คนอื่นก่อน
          </p>

          <div className="space-y-3">
            {slots.map(slot => (
              <div key={slot.day_of_week}
                className={`card transition-all ${slot.enabled ? 'border-green-100' : 'opacity-60'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm
                      ${slot.enabled ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      {DAYS[slot.day_of_week]}
                    </div>
                    <span className="font-semibold text-gray-700">{DAYS_FULL[slot.day_of_week]}</span>
                    {slot.enabled && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        {slot.start_time}–{slot.end_time}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => updateSlot(slot.day_of_week, 'enabled', !slot.enabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${slot.enabled ? 'bg-green-500' : 'bg-gray-200'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all
                      ${slot.enabled ? 'left-6' : 'left-0.5'}`} />
                  </button>
                </div>

                {slot.enabled && (
                  <div className="grid grid-cols-3 gap-2 text-sm mt-2 pt-2 border-t border-gray-100">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">⏰ เริ่ม</label>
                      <input type="time" className="input-field text-sm py-2 px-2" value={slot.start_time}
                        onChange={e => updateSlot(slot.day_of_week, 'start_time', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">🏁 สิ้นสุด</label>
                      <input type="time" className="input-field text-sm py-2 px-2" value={slot.end_time}
                        onChange={e => updateSlot(slot.day_of_week, 'end_time', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">🚗 สูงสุด</label>
                      <select className="input-field text-sm py-2 px-2" value={slot.max_trips}
                        onChange={e => updateSlot(slot.day_of_week, 'max_trips', parseInt(e.target.value))}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 10].map(n => (
                          <option key={n} value={n}>{n} เที่ยว</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── info card ── */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-sm text-blue-800 font-semibold mb-1">ℹ️ ลำดับการส่งงาน</p>
          <ol className="text-xs text-blue-700 space-y-1 list-none">
            <li>1️⃣ คนขับออนไลน์ที่ตรงตารางเวลา → ได้งานก่อน</li>
            <li>2️⃣ คนขับออนไลน์นอกตาราง → ได้ถัดไป</li>
            <li>3️⃣ คนขับปิดรับ+เปิด "รับงานนอกเวลา" → ได้หลัง 3 นาที พร้อมราคาชัดเจน</li>
          </ol>
        </div>
      </div>

      {/* Bottom Save */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-lg">
        <button onClick={handleSave} disabled={saving}
          className={`btn-primary ${saving ? 'opacity-50' : ''}`}>
          {saved ? '✅ บันทึกแล้ว!' : saving ? '⏳ กำลังบันทึก...' : '💾 บันทึกตารางเวลา'}
        </button>
      </div>
    </div>
  );
}
