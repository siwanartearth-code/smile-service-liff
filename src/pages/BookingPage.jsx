import { useState, useEffect, useCallback } from 'react';
import { bookingsAPI, addressesAPI } from '../services/api';
import liff from '@line/liff';
import { PROVINCES, getDistricts, getSubdistricts, haversineKm } from '../data/thaiLocations';
import { getHospitals } from '../data/hospitals';
import MapPicker from '../components/MapPicker';

const CAR_TYPES = [
  { value: 'sedan',          label: '🚗 รถเก๋ง',       desc: 'สะดวก ประหยัด' },
  { value: 'van',            label: '🚐 รถตู้',        desc: 'กว้างขวาง นั่งสบาย' },
  { value: 'wheelchair_van', label: '♿ รถวีลแชร์',     desc: 'สำหรับผู้ใช้วีลแชร์' },
  { value: 'ev_sedan',       label: '⚡ รถไฟฟ้าเก๋ง', desc: 'เงียบ ประหยัด' },
];

const DEST_TYPE = { HOSPITAL: 'hospital', OTHER: 'other' };

const ADDR_LABEL_EMOJI = { 'บ้าน': '🏠', 'โรงพยาบาล': '🏥', 'ที่ทำงาน': '💼', 'แม่': '👩', 'พ่อ': '👴', 'ปู่': '👴', 'ย่า': '👵', 'ตา': '👴', 'ยาย': '👵' };

function initPickup() {
  return { houseNo: '', moo: '', soi: '', road: '', detail: '', province: '', district: '', subdistrict: '', lat: null, lng: null };
}
function initDest() {
  return { type: DEST_TYPE.HOSPITAL, province: '', district: '', hospital: '', hospitalLat: null, hospitalLng: null, other: '', otherLat: null, otherLng: null };
}

export default function BookingPage({ user }) {
  const [step, setStep]       = useState(1);
  const [passenger, setPass]  = useState({ name: user?.display_name || '', phone: '', note: '' });
  const [pickup, setPickup]   = useState(initPickup());
  const [dest, setDest]       = useState(initDest());
  const [carType, setCarType] = useState('sedan');
  const [scheduledAt, setSched] = useState('');
  const [distance, setDist]   = useState(null);          // คำนวณ auto
  const [distOverride, setDistOverride] = useState('');  // แก้ manual
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  // MapPicker state
  const [mapTarget, setMapTarget] = useState(null); // 'pickup' | 'dest'
  // Saved addresses
  const [savedAddrs, setSavedAddrs]   = useState([]);
  const [saveDialog, setSaveDialog]   = useState(false);  // แสดง dialog บันทึก
  const [saveLabel,  setSaveLabel]    = useState('บ้าน');
  const [editAddr,   setEditAddr]     = useState(null);   // address ที่กำลัง edit
  const [addrLoaded, setAddrLoaded]   = useState(false);

  const setP = (k, v) => setPass(p => ({ ...p, [k]: v }));
  const setPick = (k, v) => setPickup(p => ({ ...p, [k]: v }));
  const setDe = (k, v) => setDest(d => ({ ...d, [k]: v }));

  // เมื่อยืนยันพิกัดจาก MapPicker
  const handleMapConfirm = useCallback(({ lat, lng, geo }) => {
    if (mapTarget === 'pickup') {
      setPick('lat', lat);
      setPick('lng', lng);
      // auto-fill ที่อยู่จาก reverse geocode (ถ้ามี)
      if (geo) {
        if (geo.road && !pickup.road)      setPick('road', geo.road);
        // ไม่ force-overwrite province/district เพราะ Nominatim คืน EN บางที
        // แต่ถ้ายังไม่ได้เลือกไว้ ลองใส่ให้ (คร่าวๆ)
      }
    } else if (mapTarget === 'dest') {
      setDe('otherLat', lat);
      setDe('otherLng', lng);
      if (geo?.display && !dest.other) setDe('other', geo.display.slice(0, 200));
    }
    setMapTarget(null);
  }, [mapTarget, pickup, dest]);

  // ── คำนวณระยะทาง อัตโนมัติเมื่อมีพิกัดทั้งสองจุด ──────────────
  const pickLat = pickup.lat, pickLng = pickup.lng;
  const destLat = dest.type === DEST_TYPE.HOSPITAL ? dest.hospitalLat : dest.otherLat;
  const destLng = dest.type === DEST_TYPE.HOSPITAL ? dest.hospitalLng : dest.otherLng;

  useEffect(() => {
    if (pickLat && pickLng && destLat && destLng) {
      const km = haversineKm(pickLat, pickLng, destLat, destLng);
      setDist(km);
      setDistOverride('');
    }
  }, [pickLat, pickLng, destLat, destLng]);

  const effectiveDistance = distOverride ? parseFloat(distOverride) : (distance || 10);

  // ── ดึงราคาประมาณ ───────────────────────────────────────────────
  useEffect(() => {
    if (!carType || !effectiveDistance) return;
    const t = setTimeout(async () => {
      try {
        const { data } = await bookingsAPI.getEstimate(carType, effectiveDistance, Math.round(effectiveDistance * 2.5));
        setEstimate(data);
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [carType, effectiveDistance]);

  // ── โหลด + auto-fill ที่อยู่ที่บันทึก ──────────────────────────
  useEffect(() => {
    addressesAPI.getAll().then(({ data }) => {
      setSavedAddrs(data);
      setAddrLoaded(true);
      // Auto-fill ที่อยู่ default ถ้ายังไม่ได้กรอก
      const def = data.find(a => a.is_default) || data[0];
      if (def && !pickup.houseNo && !pickup.province) {
        applyAddress(def);
      }
    }).catch(() => setAddrLoaded(true));
  }, []); // eslint-disable-line

  // apply ที่อยู่ที่เลือก → กรอกช่องทั้งหมด
  const applyAddress = (addr) => {
    setPickup(p => ({
      ...p,
      houseNo:    addr.house_no    || '',
      moo:        addr.moo         || '',
      soi:        addr.soi         || '',
      road:       addr.road        || '',
      detail:     addr.detail      || '',
      province:   addr.province    || '',
      district:   addr.district    || '',
      subdistrict: addr.subdistrict || '',
      lat:        addr.lat || null,
      lng:        addr.lng || null,
    }));
    if (addr.id) addressesAPI.recordUse(addr.id).catch(() => {});
  };

  // บันทึกที่อยู่ปัจจุบัน
  const handleSaveAddress = async () => {
    if (savedAddrs.length >= 3 && !editAddr) {
      alert('บันทึกได้สูงสุด 3 ที่อยู่ กรุณาลบที่อยู่เดิมก่อน');
      return;
    }
    const payload = {
      label:       saveLabel,
      house_no:    pickup.houseNo,
      moo:         pickup.moo,
      soi:         pickup.soi,
      road:        pickup.road,
      detail:      pickup.detail,
      province:    pickup.province,
      district:    pickup.district,
      subdistrict: pickup.subdistrict,
      lat:         pickup.lat,
      lng:         pickup.lng,
    };
    try {
      if (editAddr) {
        const { data } = await addressesAPI.update(editAddr.id, payload);
        setSavedAddrs(prev => prev.map(a => a.id === editAddr.id ? data : a));
      } else {
        const { data } = await addressesAPI.save(payload);
        setSavedAddrs(prev => [...prev, data]);
      }
      setSaveDialog(false);
      setEditAddr(null);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  // ลบที่อยู่
  const handleDeleteAddress = async (addr) => {
    if (!confirm(`ลบ "${addr.label}" ?`)) return;
    await addressesAPI.remove(addr.id).catch(() => {});
    setSavedAddrs(prev => prev.filter(a => a.id !== addr.id));
  };

  // ── เปิด MapPicker ─────────────────────────────────────────────
  const openMap = (target) => setMapTarget(target);

  // ── ที่อยู่ต้นทางเป็น string ─────────────────────────────────────
  const pickupAddress = [
    pickup.houseNo && `${pickup.houseNo}`,
    pickup.moo && `หมู่ ${pickup.moo}`,
    pickup.soi && `ซอย${pickup.soi}`,
    pickup.road && `ถนน${pickup.road}`,
    pickup.detail,
    pickup.subdistrict && `ต.${pickup.subdistrict}`,
    pickup.district && `อ.${pickup.district}`,
    pickup.province && `จ.${pickup.province}`,
  ].filter(Boolean).join(' ');

  const dropoffAddress = dest.type === DEST_TYPE.HOSPITAL
    ? [dest.hospital, dest.district && `อ.${dest.district}`, dest.province && `จ.${dest.province}`].filter(Boolean).join(' ')
    : dest.other;

  // ── Submit ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        passenger_name: passenger.name,
        passenger_phone: passenger.phone,
        passenger_note: passenger.note,
        pickup_address: pickupAddress,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_address: dropoffAddress,
        dropoff_lat: destLat,
        dropoff_lng: destLng,
        scheduled_at: scheduledAt,
        car_type: carType,
        booking_type: 'available',
        estimated_distance: effectiveDistance,
        estimated_duration: Math.round(effectiveDistance * 2.5),
      };
      const { data } = await bookingsAPI.createBooking(payload);
      setSuccess(data);
      setStep(5);
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // ── MapPicker Modal (แสดงซ้อนทุก step เมื่อเปิดอยู่) ─────────────
  if (mapTarget) {
    const isPickup = mapTarget === 'pickup';
    return (
      <MapPicker
        label={isPickup ? 'เลือกตำแหน่งรับ (ต้นทาง)' : 'เลือกตำแหน่งปลายทาง'}
        initialLat={isPickup ? (pickup.lat || 16.4326) : (dest.otherLat || 16.4326)}
        initialLng={isPickup ? (pickup.lng || 102.8282) : (dest.otherLng || 102.8282)}
        onConfirm={handleMapConfirm}
        onClose={() => setMapTarget(null)}
      />
    );
  }

  // ════════════════════════════════════════════════════════════════
  // STEP 1 — ข้อมูลผู้โดยสาร + ต้นทาง
  // ════════════════════════════════════════════════════════════════
  if (step === 1) {
    const pickDistricts = getDistricts(
      PROVINCES.find(p => p.name === pickup.province)?.code || ''
    );
    const pickSubs = getSubdistricts(
      pickDistricts.find(d => d.name === pickup.district)?.code || ''
    );

    const onSubSelect = (name) => {
      const sub = pickSubs.find(s => s.name === name);
      setPick('subdistrict', name);
      if (sub?.lat) { setPick('lat', sub.lat); setPick('lng', sub.lng); }
    };

    const step1Valid = passenger.name && pickup.houseNo && pickup.province && pickup.district;

    return (
      <div className="min-h-screen bg-gray-50 pb-28">
        <Header title="จองรถรับส่ง" />
        <div className="p-4 space-y-4">

          {/* ผู้โดยสาร */}
          <Card title="👤 ข้อมูลผู้โดยสาร">
            <Field label="ชื่อผู้โดยสาร *">
              <input className="input-field" value={passenger.name} onChange={e => setP('name', e.target.value)} placeholder="ชื่อ-นามสกุล" />
            </Field>
            <Field label="เบอร์โทร">
              <input className="input-field" type="tel" value={passenger.phone} onChange={e => setP('phone', e.target.value)} placeholder="08x-xxx-xxxx" />
            </Field>
            <Field label="หมายเหตุพิเศษ">
              <textarea className="input-field" rows={2} value={passenger.note} onChange={e => setP('note', e.target.value)} placeholder="เช่น: ใช้ walker, ต้องการนั่งตรงหน้า" />
            </Field>
          </Card>

          {/* ══ ที่อยู่ที่บันทึก (quick-select) ══ */}
          {addrLoaded && savedAddrs.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-2 px-1">📂 ที่อยู่ที่บันทึกไว้</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {savedAddrs.map(addr => (
                  <div key={addr.id}
                    className="flex-shrink-0 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm min-w-[140px] max-w-[180px]">
                    <div className="flex items-center justify-between mb-1">
                      <button onClick={() => applyAddress(addr)}
                        className="font-semibold text-green-700 text-sm truncate flex-1 text-left">
                        {ADDR_LABEL_EMOJI[addr.label] || '📍'} {addr.label}
                        {addr.is_default && <span className="ml-1 text-xs text-gray-400">★</span>}
                      </button>
                      <div className="flex gap-1 ml-1 flex-shrink-0">
                        <button onClick={() => { setEditAddr(addr); setSaveLabel(addr.label); setSaveDialog(true); }}
                          className="text-gray-400 text-xs p-0.5">✏️</button>
                        <button onClick={() => handleDeleteAddress(addr)}
                          className="text-gray-400 text-xs p-0.5">🗑️</button>
                      </div>
                    </div>
                    <button onClick={() => applyAddress(addr)}
                      className="text-xs text-gray-500 truncate text-left w-full">
                      {[addr.house_no, addr.district && `อ.${addr.district}`, addr.province && `จ.${addr.province}`].filter(Boolean).join(' ')}
                    </button>
                  </div>
                ))}
                {savedAddrs.length < 3 && (
                  <button onClick={() => { setEditAddr(null); setSaveLabel('บ้าน'); setSaveDialog(true); }}
                    className="flex-shrink-0 border-2 border-dashed border-gray-300 rounded-xl px-4 py-2 text-gray-400 text-sm font-medium min-w-[100px] flex flex-col items-center justify-center gap-1">
                    <span className="text-xl">+</span>
                    <span className="text-xs">เพิ่มที่อยู่</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ต้นทาง */}
          <Card title="📍 สถานที่รับ (ต้นทาง)">
            <div className="grid grid-cols-2 gap-2">
              <Field label="บ้านเลขที่ *">
                <input className="input-field" value={pickup.houseNo} onChange={e => setPick('houseNo', e.target.value)} placeholder="123/45" />
              </Field>
              <Field label="หมู่ที่">
                <input className="input-field" value={pickup.moo} onChange={e => setPick('moo', e.target.value)} placeholder="1" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="ซอย">
                <input className="input-field" value={pickup.soi} onChange={e => setPick('soi', e.target.value)} placeholder="ซอย..." />
              </Field>
              <Field label="ถนน">
                <input className="input-field" value={pickup.road} onChange={e => setPick('road', e.target.value)} placeholder="ถนน..." />
              </Field>
            </div>
            <Field label="รายละเอียดเพิ่มเติม">
              <input className="input-field" value={pickup.detail} onChange={e => setPick('detail', e.target.value)} placeholder="เช่น: บ้านสีเขียว ใกล้วัด" />
            </Field>

            <div className="border-t border-gray-100 pt-3 mt-1 space-y-2">
              <Field label="จังหวัด *">
                <select className="input-field" value={pickup.province} onChange={e => { setPick('province', e.target.value); setPick('district', ''); setPick('subdistrict', ''); setPick('lat', null); setPick('lng', null); }}>
                  <option value="">-- เลือกจังหวัด --</option>
                  {PROVINCES.map(p => <option key={p.code} value={p.name}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="อำเภอ/เขต *">
                <select className="input-field" value={pickup.district} onChange={e => { setPick('district', e.target.value); setPick('subdistrict', ''); }} disabled={!pickup.province || pickDistricts.length === 0}>
                  <option value="">-- เลือกอำเภอ --</option>
                  {pickDistricts.map(d => <option key={d.code} value={d.name}>{d.name}</option>)}
                </select>
                {pickup.province && pickDistricts.length === 0 && <p className="text-xs text-orange-500 mt-1">กรุณาพิมพ์ชื่ออำเภอด้วยตนเอง</p>}
                {pickup.province && pickDistricts.length === 0 && <input className="input-field mt-1" value={pickup.district} onChange={e => setPick('district', e.target.value)} placeholder="พิมพ์ชื่ออำเภอ" />}
              </Field>
              <Field label="ตำบล/แขวง">
                {pickSubs.length > 0
                  ? <select className="input-field" value={pickup.subdistrict} onChange={e => onSubSelect(e.target.value)}>
                      <option value="">-- เลือกตำบล --</option>
                      {pickSubs.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
                    </select>
                  : <input className="input-field" value={pickup.subdistrict} onChange={e => setPick('subdistrict', e.target.value)} placeholder="พิมพ์ชื่อตำบล" />
                }
              </Field>
            </div>

            {/* Map Pin Button */}
            <button
              onClick={() => openMap('pickup')}
              className="mt-3 w-full py-3 rounded-xl border-2 border-dashed border-green-400 text-green-700 text-sm font-semibold flex items-center justify-center gap-2 bg-green-50 active:bg-green-100"
            >
              🗺️ {pickup.lat ? 'เปลี่ยนตำแหน่งบนแผนที่' : 'เลือกตำแหน่งบนแผนที่'}
            </button>
            {pickup.lat
              ? <p className="text-xs text-green-600 text-center mt-1">✅ ปักหมุดแล้ว ({pickup.lat.toFixed(4)}, {pickup.lng.toFixed(4)}) — กดเพื่อเลื่อนหมุด</p>
              : <p className="text-xs text-gray-400 text-center mt-1">💡 แตะเพื่อเลือกตำแหน่งบนแผนที่ — เลื่อนหมุดได้เองถ้าจองให้ผู้อื่น</p>
            }
          </Card>

          {/* 💾 บันทึกที่อยู่นี้ */}
          {pickup.houseNo && pickup.province && (
            <button
              onClick={() => { setEditAddr(null); setSaveLabel('บ้าน'); setSaveDialog(true); }}
              className="w-full py-2.5 rounded-xl border border-dashed border-blue-400 text-blue-600 text-sm font-medium flex items-center justify-center gap-2 bg-blue-50 active:bg-blue-100"
            >
              💾 บันทึกที่อยู่นี้ไว้ใช้ครั้งหน้า
            </button>
          )}

          {/* เวลารับ */}
          <Card title="🕐 เวลารับ *">
            <input className="input-field" type="datetime-local" value={scheduledAt}
              min={new Date(Date.now() + 30*60000).toISOString().slice(0,16)}
              onChange={e => setSched(e.target.value)} />
          </Card>
        </div>
        <BottomBar label="ถัดไป: ปลายทาง →" disabled={!step1Valid || !scheduledAt} onClick={() => setStep(2)} />

        {/* ══ Save Address Dialog ══ */}
        {saveDialog && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setSaveDialog(false)}>
            <div className="w-full max-w-md bg-white rounded-t-2xl p-5 pb-8" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-gray-800 text-base">
                  {editAddr ? '✏️ แก้ไขที่อยู่' : '💾 บันทึกที่อยู่'}
                </p>
                <button onClick={() => setSaveDialog(false)} className="text-gray-400 text-xl leading-none">✕</button>
              </div>

              <label className="text-sm text-gray-600 mb-1 block">ชื่อที่อยู่</label>
              <div className="flex gap-2 flex-wrap mb-3">
                {['บ้าน', 'โรงพยาบาล', 'ที่ทำงาน', 'อื่นๆ'].map(preset => (
                  <button key={preset} onClick={() => setSaveLabel(preset)}
                    className={`px-3 py-1 rounded-full text-sm border transition-all ${saveLabel === preset ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                    {ADDR_LABEL_EMOJI[preset] || '📍'} {preset}
                  </button>
                ))}
              </div>
              <input
                className="input-field mb-1"
                value={saveLabel}
                onChange={e => setSaveLabel(e.target.value)}
                placeholder="หรือพิมพ์ชื่อเอง เช่น แม่, ปู่, ตา..."
                maxLength={20}
              />
              {editAddr && (
                <p className="text-xs text-gray-400 mb-3">
                  ที่อยู่จะอัปเดตเป็นข้อมูลปัจจุบันในฟอร์ม
                </p>
              )}
              {!editAddr && (
                <p className="text-xs text-gray-400 mb-3">
                  📍 {[pickup.houseNo, pickup.district && `อ.${pickup.district}`, pickup.province && `จ.${pickup.province}`].filter(Boolean).join(' ')}
                </p>
              )}
              <button
                onClick={handleSaveAddress}
                disabled={!saveLabel.trim()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                {editAddr ? 'บันทึกการแก้ไข' : 'บันทึกที่อยู่นี้'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // STEP 2 — ปลายทาง
  // ════════════════════════════════════════════════════════════════
  if (step === 2) {
    const destDistricts = getDistricts(
      PROVINCES.find(p => p.name === dest.province)?.code || ''
    );
    const hospitals = getHospitals(
      destDistricts.find(d => d.name === dest.district)?.code || ''
    );

    const onHospitalSelect = (name) => {
      setDe('hospital', name);
      const h = hospitals.find(h => h.name === name);
      if (h?.lat) { setDe('hospitalLat', h.lat); setDe('hospitalLng', h.lng); }
      else { setDe('hospitalLat', null); setDe('hospitalLng', null); }
    };

    const step2Valid = dest.type === DEST_TYPE.HOSPITAL
      ? (dest.hospital)
      : (dest.other);

    return (
      <div className="min-h-screen bg-gray-50 pb-28">
        <Header title="เลือกปลายทาง" onBack={() => setStep(1)} />
        <div className="p-4 space-y-4">

          {/* ประเภทปลายทาง */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            {[{ v: DEST_TYPE.HOSPITAL, label: '🏥 โรงพยาบาล' }, { v: DEST_TYPE.OTHER, label: '📌 สถานที่อื่น' }].map(t => (
              <button key={t.v} onClick={() => setDe('type', t.v)}
                className={`flex-1 py-3 text-sm font-semibold transition-all ${dest.type === t.v ? 'bg-green-600 text-white' : 'bg-white text-gray-600'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {dest.type === DEST_TYPE.HOSPITAL && (
            <Card title="🏥 เลือกโรงพยาบาล">
              <Field label="จังหวัด">
                <select className="input-field" value={dest.province} onChange={e => { setDe('province', e.target.value); setDe('district', ''); setDe('hospital', ''); }}>
                  <option value="">-- เลือกจังหวัด --</option>
                  {PROVINCES.map(p => <option key={p.code} value={p.name}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="อำเภอ/เขต">
                <select className="input-field" value={dest.district} onChange={e => { setDe('district', e.target.value); setDe('hospital', ''); }} disabled={!dest.province || destDistricts.length === 0}>
                  <option value="">-- เลือกอำเภอ --</option>
                  {destDistricts.map(d => <option key={d.code} value={d.name}>{d.name}</option>)}
                </select>
                {dest.province && destDistricts.length === 0 && <input className="input-field mt-1" value={dest.district} onChange={e => { setDe('district', e.target.value); setDe('hospital', ''); }} placeholder="พิมพ์ชื่ออำเภอ" />}
              </Field>
              <Field label="โรงพยาบาล">
                {hospitals.length > 0
                  ? <select className="input-field" value={dest.hospital} onChange={e => onHospitalSelect(e.target.value)}>
                      <option value="">-- เลือกโรงพยาบาล --</option>
                      {hospitals.map(h => <option key={h.name} value={h.name}>{h.name}</option>)}
                    </select>
                  : <input className="input-field" value={dest.hospital} onChange={e => setDe('hospital', e.target.value)} placeholder="พิมพ์ชื่อโรงพยาบาล" />
                }
              </Field>
              {dest.hospitalLat && <p className="text-xs text-green-600 mt-1">✅ มีพิกัดโรงพยาบาล (จะคำนวณระยะทางอัตโนมัติ)</p>}
            </Card>
          )}

          {dest.type === DEST_TYPE.OTHER && (
            <Card title="📌 สถานที่อื่น">
              <Field label="ชื่อสถานที่ / ที่อยู่">
                <textarea className="input-field" rows={3} value={dest.other} onChange={e => setDe('other', e.target.value)} placeholder="เช่น: 123 ถ.มิตรภาพ ต.ในเมือง อ.เมือง จ.ขอนแก่น" />
              </Field>
              <button onClick={() => openMap('dest')}
                className="mt-2 w-full py-3 rounded-xl border-2 border-dashed border-green-400 text-green-700 text-sm font-semibold flex items-center justify-center gap-2 bg-green-50 active:bg-green-100">
                🗺️ {dest.otherLat ? 'เปลี่ยนตำแหน่งบนแผนที่' : 'เลือกตำแหน่งบนแผนที่'}
              </button>
              {dest.otherLat
                ? <p className="text-xs text-green-600 text-center mt-1">✅ ปักหมุดแล้ว ({dest.otherLat.toFixed(4)}, {dest.otherLng.toFixed(4)}) — กดเพื่อเลื่อนหมุด</p>
                : <p className="text-xs text-gray-400 text-center mt-1">💡 เลื่อนหมุดบนแผนที่เพื่อระบุตำแหน่งที่แน่นอน</p>
              }
            </Card>
          )}

          {/* แสดงระยะทาง */}
          {distance !== null && (
            <div className="card bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-800 font-semibold">📏 ระยะทางโดยประมาณ (คำนวณอัตโนมัติ)</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{distance} กม. <span className="text-sm font-normal text-blue-600">(เส้นตรง)</span></p>
              <p className="text-xs text-blue-500 mt-1">ระยะทางจริงบนถนนอาจต่างจากนี้ — คนขับและลูกค้าสามารถเสนอแก้ไขได้หลังจับคู่</p>
            </div>
          )}
        </div>
        <BottomBar label="ถัดไป: เลือกรถ →" disabled={!step2Valid} onClick={() => setStep(3)} />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // STEP 3 — เลือกรถ + ระยะทาง
  // ════════════════════════════════════════════════════════════════
  if (step === 3) return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <Header title="เลือกประเภทรถ" onBack={() => setStep(2)} />
      <div className="p-4 space-y-3">
        {CAR_TYPES.map(ct => (
          <button key={ct.value} onClick={() => setCarType(ct.value)}
            className={`card w-full text-left flex items-center gap-4 transition-all ${carType === ct.value ? 'ring-2 ring-green-500 bg-green-50' : ''}`}>
            <span className="text-3xl">{ct.label.split(' ')[0]}</span>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">{ct.label.slice(2)}</p>
              <p className="text-sm text-gray-500">{ct.desc}</p>
            </div>
            {carType === ct.value && <span className="text-green-500 text-xl">✓</span>}
          </button>
        ))}

        {/* ระยะทาง */}
        <Card title="📏 ระยะทาง">
          {distance !== null
            ? <>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">คำนวณอัตโนมัติ (เส้นตรง)</p>
                    <p className="text-xl font-bold text-green-700">{distance} กม.</p>
                  </div>
                  <div className="flex-1">
                    <label className="text-sm text-gray-500 block mb-1">แก้ไขเป็น (กม.)</label>
                    <input className="input-field" type="number" min="1" placeholder={distance}
                      value={distOverride} onChange={e => setDistOverride(e.target.value)} />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">💡 คนขับจะยืนยัน / เสนอแก้ไขระยะทางอีกครั้งก่อนเริ่มเดินทาง</p>
              </>
            : <>
                <label className="text-sm text-gray-500 block mb-1">ระยะทาง (กม.) *</label>
                <input className="input-field" type="number" min="1" max="500" value={distOverride || 10}
                  onChange={e => setDistOverride(e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">ปักหมุด GPS ทั้ง 2 จุด ระบบจะคำนวณให้อัตโนมัติ</p>
              </>
          }
        </Card>

        {estimate && (
          <div className="card bg-green-50 border border-green-200">
            <p className="font-semibold text-green-800 mb-2">💰 ราคาประมาณ</p>
            <div className="space-y-1 text-sm text-green-700">
              <div className="flex justify-between"><span>ค่าเริ่มต้น</span><span>฿{estimate.baseFare}</span></div>
              <div className="flex justify-between"><span>ค่าระยะทาง ({effectiveDistance} กม.)</span><span>฿{estimate.distanceFare}</span></div>
              <div className="flex justify-between font-bold text-base text-green-900 pt-1 border-t border-green-200">
                <span>รวม</span><span>฿{estimate.total}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">*ราคาจริงอาจต่างกันหลังตกลงระยะทาง</p>
          </div>
        )}
      </div>
      <BottomBar label="ถัดไป: ยืนยัน →" onClick={() => setStep(4)} />
    </div>
  );

  // ════════════════════════════════════════════════════════════════
  // STEP 4 — ยืนยัน
  // ════════════════════════════════════════════════════════════════
  if (step === 4) return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <Header title="ยืนยันการจอง" onBack={() => setStep(3)} />
      <div className="p-4 space-y-4">
        <div className="card space-y-2 text-sm">
          <Row label="👤 ผู้โดยสาร" value={passenger.name} />
          {passenger.phone && <Row label="📞 เบอร์โทร" value={passenger.phone} />}
          <Row label="📍 รับที่" value={pickupAddress} />
          <Row label="🏥 ส่งที่" value={dropoffAddress} />
          <Row label="🕐 เวลา" value={new Date(scheduledAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })} />
          <Row label="🚗 ประเภทรถ" value={CAR_TYPES.find(c => c.value === carType)?.label} />
          <Row label="📏 ระยะทาง" value={`${effectiveDistance} กม.`} />
          {passenger.note && <Row label="📝 หมายเหตุ" value={passenger.note} />}
          {estimate && (
            <div className="pt-2 border-t border-gray-100">
              <Row label="💰 ราคาประมาณ" value={`฿${estimate.total}`} bold />
            </div>
          )}
        </div>

        {(!pickup.lat || !destLat) && (
          <div className="card bg-yellow-50 border border-yellow-200">
            <p className="text-sm text-yellow-700">⚠️ ยังไม่มีพิกัด GPS ครบทั้งสองจุด — คนขับจะเสนอปรับระยะทางหลังรับงาน</p>
          </div>
        )}

        <div className="card bg-blue-50 border border-blue-100">
          <p className="text-sm text-blue-700">ℹ️ หลังยืนยัน ระบบหาคนขับทันที คุณจะได้รับแจ้งเตือนทาง LINE เมื่อคนขับรับงาน</p>
        </div>
      </div>
      <BottomBar label={loading ? '⏳ กำลังส่งข้อมูล...' : '✅ ยืนยันการจอง'} onClick={handleSubmit} disabled={loading} />
    </div>
  );

  // ════════════════════════════════════════════════════════════════
  // STEP 5 — สำเร็จ
  // ════════════════════════════════════════════════════════════════
  if (step === 5 && success) return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="text-6xl mb-4">🎉</div>
      <h2 className="text-xl font-bold text-green-800">จองสำเร็จแล้ว!</h2>
      <p className="text-green-600 mt-1">กำลังหาคนขับให้คุณ...</p>
      <div className="card mt-6 w-full text-left space-y-1 text-sm">
        <Row label="🔖 หมายเลข" value={success.booking?.booking_number} bold />
        <Row label="📏 ระยะทาง" value={`${effectiveDistance} กม.`} />
        <Row label="🔍 คนขับที่แจ้ง" value={`${success.driversNotified || 0} คน`} />
      </div>
      <p className="text-xs text-gray-400 mt-4">คนขับจะยืนยัน / เสนอปรับระยะทางก่อนเริ่มเดินทาง</p>
      <button onClick={() => liff.closeWindow()} className="btn-primary mt-6">ปิดหน้าต่าง</button>
    </div>
  );

  return null;
}

// ── Sub-components ────────────────────────────────────────────────
function Header({ title, onBack }) {
  return (
    <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
      {onBack && <button onClick={onBack} className="text-xl text-gray-600">←</button>}
      <h1 className="font-bold text-gray-800 text-lg">{title}</h1>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="card">
      {title && <p className="section-title mb-3">{title}</p>}
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-sm text-gray-600 mb-1 block">{label}</label>
      {children}
    </div>
  );
}

function BottomBar({ label, onClick, disabled }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-lg">
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
