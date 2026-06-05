import { useState } from 'react';
import { bookingsAPI } from '../services/api';
import liff from '@line/liff';

const QUICK_TAGS = ['ขับดี', 'ตรงเวลา', 'ใจดี', 'ดูแลดี', 'รถสะอาด', 'ช่วยเหลือดี', 'สุภาพ', 'ปลอดภัย'];
const TIP_OPTIONS = [0, 20, 50, 100, 200];

export default function ReviewPage() {
  const params = new URLSearchParams(window.location.search);
  const bookingId = params.get('booking');

  const [stars, setStars] = useState(5);
  const [tags, setTags] = useState([]);
  const [comment, setComment] = useState('');
  const [tip, setTip] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const toggleTag = (t) =>
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const handleSubmit = async () => {
    if (!bookingId) return;
    setLoading(true);
    try {
      await bookingsAPI.submitReview(bookingId, { stars, tags, comment, tip_amount: tip });
      setDone(true);
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="text-6xl mb-4">⭐</div>
      <h2 className="text-xl font-bold text-green-800">ขอบคุณสำหรับรีวิว!</h2>
      <p className="text-green-600 mt-1 text-sm">รีวิวของคุณช่วยให้บริการดียิ่งขึ้น</p>
      {tip > 0 && <p className="text-green-700 font-semibold mt-2">💝 Tip ฿{tip} ส่งถึงคนขับแล้ว</p>}
      <button onClick={() => liff.closeWindow()} className="btn-primary mt-8 w-full max-w-xs">ปิดหน้าต่าง</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0">
        <h1 className="font-bold text-gray-800 text-lg">⭐ รีวิวคนขับ</h1>
      </div>

      <div className="p-4 space-y-4">

        {/* ดาว */}
        <div className="card text-center">
          <p className="text-gray-500 text-sm mb-3">ให้คะแนนการเดินทางครั้งนี้</p>
          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} onClick={() => setStars(s)}
                className={`text-4xl transition-transform active:scale-90 ${s <= stars ? '' : 'opacity-25'}`}>
                ⭐
              </button>
            ))}
          </div>
          <p className="text-green-600 font-semibold mt-2 text-sm">
            {['', 'ควรปรับปรุง', 'พอใช้', 'ดี', 'ดีมาก', 'ดีเยี่ยม!'][stars]}
          </p>
        </div>

        {/* Quick tags */}
        <div className="card">
          <p className="section-title">กดเลือกสิ่งที่ประทับใจ</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_TAGS.map(t => (
              <button key={t} onClick={() => toggleTag(t)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all
                  ${tags.includes(t)
                    ? 'bg-green-500 text-white border-green-500'
                    : 'bg-white text-gray-600 border-gray-200'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div className="card">
          <p className="section-title">ความคิดเห็นเพิ่มเติม</p>
          <textarea className="input-field" rows={3} value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="บอกเล่าประสบการณ์การเดินทางครั้งนี้..." />
        </div>

        {/* Tip */}
        <div className="card">
          <p className="section-title">💝 ให้ Tip คนขับ (100% ถึงคนขับโดยตรง)</p>
          <div className="flex gap-2 flex-wrap">
            {TIP_OPTIONS.map(t => (
              <button key={t} onClick={() => setTip(t)}
                className={`flex-1 min-w-14 py-2 rounded-xl text-sm font-semibold border transition-all
                  ${tip === t
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-gray-600 border-gray-200'}`}>
                {t === 0 ? 'ไม่ให้' : `฿${t}`}
              </button>
            ))}
          </div>
          {tip > 0 && (
            <p className="text-xs text-orange-600 mt-2 text-center">
              ✨ Tip ฿{tip} จะส่งถึงคนขับโดยตรง 100%
            </p>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
        <button onClick={handleSubmit} disabled={loading}
          className={`btn-primary ${loading ? 'opacity-50' : ''}`}>
          {loading ? '⏳ กำลังส่ง...' : `⭐ ส่งรีวิว${tip > 0 ? ` + Tip ฿${tip}` : ''}`}
        </button>
      </div>
    </div>
  );
}
