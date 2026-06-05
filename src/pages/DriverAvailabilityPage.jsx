import { useState, useEffect } from 'react';
import { driversAPI } from '../services/api';
import liff from '@line/liff';

const DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const DAYS_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];

const DEFAULT_SLOTS = DAYS.map((_, i) => ({
  day_of_week: i,
  enabled: i >= 1 && i <= 5,
  start_time: '08:00',
  end_time: '17:00',
  max_trips: 5,
}));

export default function DriverAvailabilityPage() {
  const [slots, setSlots] = useState(DEFAULT_SLOTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    driversAPI.getAvailability().then(({ data }) => {
      if (data.length > 0) {
        const updated = DEFAULT_SLOTS.map(d => {
          const saved = data.find(s => s.day_of_week === d.day_of_week);
          return saved
            ? { ...d, enabled: true, start_time: saved.start_time.slice(0, 5), end_time: saved.end_time.slice(0, 5), max_trips: saved.max_trips }
            : { ...d, enabled: false };
        });
        setSlots(updated);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const updateSlot = (day, key, val) =>
    setSlots(prev => prev.map(s => s.day_of_week === day ? { ...s, [key]: val } : s));

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
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0">
        <div className="flex items-center gap-3">
          <button onClick={() => liff.closeWindow()} className="text-xl">←</button>
          <h1 className="font-bold text-gray-800 text-lg">📅 ตารางเวลารับงาน</h1>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-sm text-gray-500">เลือกวัน/เวลาที่คุณสะดวกรับงาน ระบบจะแมตช์งานให้ตามตารางนี้</p>

        {slots.map(slot => (
          <div key={slot.day_of_week} className={`card transition-all ${slot.enabled ? '' : 'opacity-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm
                  ${slot.enabled ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {DAYS[slot.day_of_week]}
                </div>
                <span className="font-semibold text-gray-700">{DAYS_FULL[slot.day_of_week]}</span>
              </div>
              {/* Toggle */}
              <button onClick={() => updateSlot(slot.day_of_week, 'enabled', !slot.enabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${slot.enabled ? 'bg-green-500' : 'bg-gray-200'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all
                  ${slot.enabled ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>

            {slot.enabled && (
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">เริ่ม</label>
                  <input type="time" className="input-field text-sm py-2 px-3" value={slot.start_time}
                    onChange={e => updateSlot(slot.day_of_week, 'start_time', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">สิ้นสุด</label>
                  <input type="time" className="input-field text-sm py-2 px-3" value={slot.end_time}
                    onChange={e => updateSlot(slot.day_of_week, 'end_time', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">สูงสุด</label>
                  <select className="input-field text-sm py-2 px-3" value={slot.max_trips}
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

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
        <button onClick={handleSave} disabled={saving}
          className={`btn-primary ${saving ? 'opacity-50' : ''}`}>
          {saved ? '✅ บันทึกแล้ว!' : saving ? '⏳ กำลังบันทึก...' : '💾 บันทึกตารางเวลา'}
        </button>
      </div>
    </div>
  );
}
