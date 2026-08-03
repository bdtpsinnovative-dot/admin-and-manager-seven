import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  FileText,
  MoreHorizontal,
  Package,
  XCircle,
} from "lucide-react"
import { getDashboardData, type DashboardBranchSummary } from "../../../actions/dashboard"
import DashboardBranchFilter from "../../../components/DashboardBranchFilter"

const money = (value: number) =>
  value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const dateTime = (value: string) =>
  new Date(value).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

const statusClass = (status: string) => {
  if (status === "COMPLETED") return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (status === "CANCELLED") return "bg-red-50 text-red-700 border-red-200"
  return "bg-amber-50 text-amber-700 border-amber-200"
}

const statusLabel = (status: string) => {
  if (status === "COMPLETED") return "สำเร็จแล้ว"
  if (status === "CANCELLED") return "ยกเลิกแล้ว"
  if (status === "PROCESSING") return "กำลังดำเนินการ"
  return status || "ไม่ระบุสถานะ"
}

function BranchRow({ branch }: { branch: DashboardBranchSummary }) {
  return (
    <tr className="transition-colors hover:bg-slate-50">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold text-slate-800">{branch.name}</p>
            <p className="text-[11px] text-slate-400">รหัสสาขา {branch.id}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4 text-right font-bold text-slate-700">{branch.billCount.toLocaleString()}</td>
      <td className="px-5 py-4 text-right font-black text-emerald-600">฿{money(branch.netSales)}</td>
      <td className="px-5 py-4 text-right">
        {branch.cancelledCount > 0 ? (
          <span className="font-bold text-red-600">{branch.cancelledCount} บิล · ฿{money(branch.cancelledSales)}</span>
        ) : (
          <span className="text-slate-300">-</span>
        )}
      </td>
      <td className="px-5 py-4 text-right text-xs text-slate-400">
        {branch.lastSaleAt ? dateTime(branch.lastSaleAt) : "ยังไม่มีรายการ"}
      </td>
    </tr>
  )
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ branch?: string | string[] }>
}) {
  const params = await searchParams
  const selectedBranch = typeof params?.branch === "string" && params.branch.length > 0 ? params.branch : "ALL"
  const data = await getDashboardData(selectedBranch)
  const maxMonthlySales = Math.max(...data.monthlySales.map((month) => month.amount), 1)

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 font-sans md:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-800">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">
              {selectedBranch === "ALL" ? "ภาพรวมใบขายและยอดสุทธิแยกตามทุกสาขา" : `ข้อมูลของ ${data.branches[0]?.name || "สาขาที่เลือก"}`}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span>ข้อมูลสะสมทั้งหมด</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-slate-800">ดูข้อมูลตามสาขา</p>
            <p className="mt-1 text-xs text-slate-400">เลือกสาขาเพื่อกรองยอดขาย รายสินค้า และใบขายล่าสุด ระบบจะโหลดให้อัตโนมัติ</p>
          </div>
          <DashboardBranchFilter branches={data.availableBranches} selectedBranch={selectedBranch} />
        </div>

        {data.error && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{data.error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">ยอดขายสุทธิรวม</p>
            <p className="mt-2 text-3xl font-black">฿{money(data.summary.netSales)}</p>
            <p className="mt-3 text-xs text-slate-400">ไม่รวมบิลที่ยกเลิกและบิลรอดำเนินการ</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">ใบขายที่สำเร็จ</p>
              <FileText className="h-5 w-5 text-blue-500" />
            </div>
            <p className="mt-2 text-3xl font-black text-slate-800">{data.summary.billCount.toLocaleString()}</p>
            <p className="mt-3 text-xs text-slate-400">บิลที่ถูกนำมาคำนวณยอดสุทธิ</p>
          </div>
          <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-red-500">บิลยกเลิก</p>
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <p className="mt-2 text-3xl font-black text-red-600">{data.summary.cancelledCount.toLocaleString()}</p>
            <p className="mt-3 text-xs text-slate-400">มูลค่ารวม ฿{money(data.summary.cancelledSales)}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">สาขาที่ดูแล</p>
              <Building2 className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="mt-2 text-3xl font-black text-slate-800">{data.summary.branchCount.toLocaleString()}</p>
            <p className="mt-3 text-xs text-slate-400">แสดงทั้งสาขาที่มียอดและยังไม่มียอด</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm xl:col-span-2">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-800">แนวโน้มยอดขายรายเดือน</h2>
                <p className="mt-1 text-xs text-slate-400">ยอดสุทธิจากใบขายย้อนหลัง 12 เดือน</p>
              </div>
              <MoreHorizontal className="h-5 w-5 text-slate-300" />
            </div>
            <div className="flex h-64 items-end gap-2 sm:gap-3">
              {data.monthlySales.map((month) => (
                <div key={month.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div className="relative flex h-full w-full items-end">
                    <div
                      className="w-full rounded-t-lg bg-blue-100 transition-colors group-hover:bg-blue-500"
                      style={{ height: `${Math.max((month.amount / maxMonthlySales) * 100, month.amount ? 4 : 1)}%` }}
                    >
                      <span className="absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[10px] font-bold text-white group-hover:block">
                        ฿{money(month.amount)}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">{month.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-800">สรุปสาขาเด่น</h2>
            <p className="mt-1 text-xs text-slate-400">เรียงตามยอดขายสุทธิสูงสุด</p>
            <div className="mt-5 space-y-4">
              {data.branches.slice(0, 5).map((branch, index) => (
                <div key={branch.id} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-black text-slate-500">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-700">{branch.name}</p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${data.branches[0]?.netSales ? (branch.netSales / data.branches[0].netSales) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-black text-blue-600">฿{money(branch.netSales)}</span>
                </div>
              ))}
              {data.branches.length === 0 && <p className="py-8 text-center text-sm text-slate-400">ยังไม่มีข้อมูลสาขา</p>}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-100 p-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-lg font-black text-slate-800">สรุปยอดรายสินค้า</h2>
              <p className="mt-1 text-xs text-slate-400">จำนวนที่ขายและยอดเงินของสินค้าแต่ละรายการ</p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600"><Package className="h-4 w-4" /> เรียงตามยอดขายสูงสุด</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4">สินค้า</th>
                  <th className="px-5 py-4 text-right">จำนวนขาย</th>
                  <th className="px-5 py-4 text-right">จำนวนบิล</th>
                  <th className="px-5 py-4 text-right">ยอดขาย</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.products.map((product, index) => (
                  <tr key={product.key} className="transition-colors hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-contain p-1" />
                          ) : (
                            <Package className="h-5 w-5 text-slate-300" />
                          )}
                        </div>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-black text-slate-500">{index + 1}</span>
                        <div>
                          <p className="font-bold text-slate-800">{product.name}</p>
                          <p className="text-[11px] text-slate-400">SKU: {product.sku || "-"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-slate-700">{product.quantity.toLocaleString()}</td>
                    <td className="px-5 py-4 text-right text-slate-500">{product.billCount.toLocaleString()}</td>
                    <td className="px-5 py-4 text-right font-black text-emerald-600">฿{money(product.sales)}</td>
                  </tr>
                ))}
                {data.products.length === 0 && <tr><td colSpan={4} className="px-5 py-16 text-center text-slate-400">ยังไม่มีข้อมูลสินค้า</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-100 p-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-lg font-black text-slate-800">ยอดขายแยกตามสาขา</h2>
              <p className="mt-1 text-xs text-slate-400">รวมใบขายของทุกสาขาในระบบเดียวกัน</p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> อัปเดตจากข้อมูลจริง</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[800px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4">สาขา</th>
                  <th className="px-5 py-4 text-right">ใบขายสำเร็จ</th>
                  <th className="px-5 py-4 text-right">ยอดสุทธิ</th>
                  <th className="px-5 py-4 text-right">บิลยกเลิก</th>
                  <th className="px-5 py-4 text-right">รายการล่าสุด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.branches.map((branch) => <BranchRow key={branch.id} branch={branch} />)}
                {data.branches.length === 0 && <tr><td colSpan={5} className="px-5 py-16 text-center text-slate-400">ไม่พบข้อมูลสาขา</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6">
            <h2 className="text-lg font-black text-slate-800">ใบขายล่าสุดจากทุกสาขา</h2>
            <p className="mt-1 text-xs text-slate-400">ใช้ตรวจสอบรายการล่าสุดได้อย่างรวดเร็ว</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4">เลขที่ใบขาย</th>
                  <th className="px-5 py-4">สาขา</th>
                  <th className="px-5 py-4">วันที่ออกบิล</th>
                  <th className="px-5 py-4 text-right">ยอดรวม</th>
                  <th className="px-5 py-4 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentOrders.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-5 py-4 font-black text-slate-800">{order.orderCode}</td>
                    <td className="px-5 py-4 font-bold text-blue-600">{order.branchName}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">{dateTime(order.createdAt)}</td>
                    <td className="px-5 py-4 text-right font-black text-slate-800">฿{money(order.totalAmount)}</td>
                    <td className="px-5 py-4 text-center"><span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black ${statusClass(order.status)}`}>{statusLabel(order.status)}</span></td>
                  </tr>
                ))}
                {data.recentOrders.length === 0 && <tr><td colSpan={5} className="px-5 py-16 text-center text-slate-400">ยังไม่มีใบขาย</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
