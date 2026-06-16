import { useState } from 'react';
import liff from '@line/liff';

const DOCS = [
  {
    id: 'contract',
    icon: '📄',
    title: 'สัญญาคนขับ SMILE SERVICE',
    sections: [
      { heading: '1. ข้อตกลงทั่วไป', body: 'คนขับตกลงให้บริการรับ-ส่งผู้สูงอายุและผู้ที่ต้องการความช่วยเหลือ ภายใต้มาตรฐานที่ SMILE SERVICE กำหนด โดยมีความสุภาพ ระมัดระวัง และใส่ใจผู้โดยสารเป็นอันดับแรก' },
      { heading: '2. ค่าตอบแทน', body: 'คนขับได้รับ 85% ของค่าบริการ (หลังหักค่า commission 15%) โดยจะมีการจ่ายเมื่อมีการร้องขอ ขั้นต่ำ ฿100 ภายใน 1-2 วันทำการ' },
      { heading: '3. กล้องบันทึกภาพ', body: 'คนขับต้องติดตั้งกล้องบันทึกภาพในรถ โดยระบบจะช่วยออกค่ากล้องผ่านกองทุนสะสม ฿4,000 คนขับที่มีกล้องได้รับ commission พิเศษและได้งานก่อน' },
      { heading: '4. การยกเลิกและปฏิเสธงาน', body: 'ปฏิเสธงานได้ไม่เกิน 3 ครั้งต่อวัน หากเกินจะถูกพักสถานะชั่วคราว การยกเลิกงานหลังยืนยันแล้วต้องมีเหตุผลสมควร' },
      { heading: '5. ความประพฤติ', body: 'ห้ามสูบบุหรี่ ห้ามดื่มแอลกอฮอล์ขณะขับรถ ต้องแต่งกายสะอาดเรียบร้อย มีมารยาทกับผู้โดยสาร และช่วยเหลือผู้โดยสารขึ้น-ลงรถ' },
    ],
  },
  {
    id: 'rules',
    icon: '📋',
    title: 'กฎระเบียบและมาตรฐาน',
    sections: [
      { heading: '✅ สิ่งที่ต้องทำ', body: '• ถึงจุดรับก่อนเวลานัดอย่างน้อย 5 นาที\n• โทรแจ้งผู้โดยสารเมื่อถึงหน้าบ้าน\n• ช่วยพยุงผู้โดยสารขึ้น-ลงรถ\n• เปิด-ปิดประตูให้ผู้โดยสาร\n• รายงานสถานะผ่านแอปทุกขั้นตอน\n• แจ้งทันทีหากมีเหตุฉุกเฉิน' },
      { heading: '❌ สิ่งที่ห้ามทำ', body: '• ห้ามขอเงินเพิ่มนอกจากที่ระบุ\n• ห้ามพาผู้โดยสารไปส่งผิดที่\n• ห้ามใช้โทรศัพท์ขณะขับรถ\n• ห้ามนำผู้ร่วมโดยสารอื่นขึ้นรถ\n• ห้ามออกรถหากผู้โดยสารยังไม่นั่งเรียบร้อย' },
      { heading: '⭐ มาตรฐานคะแนน', body: 'คะแนน 4.5+ = ระดับ GOLD ได้งานก่อน\nคะแนน 4.0-4.4 = ระดับ SILVER\nคะแนน < 3.5 = ถูกพักสถานะเพื่อปรับปรุง' },
    ],
  },
  {
    id: 'vehicles',
    icon: '🚗',
    title: 'มาตรฐานรถยนต์',
    sections: [
      { heading: 'ประเภทรถที่รับ', body: '🚗 รถเก๋ง — 4-5 ที่นั่ง เหมาะรับ-ส่งทั่วไป\n🚐 รถตู้ — 7-9 ที่นั่ง สำหรับผู้ที่ต้องการพื้นที่กว้าง\n♿ รถวีลแชร์ — ติดตั้งทางลาดพิเศษ\n⚡ รถ EV — ไฟฟ้า เงียบและสะอาด' },
      { heading: 'เกณฑ์รถ', body: '• อายุรถไม่เกิน 10 ปี\n• ผ่านการตรวจสภาพรถ (พ.ร.บ.)\n• ประกันภัยชั้น 1 หรือชั้น 2\n• ภายในรถสะอาด ไม่มีกลิ่น\n• เบาะนั่งไม่ฉีกขาด\n• ระบบแอร์ทำงานปกติ' },
      { heading: 'อุปกรณ์บังคับ', body: '• กล้องบันทึกภาพหน้า-หลัง\n• เข็มขัดนิรภัยครบทุกที่นั่ง\n• ปฐมพยาบาลเบื้องต้น (ถ้ามี)\n• ที่จอดเท้าสำหรับผู้สูงอายุขึ้นรถ' },
    ],
  },
  {
    id: 'faq',
    icon: '❓',
    title: 'คำถามที่พบบ่อย',
    sections: [
      { heading: 'รายได้จ่ายเมื่อไร?', body: 'คนขับสามารถขอรับเงินได้ทุกเมื่อ เมื่อมียอดสะสมถึง ฿100 ขึ้นไป ทีมงานจะโอนผ่าน PromptPay ภายใน 1-2 วันทำการ' },
      { heading: 'ถ้ารถเสียระหว่างทางทำอย่างไร?', body: 'แจ้งทีมงานทันทีผ่านแชท LINE OA พร้อมบอกตำแหน่ง ทีมงานจะประสานหาคนขับสำรองให้โดยเร็วที่สุด' },
      { heading: 'ผู้โดยสารมีอาการฉุกเฉินในรถ?', body: 'หยุดรถในจุดปลอดภัย โทร 1669 (EMS) ทันที แล้วแจ้งทีมงานพร้อมตำแหน่งที่อยู่' },
      { heading: 'อยากเปลี่ยนประเภทรถทำอย่างไร?', body: 'ติดต่อทีมงานผ่าน LINE OA พร้อมส่งรูปถ่ายรถใหม่ ทีมงานจะตรวจสอบและอัปเดตให้ภายใน 1 วัน' },
      { heading: 'commission 15% นับยังไง?', body: 'ค่าบริการลูกค้าชำระ ÷ 85% = รายได้สุทธิที่คนขับได้รับ เช่น ลูกค้าจ่าย ฿300 → คนขับได้ ฿255 (ก่อนหักกองทุนกล้อง ถ้ายังไม่มีกล้อง)' },
    ],
  },
];

export default function DriverDocumentsPage() {
  const [openDoc, setOpenDoc] = useState(null);
  const [openSection, setOpenSection] = useState(null);

  if (openDoc) {
    const doc = DOCS.find(d => d.id === openDoc);
    return (
      <div className="min-h-screen bg-gray-50 pb-8">
        <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => { setOpenDoc(null); setOpenSection(null); }} className="text-xl text-gray-600">←</button>
            <div>
              <h1 className="font-bold text-gray-800">{doc.icon} {doc.title}</h1>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {doc.sections.map((s, i) => (
            <div key={i} className="card overflow-hidden">
              <button
                onClick={() => setOpenSection(openSection === i ? null : i)}
                className="w-full text-left flex justify-between items-center py-1">
                <span className="font-semibold text-gray-800 text-sm">{s.heading}</span>
                <span className="text-gray-400 text-lg">{openSection === i ? '▲' : '▼'}</span>
              </button>
              {openSection === i && (
                <p className="text-sm text-gray-600 leading-relaxed mt-2 pt-2 border-t border-gray-100 whitespace-pre-line">
                  {s.body}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => liff.closeWindow()} className="text-xl text-gray-600">←</button>
          <h1 className="font-bold text-gray-800 text-lg">📚 เอกสารคนขับ</h1>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-sm text-gray-500 px-1">เอกสารสำคัญสำหรับคนขับ SMILE SERVICE</p>

        {DOCS.map(doc => (
          <button key={doc.id} onClick={() => { setOpenDoc(doc.id); setOpenSection(null); }}
            className="card w-full text-left flex items-center gap-4 active:bg-gray-50">
            <span className="text-3xl">{doc.icon}</span>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">{doc.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{doc.sections.length} หัวข้อ • แตะเพื่ออ่าน</p>
            </div>
            <span className="text-gray-300 text-xl">›</span>
          </button>
        ))}

        {/* ติดต่อทีมงาน */}
        <div className="card bg-green-50 border border-green-200 mt-4">
          <p className="font-semibold text-green-800 mb-2">💬 ติดต่อทีมงาน</p>
          <p className="text-sm text-green-700">มีคำถามหรือปัญหา ติดต่อได้ทาง LINE OA ตลอด 7.00-21.00 น.</p>
          <button
            onClick={() => {
              const lineOAId = import.meta.env.VITE_LINE_OA_ID || '';
              if (liff.isInClient()) liff.openWindow({ url: `https://line.me/R/oaMessage/${lineOAId}`, external: false });
              else window.open(`https://line.me/R/oaMessage/${lineOAId}`, '_blank');
            }}
            className="mt-3 w-full py-2.5 rounded-xl font-semibold text-sm text-white"
            style={{ background: '#00B900' }}>
            💬 แชทกับทีมงาน
          </button>
        </div>
      </div>
    </div>
  );
}
