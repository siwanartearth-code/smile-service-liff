import { useState, useEffect, useRef } from 'react';
import { paymentsAPI } from '../services/api';
import liff from '@line/liff';

export default function PaymentPage({ bookingId, bookingNumber, estimatedAmount }) {
  const [qrImage,  setQrImage]  = useState(null);
  const [amount,   setAmount]   = useState(estimatedAmount || 0);
  const [status,   setStatus]   = useState('pending');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const pollRef = useRef(null);

  // ── ดึง QR + สร้าง payment record ─────────────────────────────────────────
  useEffect(() => {
    paymentsAPI.initiate(bookingId, estimatedAmount)
      .then(({ data }) => {
        setQrImage(data.qr);
        setAmount(data.amount);
        setStatus(data.payment?.status || 'pending');
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.error || 'โหลดข้อมูลไม่สำเร็จ');
        setLoading(false);
      });
  }, [bookingId]);  // eslint-disable-line

  // ── Polling payment status ─────────────────────────────────────────────────
  useEffect(() => {
    if (loading || status === 'paid' || status === 'failed') return;

    pollRef.current = setInterval(async () => {
      try {
        const { data } = await paymentsAPI.getStatus(bookingId);
        setStatus(data.status);
        if (data.status === 'paid' || data.status === 'failed') {
          clearInterval(pollRef.current);
        }
      } catch {}
    }, 5000);

    return () => clearInterval(pollRef.current);
  }, [loading, status, bookingId]);

  const handleOpenLine = () => {
    const lineOAId = import.meta.env.VITE_LINE_OA_ID || '';
    if (liff.isInClient()) {
      liff.openWindow({ url: `https://line.me/R/oaMessage/${lineOAId}`, external: false });
    } else {
      window.open(`https://line.me/R/oaMessage/${lineOAId}`, '_blank');
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-pulse">🏦</div>
        <p className="text-gray-500">กำลังสร้าง QR Code...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50">
      <div className="text-5xl mb-4">❌</div>
      <p className="text-red-500 font-semibold">{error}</p>
      <button onClick={() => window.location.reload()} className="btn-primary mt-4">ลองใหม่</button>
    </div>
  );

  // ── ชำระแล้ว ───────────────────────────────────────────────────────────────
  if (status === 'paid') return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="text-7xl mb-4">✅</div>
      <h2 className="text-2xl font-bold text-green-800">ชำระเงินสำเร็จ!</h2>
      <p className="text-green-600 mt-2">กำลังหาคนขับให้คุณ 🚗</p>
      <p className="text-sm text-gray-500 mt-1">จะแจ้งเตือนทาง LINE เมื่อคนขับรับงาน</p>
      <div className="bg-white rounded-2xl shadow-sm p-4 mt-6 w-full text-left space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">หมายเลขจอง</span>
          <span className="font-bold">{bookingNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">ยอดชำระ</span>
          <span className="font-bold text-green-700">฿{Number(amount).toLocaleString()}</span>
        </div>
      </div>
      <button onClick={() => liff.closeWindow()} className="btn-primary mt-6">ปิดหน้าต่าง</button>
    </div>
  );

  // ── รอ Admin ตรวจ ──────────────────────────────────────────────────────────
  if (status === 'manual_review') return (
    <div className="min-h-screen bg-yellow-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="text-6xl mb-4">📋</div>
      <h2 className="text-xl font-bold text-yellow-800">รอการตรวจสอบ</h2>
      <p className="text-yellow-700 mt-3 text-sm leading-relaxed">
        เจ้าหน้าที่กำลังตรวจสอบสลิปของคุณ<br />
        โปรดรอสักครู่ (ไม่เกิน 10 นาที)
      </p>
      <div className="flex items-center gap-2 mt-6 text-xs text-gray-400">
        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
        ตรวจสอบสถานะทุก 5 วินาที
      </div>
    </div>
  );

  // ── ปฏิเสธ ────────────────────────────────────────────────────────────────
  if (status === 'failed') return (
    <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="text-6xl mb-4">❌</div>
      <h2 className="text-xl font-bold text-red-800">ชำระเงินไม่สำเร็จ</h2>
      <p className="text-red-600 mt-2 text-sm">สลิปไม่ผ่านการตรวจสอบ<br />กรุณาติดต่อเจ้าหน้าที่</p>
      <button onClick={handleOpenLine} className="btn-primary mt-6 bg-green-500">💬 ติดต่อเจ้าหน้าที่</button>
    </div>
  );

  // ── หน้าหลัก: แสดง QR ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-6">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10 text-center">
        <h1 className="font-bold text-gray-800 text-lg">💳 ชำระเงิน</h1>
        <p className="text-xs text-gray-400 mt-0.5">{bookingNumber}</p>
      </div>

      <div className="p-4 space-y-4">

        {/* ยอดชำระ */}
        <div className="bg-green-600 rounded-2xl p-5 text-center text-white">
          <p className="text-sm opacity-80 mb-1">ยอดชำระทั้งหมด</p>
          <p className="text-5xl font-bold">฿{Number(amount).toLocaleString()}</p>
          <p className="text-xs opacity-70 mt-2">PromptPay • ชำระครั้งเดียว</p>
        </div>

        {/* QR Code */}
        <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
          <p className="text-sm font-semibold text-gray-700 mb-4">📱 สแกน QR เพื่อโอนเงิน</p>
          {qrImage ? (
            <img
              src={qrImage}
              alt="PromptPay QR Code"
              className="mx-auto rounded-xl border border-gray-100"
              style={{ width: 220, height: 220 }}
            />
          ) : (
            <div className="mx-auto rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-sm"
              style={{ width: 220, height: 220 }}>
              <div className="text-center p-4">
                <p className="text-3xl mb-2">⚙️</p>
                <p>QR ยังไม่พร้อม</p>
                <p className="text-xs mt-1">กรุณาโอนผ่านเบอร์ PromptPay โดยตรง</p>
              </div>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-3">
            รองรับทุกแอปธนาคาร และ LINE Pay / TrueMoney
          </p>
        </div>

        {/* ขั้นตอน */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">📋 ขั้นตอนการชำระ</p>
          <div className="space-y-2">
            {[
              { icon: '1️⃣', text: `สแกน QR หรือโอนผ่าน PromptPay` },
              { icon: '2️⃣', text: `โอนยอด ฿${Number(amount).toLocaleString()} ให้ครบ` },
              { icon: '3️⃣', text: `บันทึกภาพ Screenshot สลิป` },
              { icon: '4️⃣', text: `กดปุ่ม "ส่งสลิป" ด้านล่างแล้วส่งรูปในแชท LINE` },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3 py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-lg leading-none">{step.icon}</span>
                <p className="text-sm text-gray-600 flex-1">{step.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ปุ่มส่งสลิป */}
        <button
          onClick={handleOpenLine}
          className="w-full py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2 shadow-lg"
          style={{ background: 'linear-gradient(135deg,#00B900,#00d900)' }}
        >
          <span className="text-2xl">📤</span>
          ส่งสลิปผ่าน LINE
        </button>

        <p className="text-xs text-gray-400 text-center leading-relaxed">
          กดปุ่มนี้เพื่อเปิดแชท LINE OA แล้วส่งรูปสลิป<br />
          ระบบตรวจสอบอัตโนมัติ ✅ ไม่เกิน 30 วินาที
        </p>

        {/* polling indicator */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          ตรวจสอบสถานะทุก 5 วินาที
        </div>

      </div>
    </div>
  );
}
