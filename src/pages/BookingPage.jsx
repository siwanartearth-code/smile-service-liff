import { useState, useEffect } from 'react';
import { bookingsAPI, pricingAPI } from '../services/api';
import liff from '@line/liff';

const CAR_TYPES = [
  { value: 'sedan',         label: '🚗 รถเก๋ง',          desc: 'สะดวก ประหยัด' },
  { value: 'van',           label: '🚐 รถตู้',           desc: 'กว้างขวาง นั่งสบาย' },
  { value: 'wheelchair_van',label: '♿ รถวีลแชร์',        desc: 'สำหรับผู้ใช้วีลแชร์' },
  { value: 'ev_sedan',      label: '⚡ รถไฟฟ้าเก๋ง',    desc: 'เงียบ ประหยัด' },
];

export default function BookingPage({ user }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    passenger_name: user?.display_name || '',
    passenger_phone: '',
    passenger_note: '',
    pickup_address: '',
    dropoff_address: '',
    scheduled_at: '',
    car_type: 'sedan',
    booking_type: 'available',
    estimated_distance: 10,
    estimated_duration: 30,
  });
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ดึงราคาประมาณ เมื่อเปลี่ยนข้อมูล
  useEffect(() => {
    if (!form.car_type || !form.estimated_distance) return;
    const timer = setTimeout(async () => {
      try {
        const { data } = await bookingsAPI.getEstimate(form.car_type, form.estimated_distance, form.estimated_duration);
        setEstimate(data);
      } catch {}
    }, 500);
    return () => clearTimeout(timer);
  }, [form.car_type, form.estimated_distance, form.estimated_duration]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data } = await bookingsAPI.createBooking(form);
      setSuccess(data);
      setStep(4);
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // ── Step 1: ข้อมูลผู้โดยสาร ──────────────────────────────────────────────
  if (step === 1) return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="จองรถรับส่ง" />
      <div className="p-4 space-y-4">
        <div className="card">
          <p className="section-title">👤 ข้อมูลผู้โดยสาร</p>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">ชื่อผู้โดยสาร *</label>
              <input className="input-field" value={form.passenger_name}
                onChange={e => set('passenger_name', e.target.value)} placeholder="ชื่อ-นามสกุล" />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">เบอร์โทร</label>
              <input className="input-field" value={form.passenger_phone} type="tel"
                onChange={e => set('passenger_phone', e.target.value)} placeholder="08x-xxx-xxxx" />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">หมายเหตุพิเศษ</label>
              <textarea className="input-field" rows={2} value={form.passenger_note}
                onChange={e => set('passenger_note', e.target.value)}
                placeholder="เช่น: ใช้ walker ต้องช่วยขึ้นรถ, ต้องการนั่งตรงหน้า" />
            </div>
          </div>
        </div>

        <div className="card">
          <p className="section-title">📍 สถานที่</p>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">รับที่ (ต้นทาง) *</label>
              <input className="input-field" value={form.pickup_address}
                onChange={e => set('pickup_address', e.target.value)} placeholder="บ้านเลขที่ ถนน แขวง เขต" />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">ส่งที่ (ปลายทาง) *</label>
              <input className="input-field" value={form.dropoff_address}
                onChange={e => set('dropoff_address', e.target.value)} placeholder="โรงพยาบาล / ที่หมาย" />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">ระยะทางโดยประมาณ (กม.)</label>
              <input className="input-field" type="number" value={form.estimated_distance} min="1" max="200"
                onChange={e => set('estimated_distance', parseFloat(e.target.value))} />
            </div>
          </div>
        </div>

        <div className="card">
          <p className="section-title">🕐 เวลารับ *</p>
          <input className="input-field" type="datetime-local" value={form.scheduled_at}
            min={new Date(Date.now() + 30*60000).toISOString().slice(0,16)}
            onChange={e => set('scheduled_at', e.target.value)} />
        </div>
      </div>
      <BottomBar
        label="ถัดไป: เลือกประเภทรถ →"
        disabled={!form.passenger_name || !form.pickup_address || !form.dropoff_address || !form.scheduled_at}
        onClick={() => setStep(2)} />
    </div>
  );

  // ── Step 2: เลือกประเภทรถ ────────────────────────────────────────────────
  if (step === 2) return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="เลือกประเภทรถ" onBack={() => setStep(1)} />
      <div className="p-4 space-y-3">
        {CAR_TYPES.map(ct => (
          <button key={ct.value} onClick={() => set('car_type', ct.value)}
            className={`card w-full text-left flex items-center gap-4 transition-all ${form.car_type === ct.value ? 'ring-2 ring-green-500 bg-green-50' : ''}`}>
            <span className="text-3xl">{ct.label.split(' ')[0]}</span>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">{ct.label.slice(2)}</p>
              <p className="text-sm text-gray-500">{ct.desc}</p>
            </div>
            {form.car_type === ct.value && <span className="text-green-500 text-xl">✓</span>}
          </button>
        ))}

        {/* Price estimate */}
        {estimate && (
          <div className="card bg-green-50 border border-green-200">
            <p className="font-semibold text-green-800 mb-2">💰 ราคาประมาณ</p>
            <div className="space-y-1 text-sm text-green-700">
              <div className="flex justify-between"><span>ค่าเริ่มต้น</span><span>฿{estimate.baseFare}</span></div>
              <div className="flex justify-between"><span>ค่าระยะทาง ({form.estimated_distance} กม.)</span><span>฿{estimate.distanceFare}</span></div>
              <div className="flex justify-between font-bold text-base text-green-900 pt-1 border-t border-green-200">
                <span>รวม</span><span>฿{estimate.total}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">*ราคาจริงอาจเปลี่ยนแปลงตามระยะทางจริง</p>
          </div>
        )}
      </div>
      <BottomBar label="ถัดไป: ยืนยันการจอง →" onClick={() => setStep(3)} />
    </div>
  );

  // ── Step 3: ยืนยัน ────────────────────────────────────────────────────────
  if (step === 3) return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="ยืนยันการจอง" onBack={() => setStep(2)} />
      <div className="p-4 space-y-4">
        <div className="card space-y-2 text-sm">
          <Row label="👤 ผู้โดยสาร" value={form.passenger_name} />
          <Row label="📍 รับที่" value={form.pickup_address} />
          <Row label="🏥 ส่งที่" value={form.dropoff_address} />
          <Row label="🕐 เวลา" value={new Date(form.scheduled_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })} />
          <Row label="🚗 ประเภทรถ" value={CAR_TYPES.find(c => c.value === form.car_type)?.label} />
          {form.passenger_note && <Row label="📝 หมายเหตุ" value={form.passenger_note} />}
          {estimate && (
            <div className="pt-2 border-t border-gray-100">
              <Row label="💰 ราคาประมาณ" value={`฿${estimate.total}`} bold />
            </div>
          )}
        </div>

        <div className="card bg-blue-50 border border-blue-100">
          <p className="text-sm text-blue-700">
            ℹ️ หลังจากยืนยัน ระบบจะหาคนขับให้คุณทันที คุณจะได้รับแจ้งเตือนเมื่อคนขับรับงาน
          </p>
        </div>
      </div>
      <BottomBar label={loading ? '⏳ กำลังส่งข้อมูล...' : '✅ ยืนยันการจอง'} onClick={handleSubmit} disabled={loading} />
    </div>
  );

  // ── Step 4: สำเร็จ ────────────────────────────────────────────────────────
  if (step === 4 && success) return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="text-6xl mb-4">🎉</div>
      <h2 className="text-xl font-bold text-green-800">จองสำเร็จแล้ว!</h2>
      <p className="text-green-600 mt-1">กำลังหาคนขับให้คุณ...</p>
      <div className="card mt-6 w-full text-left space-y-1 text-sm">
        <Row label="🔖 หมายเลข" value={success.booking?.booking_number} bold />
        <Row label="🔍 คนขับที่แจ้งเตือน" value={`${success.driversNotified || 0} คน`} />
      </div>
      <p className="text-xs text-gray-400 mt-4">คุณจะได้รับแจ้งเตือนทาง LINE เมื่อคนขับรับงาน</p>
      <button onClick={() => liff.closeWindow()} className="btn-primary mt-6">ปิดหน้าต่าง</button>
    </div>
  );

  return null;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Header({ title, onBack }) {
  return (
    <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
      {onBack && <button onClick={onBack} className="text-xl">←</button>}
      <h1 className="font-bold text-gray-800 text-lg">{title}</h1>
    </div>
  );
}

function BottomBar({ label, onClick, disabled }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
      <button onClick={onClick} disabled={disabled}
        className={`btn-primary ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        {label}
      </button>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 w-36 flex-shrink-0">{label}</span>
      <span className={`flex-1 ${bold ? 'font-bold' : ''}`}>{value || '—'}</span>
    </div>
  );
}
