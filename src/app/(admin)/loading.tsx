export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full bg-slate-50/50">
      <div className="relative flex items-center justify-center">
        {/* Outer Ring */}
        <div className="animate-spin rounded-full h-14 w-14 border-4 border-slate-200 border-t-blue-600"></div>
        {/* Inner Logo/Dot */}
        <div className="absolute h-5 w-5 rounded-full bg-blue-600/20 animate-pulse"></div>
      </div>
      <h2 className="text-slate-600 font-bold mt-4 text-base animate-pulse">กำลังโหลดข้อมูล...</h2>
      <p className="text-slate-400 text-sm mt-1">โปรดรอสักครู่ ระบบกำลังดึงข้อมูลล่าสุด</p>
    </div>
  );
}
