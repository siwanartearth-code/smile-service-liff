import { useState } from 'react';
import { driversAPI } from '../services/api';
import liff from '@line/liff';

const STEPS = ['ข้อมูลส่วนตัว', 'ใบขับขี่', 'ข้อมูลรถ', 'ยืนยัน'];
const CAR_TYPES = [
  { value: 'sedan',          label: '🚗 รถเก๋ง' },
  { value: 'van',            label: '🚐 รถตู้' },
  { value: 'wheelchair_van', label: '♿ รถวีลแชร์' },
  { value: 'ev_sedan',       label: '⚡ รถไฟฟ้าเก๋ง' },
  { value: 'ev_van',         label: '⚡ รถไฟฟ้าตู้' },
];
const LICENSE_TYPES = ['ป.1', 'ป.2', 'ท.1', 'ท.2', 'ชนิด 1', 'ชนิด 2'];

export default function DriverRegisterPage({ user }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '',
    id_card_number: '', id_card_image_url: '',
    license_number: '', license_type: 'ป.1', license_expiry: '',
    license_image_url: '', car_brand: '', car_model: '',
    car_year: new Date().getFullYear(), car_color: '', car_plate: '',
    car_type: 'sedan', car_image_url: '', car_insurance_url: '',
  });
  const [aiChecking, setAiChecking] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // จำลอง AI ตรวจเอกสาร (ในระบบจริงเชื่อมต่อ API ตรวจสอบจริง)
  const simulateAiCheck = async () => {
    setAiChecking(true);
    await new Promise(r => setTimeout(r, 1800));
    setAiResult({
      id_card:  { ok: true,  extracted: { name: `${form.first_name} ${form.last_name}`, id: form.id_card_number } },
      license:  { ok: true,  extracted: { number: form.license_number, type: form.license_type, expiry: form.license_expiry } },
      car:      { ok: true,  extracted: { plate: form.car_plate, brand: form.car_brand } },
    });
    setAiChecking(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await driversAPI.register(form);
      setDone(true);
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="text-6xl mb-4">🎉</div>
      <h2 className="text-xl font-bold text-green-800">ส่งข้อมูลสำเร็จ!</h2>
      <p className="text-green-600 mt-2 text-sm">ทีมงานจะตรวจสอบข้อมูลภายใน 1–2 วันทำการ<br/>แล้วแจ้งผลทาง LINE ครับ</p>
      <button onClick={() => liff.closeWindow()} className="btn-primary mt-8 max-w-xs">ปิดหน้าต่าง</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header + Progress */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0">
        <h1 className="font-bold text-gray-800 text-lg">🚗 สมัครเป็นคนขับ</h1>
        <div className="flex gap-1 mt-3">
          {STEPS.map((s, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i <= step ? 'bg-green-500' : 'bg-gray-200'}`} />
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">{step + 1}/{STEPS.length} · {STEPS[step]}</p>
      </div>

      <div className="p-4">

        {/* Step 0: ข้อมูลส่วนตัว */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="card space-y-3">
              <p className="section-title">👤 ข้อมูลส่วนตัว</p>
              <Field label="ชื่อ *" value={form.first_name} onChange={v => set('first_name', v)} placeholder="ชื่อจริง" />
              <Field label="นามสกุล *" value={form.last_name} onChange={v => set('last_name', v)} placeholder="นามสกุล" />
              <Field label="เบอร์โทรศัพท์ *" value={form.phone} onChange={v => set('phone', v)} placeholder="08x-xxx-xxxx" type="tel" />
              <Field label="เลขบัตรประชาชน *" value={form.id_card_number} onChange={v => set('id_card_number', v)} placeholder="1-xxxx-xxxxx-xx-x" maxLength={17} />
            </div>
            <div className="card">
              <p className="section-title">📷 รูปบัตรประชาชน</p>
              <ImageUploadField
                label="ถ่ายรูปบัตรประชาชนทั้งใบ ชัดเจน"
                value={form.id_card_image_url}
                onChange={v => set('id_card_image_url', v)}
              />
            </div>
          </div>
        )}

        {/* Step 1: ใบขับขี่ */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="card space-y-3">
              <p className="section-title">🪪 ใบขับขี่</p>
              <Field label="หมายเลขใบขับขี่ *" value={form.license_number} onChange={v => set('license_number', v)} placeholder="00-xxxx-xxxxx" />
              <div>
                <label className="text-sm text-gray-600 mb-1 block">ประเภทใบขับขี่ *</label>
                <select className="input-field" value={form.license_type} onChange={e => set('license_type', e.target.value)}>
                  {LICENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <Field label="วันหมดอายุ *" value={form.license_expiry} onChange={v => set('license_expiry', v)} type="date" />
            </div>
            <div className="card">
              <p className="section-title">📷 รูปใบขับขี่</p>
              <ImageUploadField
                label="ถ่ายรูปใบขับขี่ ชัดเจน ครบทั้งใบ"
                value={form.license_image_url}
                onChange={v => set('license_image_url', v)}
              />
            </div>
          </div>
        )}

        {/* Step 2: ข้อมูลรถ */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="card space-y-3">
              <p className="section-title">🚗 ข้อมูลรถ</p>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">ประเภทรถ *</label>
                <div className="grid grid-cols-2 gap-2">
                  {CAR_TYPES.map(ct => (
                    <button key={ct.value} onClick={() => set('car_type', ct.value)}
                      className={`py-2 px-3 rounded-xl text-sm font-medium border text-left transition-all
                        ${form.car_type === ct.value ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                      {ct.label}
                    </button>
                  ))}
                </div>
              </div>
              <Field label="ยี่ห้อรถ *" value={form.car_brand} onChange={v => set('car_brand', v)} placeholder="เช่น Toyota, Honda" />
              <Field label="รุ่นรถ *" value={form.car_model} onChange={v => set('car_model', v)} placeholder="เช่น Camry, Vios" />
              <Field label="ปีรถ *" value={form.car_year} onChange={v => set('car_year', v)} type="number" placeholder="2020" />
              <Field label="สีรถ *" value={form.car_color} onChange={v => set('car_color', v)} placeholder="เช่น ขาว เงิน ดำ" />
              <Field label="ทะเบียนรถ *" value={form.car_plate} onChange={v => set('car_plate', v)} placeholder="กข 1234 กรุงเทพ" />
            </div>
            <div className="card space-y-3">
              <ImageUploadField label="📷 รูปรถ (ด้านข้าง เห็นทะเบียนชัดเจน)" value={form.car_image_url} onChange={v => set('car_image_url', v)} />
              <ImageUploadField label="📄 กรมธรรม์ประกันภัย" value={form.car_insurance_url} onChange={v => set('car_insurance_url', v)} />
            </div>
          </div>
        )}

        {/* Step 3: AI ตรวจสอบ + ยืนยัน */}
        {step === 3 && (
          <div className="space-y-4">
            {!aiResult && !aiChecking && (
              <div className="card text-center py-6">
                <p className="text-4xl mb-3">🤖</p>
                <p className="font-semibold text-gray-800">ตรวจสอบเอกสารด้วย AI</p>
                <p className="text-sm text-gray-400 mt-1 mb-4">ระบบจะอ่านข้อมูลจากเอกสารของคุณโดยอัตโนมัติ</p>
                <button onClick={simulateAiCheck} className="btn-primary max-w-xs mx-auto">
                  🤖 เริ่มตรวจสอบ
                </button>
              </div>
            )}

            {aiChecking && (
              <div className="card text-center py-8">
                <div className="text-4xl mb-3 animate-spin">🔍</div>
                <p className="text-gray-600">AI กำลังอ่านเอกสาร...</p>
              </div>
            )}

            {aiResult && (
              <div className="space-y-3">
                <div className="card bg-blue-50 border border-blue-100">
                  <p className="font-semibold text-blue-800 mb-2">🤖 ผล AI ตรวจสอบ</p>
                  <p className="text-xs text-blue-600">กรุณาตรวจสอบและแก้ไขข้อมูลหากไม่ถูกต้อง</p>
                </div>

                {/* ยืนยัน/แก้ไขข้อมูลที่ AI อ่านได้ */}
                <div className="card space-y-3">
                  <p className="section-title">✏️ ยืนยันข้อมูลส่วนตัว</p>
                  <Field label="ชื่อ-นามสกุล" value={`${form.first_name} ${form.last_name}`} onChange={() => {}} readOnly />
                  <Field label="เลขบัตรประชาชน" value={form.id_card_number}
                    onChange={v => set('id_card_number', v)} placeholder="แก้ไขหาก AI อ่านผิด" />
                </div>

                <div className="card space-y-3">
                  <p className="section-title">✏️ ยืนยันข้อมูลใบขับขี่</p>
                  <Field label="หมายเลขใบขับขี่" value={form.license_number}
                    onChange={v => set('license_number', v)} placeholder="แก้ไขหาก AI อ่านผิด" />
                  <Field label="วันหมดอายุ" value={form.license_expiry}
                    onChange={v => set('license_expiry', v)} type="date" />
                </div>

                <div className="card space-y-3">
                  <p className="section-title">✏️ ยืนยันข้อมูลรถ</p>
                  <Field label="ทะเบียนรถ" value={form.car_plate}
                    onChange={v => set('car_plate', v)} placeholder="แก้ไขหาก AI อ่านผิด" />
                  <Field label="ยี่ห้อ/รุ่น" value={`${form.car_brand} ${form.car_model}`} onChange={() => {}} readOnly />
                </div>

                <div className="card bg-green-50 border border-green-200 text-sm text-green-700">
                  ✅ ข้อมูลถูกต้อง? กดปุ่มด้านล่างเพื่อส่งใบสมัคร ทีมงานจะตรวจสอบภายใน 1-2 วันทำการ
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
        <div className="flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="btn-secondary flex-1">← ย้อนกลับ</button>
          )}
          {step < 3 ? (
            <button onClick={() => setStep(s => s + 1)} className="btn-primary flex-1">ถัดไป →</button>
          ) : (
            <button onClick={handleSubmit} disabled={!aiResult || loading}
              className={`btn-primary flex-1 ${(!aiResult || loading) ? 'opacity-50' : ''}`}>
              {loading ? '⏳ กำลังส่ง...' : '📤 ส่งใบสมัคร'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function Field({ label, value, onChange, type = 'text', placeholder, maxLength, readOnly }) {
  return (
    <div>
      <label className="text-sm text-gray-600 mb-1 block">{label}</label>
      <input
        className={`input-field ${readOnly ? 'bg-gray-50 text-gray-500' : ''}`}
        type={type} value={value} placeholder={placeholder}
        maxLength={maxLength} readOnly={readOnly}
        onChange={e => !readOnly && onChange(e.target.value)}
      />
    </div>
  );
}

function ImageUploadField({ label, value, onChange }) {
  // ในระบบจริงใช้ LIFF camera API หรืออัปโหลดไปยัง Supabase Storage
  return (
    <div>
      <label className="text-sm text-gray-600 mb-1 block">{label}</label>
      {value ? (
        <div className="flex items-center gap-2">
          <span className="text-green-600 text-sm">✅ อัปโหลดแล้ว</span>
          <button onClick={() => onChange('')} className="text-xs text-red-500">ลบ</button>
        </div>
      ) : (
        <button
          onClick={() => {
            // TODO: เชื่อมต่อ Supabase Storage upload
            const url = prompt('วาง URL รูปภาพ (ชั่วคราว สำหรับ dev):');
            if (url) onChange(url);
          }}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-6 text-gray-400 text-sm text-center">
          📷 กดเพื่ออัปโหลดรูป
        </button>
      )}
    </div>
  );
}
