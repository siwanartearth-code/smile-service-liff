import { useEffect, useRef, useState } from 'react';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

// โหลด Leaflet แบบ dynamic (ไม่ต้อง npm install)
let leafletPromise = null;
function loadLeaflet() {
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve) => {
    if (window.L) return resolve(window.L);
    // CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = LEAFLET_CSS;
    document.head.appendChild(link);
    // JS
    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.onload = () => resolve(window.L);
    document.body.appendChild(script);
  });
  return leafletPromise;
}

// Reverse geocode ด้วย Nominatim (OpenStreetMap)
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=th`,
      { headers: { 'Accept-Language': 'th' } }
    );
    const data = await res.json();
    const addr = data.address || {};
    return {
      province:    addr.state || addr.province || '',
      district:    addr.city || addr.county || addr.district || addr.town || '',
      subdistrict: addr.suburb || addr.quarter || addr.village || addr.hamlet || '',
      road:        addr.road || '',
      display:     data.display_name || '',
    };
  } catch {
    return null;
  }
}

export default function MapPicker({ initialLat, initialLng, label, onConfirm, onClose }) {
  const mapRef    = useRef(null);
  const mapObj    = useRef(null);
  const markerRef = useRef(null);
  const [pos, setPos]         = useState({ lat: initialLat || 16.4326, lng: initialLng || 102.8282 });
  const [address, setAddress] = useState('กำลังโหลดแผนที่...');
  const [loading, setLoading] = useState(false);
  const [ready, setReady]     = useState(false);

  // โหลด Leaflet และสร้างแผนที่
  useEffect(() => {
    let mounted = true;
    loadLeaflet().then((L) => {
      if (!mounted || !mapRef.current || mapObj.current) return;

      const map = L.map(mapRef.current, {
        center: [pos.lat, pos.lng],
        zoom: 15,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      // Custom icon
      const icon = L.divIcon({
        html: `<div style="font-size:36px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))">📍</div>`,
        iconAnchor: [18, 36],
        iconSize: [36, 36],
        className: '',
      });

      const marker = L.marker([pos.lat, pos.lng], { icon, draggable: true }).addTo(map);

      // Drag end → reverse geocode
      marker.on('dragend', async () => {
        const latlng = marker.getLatLng();
        setPos({ lat: latlng.lat, lng: latlng.lng });
        setAddress('กำลังค้นหาที่อยู่...');
        const geo = await reverseGeocode(latlng.lat, latlng.lng);
        setAddress(geo?.display || `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`);
      });

      // Click on map → move marker
      map.on('click', async (e) => {
        marker.setLatLng(e.latlng);
        setPos({ lat: e.latlng.lat, lng: e.latlng.lng });
        setAddress('กำลังค้นหาที่อยู่...');
        const geo = await reverseGeocode(e.latlng.lat, e.latlng.lng);
        setAddress(geo?.display || `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`);
      });

      mapObj.current    = map;
      markerRef.current = marker;
      setReady(true);

      // Reverse geocode ตำแหน่งเริ่มต้น
      reverseGeocode(pos.lat, pos.lng).then(geo => {
        if (geo) setAddress(geo.display);
      });
    });
    return () => { mounted = false; };
  }, []);

  // ปักหมุดตำแหน่งปัจจุบัน (GPS)
  const goToCurrentLocation = () => {
    if (!navigator.geolocation) return alert('ไม่รองรับ GPS');
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (p) => {
      const { latitude: lat, longitude: lng } = p.coords;
      setPos({ lat, lng });
      mapObj.current?.setView([lat, lng], 16);
      markerRef.current?.setLatLng([lat, lng]);
      const geo = await reverseGeocode(lat, lng);
      setAddress(geo?.display || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      setLoading(false);
    }, () => { setLoading(false); alert('ไม่สามารถดึง GPS ได้'); }, { enableHighAccuracy: true, timeout: 10000 });
  };

  // ยืนยัน
  const handleConfirm = async () => {
    setLoading(true);
    const geo = await reverseGeocode(pos.lat, pos.lng);
    onConfirm({ lat: pos.lat, lng: pos.lng, geo });
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', background: '#fff' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', background: '#1D9E75', color: '#fff', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>←</button>
        <div>
          <p style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>📍 {label || 'เลือกตำแหน่ง'}</p>
          <p style={{ fontSize: 11, margin: 0, opacity: 0.85 }}>ลากหมุดหรือแตะบนแผนที่เพื่อเลือกตำแหน่ง</p>
        </div>
      </div>

      {/* แผนที่ */}
      <div ref={mapRef} style={{ flex: 1, width: '100%' }} />

      {/* Bottom Panel */}
      <div style={{ padding: 16, background: '#fff', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
        {/* GPS Button */}
        <button onClick={goToCurrentLocation} disabled={loading}
          style={{ width: '100%', padding: '10px', marginBottom: 10, borderRadius: 10, border: '2px dashed #1D9E75', background: '#f0fdf4', color: '#1D9E75', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {loading ? '⏳ กำลังดึงตำแหน่ง...' : '🎯 ตำแหน่งของฉัน (GPS)'}
        </button>

        {/* ที่อยู่ */}
        <div style={{ background: '#f9fafb', borderRadius: 10, padding: '10px 12px', marginBottom: 12, fontSize: 13, color: '#374151', minHeight: 44 }}>
          <span style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 2 }}>ที่อยู่ที่เลือก:</span>
          {address}
        </div>

        {/* ยืนยัน */}
        <button onClick={handleConfirm} disabled={!ready || loading}
          style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: ready ? '#1D9E75' : '#9ca3af', color: '#fff', fontWeight: 700, fontSize: 16, cursor: ready ? 'pointer' : 'not-allowed' }}>
          ✅ ยืนยันตำแหน่งนี้
        </button>
      </div>
    </div>
  );
}
