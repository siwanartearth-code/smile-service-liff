import { useState, useEffect, useRef, useCallback } from 'react';
import { bookingsAPI } from '../services/api';

// ── Leaflet loader (เหมือน MapPicker) ────────────────────────────────────────
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
let leafletPromise = null;
function loadLeaflet() {
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise(resolve => {
    if (window.L) return resolve(window.L);
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = LEAFLET_CSS;
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.onload = () => resolve(window.L);
    document.body.appendChild(script);
  });
  return leafletPromise;
}

// ── Status steps ──────────────────────────────────────────────────────────────
const STATUS_STEPS = [
  { key: 'confirmed',      label: 'ยืนยันแล้ว',        icon: '✅', color: '#6B7280' },
  { key: 'driver_arrived', label: 'คนขับมาถึงแล้ว',    icon: '🚗', color: '#F97316' },
  { key: 'in_progress',    label: 'กำลังเดินทาง',       icon: '🛣️', color: '#3B82F6' },
  { key: 'completed',      label: 'ถึงที่หมายแล้ว',     icon: '🎉', color: '#1D9E75' },
];
const STATUS_ORDER = STATUS_STEPS.map(s => s.key);

function timeSince(isoDate) {
  if (!isoDate) return null;
  const sec = Math.floor((Date.now() - new Date(isoDate)) / 1000);
  if (sec < 10)  return 'เพิ่งอัปเดต';
  if (sec < 60)  return `${sec} วินาทีที่แล้ว`;
  if (sec < 3600) return `${Math.floor(sec/60)} นาทีที่แล้ว`;
  return `${Math.floor(sec/3600)} ชั่วโมงที่แล้ว`;
}

// ── Map Component ─────────────────────────────────────────────────────────────
function TrackingMap({ booking }) {
  const mapRef    = useRef(null);
  const mapObj    = useRef(null);
  const driverPin = useRef(null);
  const initialized = useRef(false);

  const driverLat = booking?.current_lat;
  const driverLng = booking?.current_lng;
  const pickupLat = booking?.pickup_lat;
  const pickupLng = booking?.pickup_lng;
  const dropoffLat = booking?.dropoff_lat;
  const dropoffLng = booking?.dropoff_lng;

  // สร้างแผนที่ครั้งแรก
  useEffect(() => {
    if (initialized.current || !mapRef.current) return;
    initialized.current = true;

    loadLeaflet().then(L => {
      // Center: ใช้ driver ถ้ามี ไม่งั้นใช้ pickup
      const centerLat = driverLat || pickupLat || 16.4326;
      const centerLng = driverLng || pickupLng || 102.8282;

      const map = L.map(mapRef.current, {
        center: [centerLat, centerLng],
        zoom: 14,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // หมุดรับ (เขียว)
      if (pickupLat && pickupLng) {
        const pickIcon = L.divIcon({
          html: `<div style="font-size:28px;line-height:1">🟢</div>`,
          iconAnchor: [14, 14], iconSize: [28, 28], className: '',
        });
        L.marker([pickupLat, pickupLng], { icon: pickIcon })
          .bindPopup(`<b>📍 จุดรับ</b><br>${booking.pickup_address}`)
          .addTo(map);
      }

      // หมุดส่ง (แดง)
      if (dropoffLat && dropoffLng) {
        const dropIcon = L.divIcon({
          html: `<div style="font-size:28px;line-height:1">🔴</div>`,
          iconAnchor: [14, 14], iconSize: [28, 28], className: '',
        });
        L.marker([dropoffLat, dropoffLng], { icon: dropIcon })
          .bindPopup(`<b>🏥 จุดส่ง</b><br>${booking.dropoff_address}`)
          .addTo(map);
      }

      // หมุดคนขับ (รถ)
      if (driverLat && driverLng) {
        const drvIcon = L.divIcon({
          html: `<div style="font-size:32px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))">🚗</div>`,
          iconAnchor: [16, 16], iconSize: [32, 32], className: '',
        });
        driverPin.current = L.marker([driverLat, driverLng], { icon: drvIcon })
          .bindPopup('<b>คนขับ</b>')
          .addTo(map);
      }

      // Fit bounds ให้เห็นทุกจุด
      const points = [];
      if (pickupLat && pickupLng)  points.push([pickupLat, pickupLng]);
      if (dropoffLat && dropoffLng) points.push([dropoffLat, dropoffLng]);
      if (driverLat && driverLng)   points.push([driverLat, driverLng]);
      if (points.length >= 2) map.fitBounds(points, { padding: [40, 40] });

      mapObj.current = map;
    });
  }, []); // eslint-disable-line

  // อัปเดตหมุดคนขับเมื่อพิกัดเปลี่ยน
  useEffect(() => {
    if (!mapObj.current || !driverLat || !driverLng) return;
    const L = window.L;
    if (!L) return;

    if (driverPin.current) {
      // เลื่อนหมุดเดิม (smooth)
      driverPin.current.setLatLng([driverLat, driverLng]);
    } else {
      // สร้างหมุดใหม่ถ้ายังไม่มี
      const drvIcon = L.divIcon({
        html: `<div style="font-size:32px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))">🚗</div>`,
        iconAnchor: [16, 16], iconSize: [32, 32], className: '',
      });
      driverPin.current = L.marker([driverLat, driverLng], { icon: drvIcon })
        .bindPopup('<b>คนขับ</b>')
        .addTo(mapObj.current);
    }
  }, [driverLat, driverLng]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function TrackingPage() {
  const params    = new URLSearchParams(window.location.search);
  const bookingId = params.get('booking');

  const [booking,    setBooking]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [tick,       setTick]       = useState(0);  // สำหรับ re-render timeSince
  const intervalRef = useRef(null);
  const tickRef     = useRef(null);

  const fetchBooking = useCallback(async () => {
    if (!bookingId) return;
    try {
      const { data } = await bookingsAPI.getBooking(bookingId);
      setBooking(data);
      if (data.location_updated_at) setLastUpdate(data.location_updated_at);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
    // Poll ทุก 5 วินาที
    intervalRef.current = setInterval(fetchBooking, 5000);
    // อัปเดต "เมื่อกี้" ทุก 10 วิ
    tickRef.current = setInterval(() => setTick(t => t + 1), 10000);
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(tickRef.current);
    };
  }, [fetchBooking]);

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
  const activeStep  = STATUS_STEPS[currentStep];
  const hasDriver   = !!booking.current_lat;
  const isActive    = ['driver_arrived', 'in_progress'].includes(booking.status);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-800">📍 ติดตามรถ</h1>
            <p className="text-xs text-gray-400">#{booking.booking_number}</p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-bold ${activeStep?.color ? '' : 'text-gray-600'}`}
               style={{ color: activeStep?.color }}>
              {activeStep?.icon} {activeStep?.label}
            </p>
            {hasDriver && (
              <p className="text-xs text-gray-400">
                {isActive ? '🟢 ออนไลน์ · ' : ''}
                {timeSince(lastUpdate) || 'กำลังโหลด'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* แผนที่ */}
      <div style={{ height: '45vh', flexShrink: 0, position: 'relative' }}>
        {(booking.pickup_lat || booking.current_lat) ? (
          <TrackingMap booking={booking} />
        ) : (
          <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center text-gray-400">
            <p className="text-4xl mb-2">🗺️</p>
            <p className="text-sm">แผนที่จะแสดงเมื่อคนขับเริ่มเดินทาง</p>
          </div>
        )}

        {/* Refresh badge */}
        <div className="absolute bottom-3 right-3 bg-white rounded-full px-3 py-1 text-xs text-gray-400 shadow-md">
          ↺ อัปเดตทุก 5 วิ
        </div>

        {/* Driver moving indicator */}
        {isActive && hasDriver && (
          <div className="absolute top-3 left-3 bg-green-500 text-white rounded-full px-3 py-1 text-xs font-semibold shadow-md flex items-center gap-1">
            <span className="w-2 h-2 bg-white rounded-full animate-ping inline-block" />
            กำลังเดินทาง
          </div>
        )}
      </div>

      {/* Bottom panel - scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        {/* Completed */}
        {booking.status === 'completed' && (
          <div className="card bg-green-50 border border-green-200 text-center py-4">
            <p className="text-3xl mb-1">🎉</p>
            <p className="font-bold text-green-800 text-lg">ถึงที่หมายปลอดภัยแล้ว!</p>
            {booking.final_price && <p className="text-green-600 mt-1">ค่าบริการ ฿{booking.final_price}</p>}
          </div>
        )}

        {/* Status Steps */}
        <div className="card">
          <p className="text-xs text-gray-400 mb-3 font-medium">ขั้นตอนการเดินทาง</p>
          <div className="space-y-3">
            {STATUS_STEPS.map((step, i) => {
              const done   = i <= currentStep;
              const active = i === currentStep;
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0 transition-all
                    ${active ? 'ring-4 ring-green-100' : ''}`}
                    style={{ background: done ? step.color + '22' : '#F3F4F6' }}>
                    {done
                      ? <span style={{ color: step.color }}>{step.icon}</span>
                      : <span className="text-gray-300 text-sm">○</span>}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${done ? 'text-gray-800' : 'text-gray-300'}`}>
                      {step.label}
                    </p>
                    {active && (
                      <p className="text-xs animate-pulse" style={{ color: step.color }}>
                        ● สถานะปัจจุบัน
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Driver Info */}
        {booking.driver_name && (
          <div className="card">
            <p className="text-xs text-gray-400 mb-2 font-medium">คนขับของคุณ</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">
                🧑‍✈️
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-800">{booking.driver_name}</p>
                <p className="text-sm text-gray-500">
                  {booking.car_brand} {booking.car_model}
                  {booking.car_color ? ` · สี${booking.car_color}` : ''}
                </p>
                {booking.car_plate && (
                  <p className="text-sm font-bold text-gray-700 mt-0.5">
                    🔢 {booking.car_plate}
                  </p>
                )}
              </div>
            </div>

            {/* Google Maps link */}
            {booking.current_lat && (
              <a
                href={`https://maps.google.com/?q=${booking.current_lat},${booking.current_lng}`}
                target="_blank" rel="noreferrer"
                className="mt-3 w-full py-2 rounded-xl border border-blue-200 text-blue-600 text-sm font-semibold flex items-center justify-center gap-2 bg-blue-50">
                🗺️ เปิดตำแหน่งคนขับใน Google Maps
              </a>
            )}
          </div>
        )}

        {/* Trip Info */}
        <div className="card space-y-2 text-sm text-gray-600">
          <p className="text-xs text-gray-400 font-medium mb-2">รายละเอียดการเดินทาง</p>
          <div className="flex gap-2">
            <span className="text-green-500">●</span>
            <span className="text-gray-800 flex-1">{booking.pickup_address}</span>
          </div>
          <div className="flex gap-2 pl-2 border-l-2 border-dashed border-gray-200 ml-1.5">
            <span className="invisible">●</span>
          </div>
          <div className="flex gap-2">
            <span className="text-red-400">●</span>
            <span className="text-gray-800 flex-1">{booking.dropoff_address}</span>
          </div>
          <div className="pt-2 border-t border-gray-100 text-xs text-gray-400">
            🕐 {new Date(booking.scheduled_at).toLocaleString('th-TH', {
              timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short',
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
