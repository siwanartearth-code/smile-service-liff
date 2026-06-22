import { useEffect, useState } from 'react';

export default function LoadingScreen() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const getMessage = () => {
    if (seconds < 5)  return 'กำลังโหลด...';
    if (seconds < 15) return 'กำลังเชื่อมต่อ LINE...';
    if (seconds < 30) return 'กำลังปลุก server (ครั้งแรกใช้เวลาสักครู่)...';
    return 'รอสักครู่นะครับ เกือบเสร็จแล้ว...';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-green-50">
      <div className="text-6xl mb-4 animate-bounce">🚗</div>
      <h1 className="text-xl font-bold text-green-700">SMILE SERVICE</h1>
      <p className="text-green-500 text-sm mt-1">{getMessage()}</p>
      {seconds >= 15 && (
        <p className="text-gray-400 text-xs mt-3 px-8 text-center">
          Server กำลังเริ่มต้น ปกติใช้เวลา 30-60 วินาที<br/>ในครั้งต่อไปจะเร็วขึ้นครับ
        </p>
      )}
      <div className="mt-4 flex gap-1">
        {[0,1,2].map(i => (
          <div key={i} className="w-2 h-2 bg-green-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}
