import Link from "next/link"
import { getProducts, getCategoryFilterOptions, getCategoryTotalCount, type ProductExtraFilters } from "../../../actions/woodslab"
import InventoryActions from "../../../components/InventoryActions"
import InventoryTable from "../../../components/InventoryTable"
import CategoryFilterBar from "../../../components/CategoryFilterBar"
import InventoryLoadingOverlay from "../../../components/InventoryLoadingOverlay"
import { Package, Layers, Hammer, FileUp, Box, Search, Loader2, Armchair, X } from "lucide-react"
import { Suspense } from "react"
import CollectionGroupTable from "../../../components/CollectionGroupTable"
import { createClient } from "../../../lib/supabase/server"
import { supabaseAdmin } from "../../../lib/supabase/admin"
import { redirect } from "next/navigation"

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function InventoryPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, member_tags, allowed_inventory_tabs')
    .eq('user_id', user.id)
    .maybeSingle()

  const userRole = profile?.role || 'admin'
  const isSuperAccess = userRole === 'admin' || userRole === 'data_analyst'

  const rawAllowed = (profile as any)?.allowed_inventory_tabs?.length > 0
    ? (profile as any).allowed_inventory_tabs
    : ((profile as any)?.member_tags?.length > 0 ? (profile as any).member_tags : ['SLABS', 'ROUGH', 'PROP', 'FURNITURE'])

  const allowedTabs: string[] = isSuperAccess ? ['SLABS', 'ROUGH', 'PROP', 'FURNITURE'] : rawAllowed

  const resolvedSearchParams = await searchParams
  const requestedTab = (resolvedSearchParams.tab as string) || (allowedTabs[0] || 'SLABS')

  // 🛡️ ป้องกันการพิมพ์ URL ข้ามหมวดที่ตนเองไม่มีสิทธิ์
  if (!allowedTabs.includes(requestedTab)) {
    const fallbackTab = allowedTabs[0] || 'SLABS'
    redirect(`/inventory?tab=${fallbackTab}`)
  }

  const activeTab = requestedTab
  const activeType = (resolvedSearchParams.type as string) || ''
  const activeStatus = (resolvedSearchParams.status as string) || ''
  const searchQuery = (resolvedSearchParams.search as string) || '' // 💡 รับคำค้นหาจาก URL
  const viewMode = (resolvedSearchParams.view as string) || 'products' // 💡 รับโหมดการดู

  // 🌟 พารามิเตอร์ฟิลเตอร์เฉพาะแต่ละหมวดหมู่
  const activeMaterial = (resolvedSearchParams.material as string) || ''
  const activeGrade = (resolvedSearchParams.grade as string) || ''
  const activeCraft = (resolvedSearchParams.craft as string) || ''
  const activeColor = (resolvedSearchParams.color as string) || ''
  const activeBrand = (resolvedSearchParams.brand as string) || ''
  const activeSize = (resolvedSearchParams.size as string) || ''

  // 📏 ขนาด Min - Max (ความสูง, ความกว้าง, ความลึก/ความยาว)
  const minW = resolvedSearchParams.min_w ? parseFloat(resolvedSearchParams.min_w as string) : undefined
  const maxW = resolvedSearchParams.max_w ? parseFloat(resolvedSearchParams.max_w as string) : undefined
  const minH = resolvedSearchParams.min_h ? parseFloat(resolvedSearchParams.min_h as string) : undefined
  const maxH = resolvedSearchParams.max_h ? parseFloat(resolvedSearchParams.max_h as string) : undefined
  const minL = resolvedSearchParams.min_l ? parseFloat(resolvedSearchParams.min_l as string) : undefined
  const maxL = resolvedSearchParams.max_l ? parseFloat(resolvedSearchParams.max_l as string) : undefined

  let dbCategory = 'SLABS'
  if (activeTab === 'ROUGH') dbCategory = 'rough_wood'
  if (activeTab === 'PROP') dbCategory = 'prop'
  if (activeTab === 'FURNITURE') dbCategory = 'furniture'

  const [filterOptions, categoryTotalCount] = await Promise.all([
    getCategoryFilterOptions(dbCategory),
    getCategoryTotalCount(dbCategory)
  ])

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800">
      <InventoryLoadingOverlay />
      <div className="w-full">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-8 h-8 text-blue-600" />
              คลังสินค้า (Inventory)
            </h1>
            <p className="text-slate-500 text-sm mt-1 ml-10">
              จัดการรายการสินค้าทั้งหมดในระบบ
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            
            {/* 💡 ฟอร์มค้นหาสินค้า */}
            <form method="GET" action="/inventory" className="relative w-full sm:w-64">
              <input type="hidden" name="tab" value={activeTab} />
              {activeType && <input type="hidden" name="type" value={activeType} />}
              {activeMaterial && <input type="hidden" name="material" value={activeMaterial} />}
              {activeGrade && <input type="hidden" name="grade" value={activeGrade} />}
              {activeCraft && <input type="hidden" name="craft" value={activeCraft} />}
              {activeColor && <input type="hidden" name="color" value={activeColor} />}
              {activeBrand && <input type="hidden" name="brand" value={activeBrand} />}
              {activeSize && <input type="hidden" name="size" value={activeSize} />}
              {minW !== undefined && <input type="hidden" name="min_w" value={minW} />}
              {maxW !== undefined && <input type="hidden" name="max_w" value={maxW} />}
              {minH !== undefined && <input type="hidden" name="min_h" value={minH} />}
              {maxH !== undefined && <input type="hidden" name="max_h" value={maxH} />}
              {minL !== undefined && <input type="hidden" name="min_l" value={minL} />}
              {maxL !== undefined && <input type="hidden" name="max_l" value={maxL} />}
              {activeStatus && <input type="hidden" name="status" value={activeStatus} />}
              <div className="relative">
                <input
                  type="text"
                  name="search"
                  defaultValue={searchQuery}
                  placeholder="ค้นหา ชื่อ, SKU, บาร์โค้ด..."
                  className="w-full pl-10 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                {searchQuery && (
                  <Link
                    href={`/inventory?${new URLSearchParams({
                      tab: activeTab,
                      ...(activeType ? { type: activeType } : {}),
                      ...(activeStatus ? { status: activeStatus } : {}),
                      ...(viewMode && viewMode !== 'products' ? { view: viewMode } : {}),
                      ...(activeMaterial ? { material: activeMaterial } : {}),
                      ...(activeGrade ? { grade: activeGrade } : {}),
                      ...(activeCraft ? { craft: activeCraft } : {}),
                      ...(activeColor ? { color: activeColor } : {}),
                      ...(activeBrand ? { brand: activeBrand } : {}),
                      ...(activeSize ? { size: activeSize } : {}),
                      ...(minW !== undefined ? { min_w: String(minW) } : {}),
                      ...(maxW !== undefined ? { max_w: String(maxW) } : {}),
                      ...(minH !== undefined ? { min_h: String(minH) } : {}),
                      ...(maxH !== undefined ? { max_h: String(maxH) } : {}),
                      ...(minL !== undefined ? { min_l: String(minL) } : {}),
                      ...(maxL !== undefined ? { max_l: String(maxL) } : {}),
                    }).toString()}`}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
                    title="ล้างคำค้นหานี้"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </form>

            <Link
              href="/inventory/import"
              className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 text-sm font-bold hover:bg-slate-50 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <FileUp className="w-4 h-4" />
              นำเข้า Excel
            </Link>
            <InventoryActions allowedTabs={allowedTabs} />
          </div>
        </div>

        {/* Main Category Tabs */}
        <div className="mb-0 border-b border-slate-200">
          <div className="flex gap-6 overflow-x-auto">
            {allowedTabs.includes('SLABS') && (
              <Link
                href="/inventory?tab=SLABS"
                className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap
                  ${activeTab === 'SLABS'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <Layers className="w-4 h-4" /> Wood Slabs (แผ่นไม้)
              </Link>
            )}
            {allowedTabs.includes('ROUGH') && (
              <Link
                href="/inventory?tab=ROUGH"
                className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap
                  ${activeTab === 'ROUGH'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <Hammer className="w-4 h-4" /> Rough Wood (ไม้ดิบ)
              </Link>
            )}
            {allowedTabs.includes('PROP') && (
              <Link
                href="/inventory?tab=PROP"
                className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap
                  ${activeTab === 'PROP'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <Box className="w-4 h-4" /> Props (พร็อพ)
              </Link>
            )}
            {allowedTabs.includes('FURNITURE') && (
              <Link
                href="/inventory?tab=FURNITURE"
                className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap
                  ${activeTab === 'FURNITURE'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <Armchair className="w-4 h-4" /> Furniture (เฟอร์นิเจอร์)
              </Link>
            )}
          </div>
        </div>

        {/* View Mode Toggle (Only for FURNITURE and PROP) */}
        {(activeTab === 'FURNITURE' || activeTab === 'PROP') && (
          <div className="flex gap-2 mt-4 mb-2 bg-white p-1 rounded-lg border border-slate-200 w-fit shadow-sm">
            <Link
              href={`/inventory?tab=${activeTab}&view=products${activeType ? `&type=${activeType}` : ''}${activeStatus ? `&status=${activeStatus}` : ''}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'products' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              แสดงเป็นชิ้น (Products)
            </Link>
            <Link
              href={`/inventory?tab=${activeTab}&view=groups${activeType ? `&type=${activeType}` : ''}${activeStatus ? `&status=${activeStatus}` : ''}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'groups' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              แสดงตามกลุ่ม (Groups)
            </Link>
          </div>
        )}

        {/* Filters */}
        {viewMode !== 'groups' ? (
          <CategoryFilterBar
            activeTab={activeTab}
            activeStatus={activeStatus}
            activeType={activeType}
            activeMaterial={activeMaterial}
            activeGrade={activeGrade}
            activeCraft={activeCraft}
            activeColor={activeColor}
            activeBrand={activeBrand}
            activeSize={activeSize}
            minW={minW}
            maxW={maxW}
            minH={minH}
            maxH={maxH}
            minL={minL}
            maxL={maxL}
            options={filterOptions}
          />
        ) : (
          <div className="mb-6" />
        )}

        {/* Content */}
        <Suspense 
          key={`${activeTab}-${activeType}-${searchQuery}-${activeStatus}-${viewMode}-${activeMaterial}-${activeGrade}-${activeCraft}-${activeColor}-${activeBrand}-${activeSize}-${minW}-${maxW}-${minH}-${maxH}-${minL}-${maxL}`} 
          fallback={
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[400px] flex flex-col items-center justify-center text-slate-400 gap-3">
               <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
               <p className="text-sm font-medium animate-pulse">กำลังโหลดข้อมูล...</p>
            </div>
          }
        >
          <InventoryData 
            activeTab={activeTab} 
            activeType={activeType} 
            searchQuery={searchQuery} 
            activeStatus={activeStatus} 
            viewMode={viewMode}
            categoryTotalCount={categoryTotalCount}
            extraFilters={{
              material: activeMaterial,
              grade: activeGrade,
              craft: activeCraft,
              color: activeColor,
              brand: activeBrand,
              size: activeSize,
              minW,
              maxW,
              minH,
              maxH,
              minL,
              maxL
            }}
          />
        </Suspense>

      </div>
    </div>
  )
}

async function InventoryData({ 
  activeTab, 
  activeType, 
  searchQuery, 
  activeStatus, 
  viewMode,
  categoryTotalCount,
  extraFilters
}: { 
  activeTab: string, 
  activeType: string, 
  searchQuery: string, 
  activeStatus: string, 
  viewMode: string,
  categoryTotalCount: number,
  extraFilters?: ProductExtraFilters
}) {
  if (viewMode === 'groups' && (activeTab === 'FURNITURE' || activeTab === 'PROP')) {
    const tag = activeTab === 'FURNITURE' ? 'furniture' : 'prop'
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <CollectionGroupTable tag={tag} />
      </div>
    )
  }

  let dbCategory = 'SLABS'
  if (activeTab === 'ROUGH') dbCategory = 'rough_wood'
  if (activeTab === 'PROP') dbCategory = 'prop'
  if (activeTab === 'FURNITURE') dbCategory = 'furniture'

  const { data: products, count, error } = await getProducts(
    dbCategory, 
    activeType || undefined, 
    searchQuery, 
    activeStatus || undefined,
    extraFilters,
    undefined,
    0,
    250
  )

  if (error) {
    return (
      <div className="p-8 text-center text-red-500 bg-white rounded-xl border border-red-100 shadow-sm">
        <div className="flex flex-col items-center gap-2">
          <Package className="w-12 h-12 text-red-200" />
          <p className="font-bold">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
          <p className="text-sm opacity-70">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <InventoryTable 
      products={products || []} 
      totalCount={count ?? (products?.length || 0)}
      categoryTotalCount={categoryTotalCount}
      activeTab={activeTab} 
      activeType={activeType}
      searchQuery={searchQuery}
      activeStatus={activeStatus}
      extraFilters={extraFilters}
    />
  )
}