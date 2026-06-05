export default function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-green-50">
      <div className="text-6xl mb-4 animate-bounce">🚗</div>
      <h1 className="text-xl font-bold text-green-700">SMILE SERVICE</h1>
      <p className="text-green-500 text-sm mt-1">กำลังโหลด...</p>
    </div>
  );
}
