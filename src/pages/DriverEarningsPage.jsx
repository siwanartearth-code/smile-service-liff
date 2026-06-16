import { useState, useEffect } from 'react';
import { driversAPI } from '../services/api';
import liff from '@line/liff';

export default function DriverEarningsPage() {
  const [data,    setData]    = useState(null);
  const [period,  setPeriod]  = useState('30');
  const [tab,     setTab]     = useState('summary'); // summary | trips | payouts
  const [loading, setLoading] = useState(true);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [promptpayInput, setPromptpayInput] = useState('');
  const [payoutLoading,  setPayoutLoading]  = useState(false);

  useEffect(() => {
    setLoading(true);
    driversAPI.getMyEarnings(period)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  const s = data?.summary || {};
  const camPct = data ? Math.min(100, Math.round(((data.camera_fund_total || 0) / (data.camera_threshold || 4000)) * 100)) : 0;

  const handleRequestPayout = async () => {
    if (!promptpayInput.trim()) { alert('กรุณาใส่เบอร์ PromptPay'); return; }
    setPayoutLoading(true);
    try {
      await driversAPI.requestPayout(promptpayInput.trim());
      alert('✅ ส่งคำขอรับเงินแล้ว\nทีมงานจะโอนให้ภายใน 1-2 วันทำการ');
      setShowPayoutForm(false);
      // reload
      const r = await driversAPI.getMyEarnings(period);
      setData(r.data);
    } catch (err) {
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาด');
    } finally {
      setPayoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => liff.closeWindow()} className="text-xl text-gray-600">←</button>
          <h1 className="font-bold text-gray-800 text-lg">💰 รายได้ของฉัน</h1>
        </div>
        {/* Period */}
        <div className="flex gap-2 mt-3">
          {[['7','7 วัน'],['30','30 วัน'],['90','3 เดือน']].map(([v,l]) => (
            <button key={v} onClick={() => setPeriod(v)}
              className={`px-4 py-1 rounded-full text-sm font-medium border transition-all
                ${period===v ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-500 border-gray-200'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">⏳ กำลังโหลด...</div>
      ) : (
        <>
          {/* รายได้สุทธิ hero */}
          <div className="bg-green-600 px-4 py-5 text-white text-center">
            <p className="text-sm opacity-80">รายได้สุทธิ {period} วัน</p>
            <p className="text-4xl font-bold mt-1">฿{Math.round(s.net || 0).toLocaleString()}</p>
            <div className="flex justify-center gap-6 mt-3 text-sm opacity-90">
              <span>🚗 {s.trips || 0} เที่ยว</span>
              <span>🎁 Tip ฿{Math.round(s.tips || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Pending Payout Banner */}
          {(data?.pending_payout || 0) >= 100 && (
            <button onClick={() => setShowPayoutForm(true)}
              className="w-full bg-purple-600 text-white px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold">💸 ยอดค้างจ่าย ฿{Math.round(data.pending_payout).toLocaleString()}</span>
              <span className="text-xs bg-white text-purple-600 px-2 py-0.5 rounded-full font-bold">ขอรับเงิน →</span>
            </button>
          )}

          {/* Tabs */}
          <div className="flex bg-white border-b border-gray-100">
            {[['summary','สรุป'],['trips','แต่ละเที่ยว'],['payouts','ประวัติรับเงิน']].map(([v,l]) => (
              <button key={v} onClick={() => setTab(v)}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-all
                  ${tab===v ? 'border-green-600 text-green-700' : 'border-transparent text-gray-400'}`}>
                {l}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-4">

            {/* ── Tab: Summary ── */}
            {tab === 'summary' && (
              <>
                <div className="card space-y-3">
                  <p className="section-title">รายละเอียดรายได้</p>
                  <Row label="รายได้รวมก่อนหัก" value={`฿${Math.round(s.gross||0).toLocaleString()}`} />
                  <Row label="ค่า commission (15%)" value={`-฿${Math.round(s.fee||0).toLocaleString()}`} negative />
                  <Row label="กองทุนกล้อง" value={`-฿${Math.round(s.cam_fund||0).toLocaleString()}`} negative />
                  <Row label="Tip จากลูกค้า" value={`+฿${Math.round(s.tips||0).toLocaleString()}`} green />
                  <div className="pt-3 border-t border-gray-100">
                    <Row label="รับจริง" value={`฿${Math.round(s.net||0).toLocaleString()}`} bold />
                  </div>
                </div>

                {/* Daily chart */}
                {data?.daily?.length > 0 && (
                  <div className="card">
                    <p className="section-title mb-3">รายวัน</p>
                    <div className="space-y-2">
                      {data.daily.slice(0,7).map(d => (
                        <div key={d.date} className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-20 flex-shrink-0">
                            {new Date(d.date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
                          </span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${Math.min(100, (d.net / (data.daily[0]?.net||1)) * 100)}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-700 w-16 text-right">
                            ฿{Math.round(d.net).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Camera fund */}
                {!data?.has_camera && (
                  <div className="card">
                    <p className="section-title">📷 กองทุนกล้องสะสม</p>
                    <div className="flex justify-between text-sm mb-2 mt-2">
                      <span className="text-gray-500">สะสมแล้ว</span>
                      <span className="font-bold text-green-600">
                        ฿{Math.round(data?.camera_fund_total||0).toLocaleString()} / ฿{(data?.camera_threshold||4000).toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${camPct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {camPct >= 100 ? '🎉 ครบแล้ว! กล้องกำลังส่งให้คุณ'
                        : `อีก ฿${Math.round((data?.camera_threshold||4000)-(data?.camera_fund_total||0)).toLocaleString()} จะได้รับกล้อง`}
                    </p>
                    <div className="mt-3 bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
                      💡 มีกล้อง = commission ต่ำลง 2% + ได้งานก่อน
                    </div>
                  </div>
                )}
                {data?.has_camera && (
                  <div className="card bg-green-50 border border-green-200 text-center py-4">
                    <p className="text-2xl mb-1">📷</p>
                    <p className="font-bold text-green-800">คุณมีกล้องติดรถแล้ว!</p>
                    <p className="text-xs text-green-600 mt-1">commission พิเศษ + ได้งานก่อน</p>
                  </div>
                )}
              </>
            )}

            {/* ── Tab: Per-trip ── */}
            {tab === 'trips' && (
              <div className="space-y-3">
                {data?.trips?.length === 0 && (
                  <p className="text-center text-gray-400 py-10">ไม่มีรายการในช่วงนี้</p>
                )}
                {data?.trips?.map((t, i) => (
                  <div key={t.id || i} className="card">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-xs text-gray-400">{formatDate(t.created_at)}</p>
                        <p className="text-sm font-semibold text-gray-700 mt-0.5">#{t.booking_number}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-700">฿{Math.round(t.net_amount||0).toLocaleString()}</p>
                        <p className="text-xs text-gray-400">สุทธิ</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 truncate">📍 {t.pickup_address}</p>
                    <p className="text-xs text-gray-500 truncate">🏥 {t.dropoff_address}</p>
                    <div className="flex gap-3 mt-2 text-xs text-gray-400">
                      <span>รวม ฿{Math.round(t.gross_amount||0)}</span>
                      <span>COM -฿{Math.round(t.platform_fee||0)}</span>
                      {t.tip_amount > 0 && <span className="text-green-600">TIP +฿{Math.round(t.tip_amount)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Tab: Payouts ── */}
            {tab === 'payouts' && (
              <div className="space-y-3">
                {data?.payouts?.length === 0 && (
                  <p className="text-center text-gray-400 py-10">ยังไม่มีประวัติรับเงิน</p>
                )}
                {data?.payouts?.map((p, i) => (
                  <div key={p.id || i} className="card flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-400">{formatDate(p.created_at)}</p>
                      <p className="text-sm font-semibold mt-0.5">
                        {p.status === 'paid' ? '✅ โอนแล้ว' : p.status === 'cancelled' ? '❌ ยกเลิก' : '⏳ รอโอน'}
                      </p>
                      {p.promptpay_id && <p className="text-xs text-gray-400 mt-0.5">📱 {p.promptpay_id}</p>}
                    </div>
                    <p className={`font-bold text-lg ${p.status==='paid' ? 'text-green-700' : 'text-gray-400'}`}>
                      ฿{Math.round(p.amount||0).toLocaleString()}
                    </p>
                  </div>
                ))}
                {(data?.pending_payout || 0) >= 100 && (
                  <button onClick={() => setShowPayoutForm(true)}
                    className="btn-primary bg-purple-600">
                    💸 ขอรับเงิน ฿{Math.round(data.pending_payout).toLocaleString()}
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Payout Modal */}
      {showPayoutForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={() => setShowPayoutForm(false)}>
          <div className="w-full max-w-md bg-white rounded-t-2xl p-5 pb-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <p className="font-bold text-gray-800">💸 ขอรับเงิน</p>
              <button onClick={() => setShowPayoutForm(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <p className="text-sm text-gray-600 mb-1">ยอดที่จะได้รับ</p>
            <p className="text-3xl font-bold text-purple-700 mb-4">฿{Math.round(data?.pending_payout||0).toLocaleString()}</p>
            <label className="text-sm text-gray-600 mb-1 block">เบอร์ PromptPay รับเงิน *</label>
            <input className="input-field mb-3" type="tel" value={promptpayInput}
              onChange={e => setPromptpayInput(e.target.value)}
              placeholder="เบอร์มือถือที่ผูก PromptPay เช่น 0812345678" />
            <p className="text-xs text-gray-400 mb-4">ทีมงานจะโอนเงินให้ภายใน 1-2 วันทำการ</p>
            <button onClick={handleRequestPayout} disabled={payoutLoading}
              className="btn-primary bg-purple-600 disabled:opacity-50">
              {payoutLoading ? '⏳ กำลังส่ง...' : 'ยืนยันขอรับเงิน'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, negative, green, bold }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`font-${bold?'bold':'medium'} ${negative?'text-red-500':green?'text-green-600':'text-gray-800'}`}>{value}</span>
    </div>
  );
}
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('th-TH', { timeZone:'Asia/Bangkok', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}
