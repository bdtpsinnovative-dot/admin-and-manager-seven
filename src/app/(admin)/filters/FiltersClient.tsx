"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import {
  Layers,
  Box,
  AlertCircle,
  Search,
  RefreshCw,
  FolderTree,
  Tag,
  Palette,
  CheckCircle2,
  ExternalLink,
  Edit3,
  ArrowRight,
  Plus,
  Minus,
  X,
  ChevronRight,
  Package,
  AlertTriangle,
  SlidersHorizontal,
  Store,
  Globe,
  CornerDownRight,
  ShieldAlert,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import {
  FiltersDashboardData,
  StorefrontCategoryComparison,
  getStorefrontFilterItems,
  updateSingleGroupSup,
  batchUpdateGroupSup,
  getFiltersDashboardData,
} from "@/actions/filters";

interface FiltersClientProps {
  initialData: FiltersDashboardData;
}

export default function FiltersClient({ initialData }: FiltersClientProps) {
  const [data, setData] = useState<FiltersDashboardData>(initialData);

  // Mode: "mirror" (default, visual 1:1 like storefront drawer) or "database" (detailed table tools)
  const [viewMode, setViewMode] = useState<"mirror" | "database">("mirror");

  // Selected Category on Storefront Drawer
  const [activeCategoryKey, setActiveCategoryKey] = useState<string>("ALL");
  const [activeSubcategoryKey, setActiveSubcategoryKey] = useState<string | null>(null);

  // Expanded groups in drawer
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "VASE & VESSELS": true,
    FIGURE: false,
    ACCESSORIES: false,
    "DINING & TABLEWARE": false,
    "DRESSING & BATH": false,
    "ART & WALL DECOR": false,
  });

  // Loaded products for the active selection
  const [loadedGroups, setLoadedGroups] = useState<any[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState("");

  // Storefront Base URL
  const [storefrontBaseUrl, setStorefrontBaseUrl] = useState<string>("https://terrahome-studio.com");

  // Loading states
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Rename/Merge Modal state
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [sourceCategory, setSourceCategory] = useState<string>("");
  const [targetCategory, setTargetCategory] = useState<string>("");
  const [targetTag, setTargetTag] = useState<string>("Props");

  // Edit Single Group state
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupSup, setEditGroupSup] = useState("");
  const [editGroupTag, setEditGroupTag] = useState("Props");

  // Load items when active category or subcategory changes
  const loadActiveItems = async (catKey: string, subKey?: string | null) => {
    setIsLoadingItems(true);
    try {
      let filterParam = catKey;
      if (catKey === "ALL") filterParam = "All";

      const items = await getStorefrontFilterItems(filterParam, subKey || undefined);
      setLoadedGroups(items);
    } catch (err: any) {
      toast.error("ไม่สามารถโหลดสินค้าในหมวดนี้ได้: " + err.message);
    } finally {
      setIsLoadingItems(false);
    }
  };

  useEffect(() => {
    loadActiveItems(activeCategoryKey, activeSubcategoryKey);
  }, [activeCategoryKey, activeSubcategoryKey]);

  // Toggle group collapse
  const toggleGroupExpand = (groupKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  // Helper to open storefront
  const openStorefront = (filterParam: string) => {
    const url = `${storefrontBaseUrl.replace(/\/$/, "")}/prop?category=${encodeURIComponent(filterParam)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Reload dashboard data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const fresh = await getFiltersDashboardData();
      setData(fresh);
      await loadActiveItems(activeCategoryKey, activeSubcategoryKey);
      toast.success("อัปเดตข้อมูลตัวกรองล่าสุดเรียบร้อย");
    } catch (err: any) {
      toast.error("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Execute Single Group Sup update
  const handleSaveSingleGroup = (groupId: string) => {
    startTransition(async () => {
      try {
        await updateSingleGroupSup(groupId, editGroupSup, editGroupTag);
        toast.success(`อัปเดตกลุ่ม ${groupId} เรียบร้อย`);
        setEditingGroupId(null);
        await handleRefresh();
      } catch (err: any) {
        toast.error("เกิดข้อผิดพลาด: " + err.message);
      }
    });
  };

  // Filter items in right panel by search
  const displayGroups = useMemo(() => {
    if (!itemSearchQuery.trim()) return loadedGroups;
    const q = itemSearchQuery.toLowerCase();
    return loadedGroups.filter((g) => {
      const matchId = g.id?.toLowerCase().includes(q);
      const matchSup = g.product_sup?.toLowerCase().includes(q);
      const matchProds = g.products?.some(
        (p: any) => p.sku?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q)
      );
      return matchId || matchSup || matchProds;
    });
  }, [loadedGroups, itemSearchQuery]);

  // Find current active category details
  const currentCategoryDetail = useMemo(() => {
    if (activeCategoryKey === "ALL") {
      return {
        titleEn: "ALL",
        titleTh: "สินค้าทั้งหมด",
        filterParam: "All",
        count: data.totalGroups,
        subcategories: [],
      };
    }
    if (activeCategoryKey === "IN_STOCK") {
      return {
        titleEn: "IN STOCK",
        titleTh: "สินค้าพร้อมส่ง",
        filterParam: "IN_STOCK",
        count: data.statusStats.find((s) => s.status.toLowerCase().includes("stock") || s.status === "active")?.count || 0,
        subcategories: [],
      };
    }
    if (activeCategoryKey === "PRE-ORDER") {
      return {
        titleEn: "PRE-ORDER",
        titleTh: "พรีออเดอร์ (รอสินค้า 45-60 วัน)",
        filterParam: "PRE_ORDER",
        count: data.statusStats.find((s) => s.status.toLowerCase().includes("pre") || s.status.toLowerCase().includes("oder"))?.count || 0,
        subcategories: [],
      };
    }
    if (activeCategoryKey === "SALE OFFERS %") {
      return {
        titleEn: "SALE OFFERS %",
        titleTh: "ลดราคาพิเศษ",
        filterParam: "SPECIAL_DISCOUNT",
        count: 0,
        subcategories: [],
      };
    }
    if (activeCategoryKey === "UNMAPPED") {
      return {
        titleEn: "UNMAPPED / ไม่มีหมวด",
        titleTh: "สินค้าที่ยังไม่มีค่า product_sup หรือตกหล่น",
        filterParam: "ไม่มี",
        count: data.unassignedGroupsCount,
        subcategories: [],
      };
    }

    const found = data.storefrontCategories.find((c) => c.key === activeCategoryKey);
    return (
      found || {
        titleEn: activeCategoryKey,
        titleTh: "",
        filterParam: activeCategoryKey,
        count: 0,
        subcategories: [],
      }
    );
  }, [activeCategoryKey, data]);

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#84492C] text-white rounded-xl shadow-md shadow-[#84492C]/20">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2">
                จำลองตัวกรองหน้าบ้าน (Storefront Filters Mirror)
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ดึงข้อมูลจริง
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                เทียบเคียงเมนูตัวกรองของหน้าเว็บแบบ 1:1 คลิกหมวดหมู่ทางซ้ายเพื่อดูสินค้าจริง และกดเปิดหน้าบ้านได้ทันที
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Base URL selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">เว็บหน้าบ้าน:</span>
            <select
              value={storefrontBaseUrl}
              onChange={(e) => setStorefrontBaseUrl(e.target.value)}
              className="bg-transparent font-bold text-[#84492C] focus:outline-none cursor-pointer"
            >
              <option value="https://terrahome-studio.com">Live: terrahome-studio.com</option>
              <option value="http://localhost:3000">Local: localhost:3000</option>
              <option value="http://localhost:3001">Local: localhost:3001</option>
            </select>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isPending}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#84492C]" : ""}`} />
            รีเฟรช
          </button>
        </div>
      </div>

      {/* Main Split View: Left (Filters Drawer) + Right (Live Products) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ============================================================== */}
        {/* LEFT COLUMN: EXACT STOREFRONT DRAWER LOOK & FEEL (35% on desktop) */}
        {/* ============================================================== */}
        <div className="lg:col-span-4 xl:col-span-4">
          <div className="bg-[#FAF6F2] rounded-3xl border border-[#E7DED6] shadow-md overflow-hidden sticky top-6">
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-[#E7DED6] flex items-center justify-between bg-[#F4EDE6]/60">
              <div>
                <span className="text-[11px] font-bold text-[#84492C] uppercase tracking-[0.25em] block">
                  Storefront Drawer
                </span>
                <h2 className="text-lg font-bold text-[#3A3835] tracking-widest mt-0.5">
                  FILTERS
                </h2>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#84492C]/10 text-[#84492C]">
                {data.totalGroups.toLocaleString()} รายการ
              </span>
            </div>

            {/* Filter Menu Items List */}
            <div className="p-3 space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto font-sans">
              {/* 1. ALL */}
              <div
                onClick={() => {
                  setActiveCategoryKey("ALL");
                  setActiveSubcategoryKey(null);
                }}
                className={`cursor-pointer group flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
                  activeCategoryKey === "ALL" && !activeSubcategoryKey
                    ? "bg-[#84492C]/10 text-[#84492C] shadow-2xs font-bold"
                    : "text-[#3A3835] hover:bg-[#84492C]/5 font-medium"
                }`}
              >
                <div>
                  <div className="text-sm font-bold tracking-wide">ALL</div>
                  <div className="text-xs text-[#84492C]/80 mt-0.5">สินค้าทั้งหมด</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-white/80 border border-[#E7DED6] text-slate-700">
                    {data.totalGroups}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openStorefront("All");
                    }}
                    title="เปิดดูหน้าบ้าน"
                    className="p-1 hover:text-[#84492C] text-slate-400"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  {activeCategoryKey === "ALL" && (
                    <span className="w-2 h-2 rounded-full bg-[#84492C]" />
                  )}
                </div>
              </div>

              {/* 2. MAIN CATEGORIES FROM STOREFRONT */}
              {data.storefrontCategories.map((cat) => {
                const isActive = activeCategoryKey === cat.key;
                const isExpanded = expandedGroups[cat.key];
                const hasSubs = cat.subcategories.length > 0;

                return (
                  <div key={cat.key} className="space-y-1">
                    <div
                      onClick={() => {
                        setActiveCategoryKey(cat.key);
                        setActiveSubcategoryKey(null);
                      }}
                      className={`cursor-pointer group flex items-center justify-between px-4 py-2.5 rounded-2xl transition-all ${
                        isActive && !activeSubcategoryKey
                          ? "bg-[#84492C]/10 text-[#84492C] font-bold"
                          : "text-[#3A3835] hover:bg-[#84492C]/5 font-medium"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs uppercase tracking-wider font-bold truncate">
                          {cat.titleEn}
                        </div>
                        <div className="text-[11.5px] text-[#84492C]/80 mt-0.5 truncate">
                          {cat.titleTh}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Group Count */}
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white/70 border border-[#E7DED6]/80 text-slate-600">
                          {cat.groupCount}
                        </span>

                        {/* Open storefront link */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openStorefront(cat.filterParam);
                          }}
                          title="เปิดหมวดนี้ที่หน้าบ้าน"
                          className="p-1 text-slate-400 hover:text-[#84492C]"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>

                        {/* Expand button if has subcategories */}
                        {hasSubs ? (
                          <button
                            onClick={(e) => toggleGroupExpand(cat.key, e)}
                            className="p-1 text-slate-400 hover:text-[#84492C] transition-transform"
                          >
                            {isExpanded ? (
                              <Minus className="w-4 h-4" />
                            ) : (
                              <Plus className="w-4 h-4" />
                            )}
                          </button>
                        ) : (
                          isActive && (
                            <span className="w-2 h-2 rounded-full bg-[#84492C] ml-1" />
                          )
                        )}
                      </div>
                    </div>

                    {/* Subcategories accordion */}
                    {hasSubs && isExpanded && (
                      <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-[#84492C]/20 ml-4 animate-fade-in">
                        {cat.subcategories.map((sub) => {
                          const isSubActive =
                            activeCategoryKey === cat.key &&
                            activeSubcategoryKey === sub.filterParam;

                          return (
                            <div
                              key={sub.key}
                              onClick={() => {
                                setActiveCategoryKey(cat.key);
                                setActiveSubcategoryKey(sub.filterParam);
                              }}
                              className={`cursor-pointer flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all ${
                                isSubActive
                                  ? "bg-[#84492C] text-white font-bold shadow-sm"
                                  : "text-[#5A524C] hover:bg-[#84492C]/10"
                              }`}
                            >
                              <div className="truncate pr-2">
                                <span>{sub.titleEn}</span>
                                <span className={`ml-1 text-[10px] ${isSubActive ? "text-white/80" : "text-slate-400"}`}>
                                  ({sub.titleTh})
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    isSubActive
                                      ? "bg-white/20 text-white"
                                      : "bg-slate-200/60 text-slate-600"
                                  }`}
                                >
                                  {sub.groupCount}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openStorefront(sub.filterParam);
                                  }}
                                  title="เปิดข้อย่อยที่หน้าบ้าน"
                                  className={`p-0.5 ${
                                    isSubActive ? "text-white hover:text-white/80" : "text-slate-400 hover:text-[#84492C]"
                                  }`}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* DIVIDER */}
              <div className="my-3 border-t border-[#E7DED6]" />

              {/* 3. SPECIAL FILTERS (IN STOCK / PRE-ORDER / SALE) */}
              <div
                onClick={() => {
                  setActiveCategoryKey("IN_STOCK");
                  setActiveSubcategoryKey(null);
                }}
                className={`cursor-pointer flex items-center justify-between px-4 py-2.5 rounded-2xl transition-all ${
                  activeCategoryKey === "IN_STOCK"
                    ? "bg-[#84492C]/10 text-[#84492C] font-bold"
                    : "text-[#84492C] hover:bg-[#84492C]/5 font-semibold"
                }`}
              >
                <div>
                  <div className="text-xs uppercase tracking-wider font-bold">
                    IN STOCK
                  </div>
                  <div className="text-[11.5px] opacity-80 mt-0.5">สินค้าพร้อมส่ง</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openStorefront("IN_STOCK");
                    }}
                    title="เปิดดูหน้าบ้าน"
                    className="p-1 text-slate-400 hover:text-[#84492C]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <Tag className="w-3.5 h-3.5" />
                </div>
              </div>

              <div
                onClick={() => {
                  setActiveCategoryKey("PRE-ORDER");
                  setActiveSubcategoryKey(null);
                }}
                className={`cursor-pointer flex items-center justify-between px-4 py-2.5 rounded-2xl transition-all ${
                  activeCategoryKey === "PRE-ORDER"
                    ? "bg-[#84492C]/10 text-[#84492C] font-bold"
                    : "text-[#84492C] hover:bg-[#84492C]/5 font-semibold"
                }`}
              >
                <div>
                  <div className="text-xs uppercase tracking-wider font-bold">
                    PRE-ORDER
                  </div>
                  <div className="text-[11.5px] opacity-80 mt-0.5">
                    พรีออเดอร์ (รอสินค้า 45-60 วัน)
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openStorefront("PRE_ORDER");
                    }}
                    title="เปิดดูหน้าบ้าน"
                    className="p-1 text-slate-400 hover:text-[#84492C]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <Tag className="w-3.5 h-3.5" />
                </div>
              </div>

              <div
                onClick={() => {
                  setActiveCategoryKey("SALE OFFERS %");
                  setActiveSubcategoryKey(null);
                }}
                className={`cursor-pointer flex items-center justify-between px-4 py-2.5 rounded-2xl transition-all ${
                  activeCategoryKey === "SALE OFFERS %"
                    ? "bg-[#84492C]/10 text-[#84492C] font-bold"
                    : "text-[#84492C] hover:bg-[#84492C]/5 font-semibold"
                }`}
              >
                <div>
                  <div className="text-xs uppercase tracking-wider font-bold">
                    SALE OFFERS %
                  </div>
                  <div className="text-[11.5px] opacity-80 mt-0.5">ลดราคาพิเศษ</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openStorefront("SPECIAL_DISCOUNT");
                    }}
                    title="เปิดดูหน้าบ้าน"
                    className="p-1 text-slate-400 hover:text-[#84492C]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <Tag className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* 4. UNMAPPED SECTION */}
              <div className="my-3 border-t border-[#E7DED6]" />
              <div
                onClick={() => {
                  setActiveCategoryKey("UNMAPPED");
                  setActiveSubcategoryKey(null);
                }}
                className={`cursor-pointer flex items-center justify-between px-4 py-2.5 rounded-2xl transition-all ${
                  activeCategoryKey === "UNMAPPED"
                    ? "bg-amber-100 text-amber-900 font-bold border border-amber-300"
                    : "text-amber-800 hover:bg-amber-50 font-medium"
                }`}
              >
                <div>
                  <div className="text-xs uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    ไม่มีหมวดหมู่ (NULL)
                  </div>
                  <div className="text-[11px] text-amber-700 mt-0.5">
                    {data.unassignedGroupsCount} กลุ่มยังไม่ได้จัดหมวด
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                  {data.unassignedGroupsCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT COLUMN: LIVE REAL PRODUCTS EXPLORER (65% on desktop)     */}
        {/* ============================================================== */}
        <div className="lg:col-span-8 xl:col-span-8 space-y-5">
          {/* Active Category Header Banner */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#84492C]">
                หมวดหมู่ที่เลือกดูอยู่ในขณะนี้
              </span>
              <h2 className="text-2xl font-black text-slate-800 mt-1 flex items-center gap-2">
                {activeSubcategoryKey ? activeSubcategoryKey : currentCategoryDetail.titleEn}
                {currentCategoryDetail.titleTh && (
                  <span className="text-base font-normal text-slate-500">
                    ({currentCategoryDetail.titleTh})
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                พบทั้งหมด{" "}
                <strong className="text-slate-800">{loadedGroups.length}</strong> กลุ่มสินค้าในหมวดนี้
              </p>
            </div>

            {/* BIG CLICKABLE STOREFRONT BUTTON */}
            <button
              onClick={() =>
                openStorefront(activeSubcategoryKey || currentCategoryDetail.filterParam)
              }
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#84492C] hover:bg-[#6d3a22] text-white font-bold text-sm shadow-lg shadow-[#84492C]/25 transition-all shrink-0 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>🔗 เปิดดูหน้านี้บนเว็บจริง (Storefront)</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>

          {/* Subcategory Pills (if the active category has subcategories) */}
          {currentCategoryDetail.subcategories &&
            currentCategoryDetail.subcategories.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setActiveSubcategoryKey(null)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    !activeSubcategoryKey
                      ? "bg-[#84492C] text-white shadow-sm"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  ทั้งหมดใน {currentCategoryDetail.titleEn} ({loadedGroups.length})
                </button>
                {currentCategoryDetail.subcategories.map((sub: any) => {
                  const isSelected = activeSubcategoryKey === sub.filterParam;
                  return (
                    <button
                      key={sub.key}
                      onClick={() => setActiveSubcategoryKey(sub.filterParam)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                        isSelected
                          ? "bg-[#84492C] text-white shadow-sm"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {sub.titleEn} ({sub.groupCount})
                    </button>
                  );
                })}
              </div>
            )}

          {/* Search bar inside category */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={itemSearchQuery}
              onChange={(e) => setItemSearchQuery(e.target.value)}
              placeholder="ค้นหาด้วย SKU หรือชื่อสินค้าในหมวดนี้..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#84492C]"
            />
          </div>

          {/* Products Grid */}
          {isLoadingItems ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-16 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-[#84492C] mb-3" />
              <p className="text-sm font-semibold">กำลังดึงข้อมูลสินค้าจากฐานข้อมูล...</p>
            </div>
          ) : displayGroups.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center text-slate-400">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600">
                ไม่พบสินค้าในหมวดหมู่นี้
              </p>
              <p className="text-xs text-slate-400 mt-1">
                ลองเลือกหมวดหมู่อื่นจากแถบ FILTERS ทางซ้ายมือ
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayGroups.map((g) => (
                <div
                  key={g.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {/* Image Box */}
                    <div className="h-44 w-full bg-slate-100 relative overflow-hidden">
                      {g.image_url || g.cover_image_url ? (
                        <img
                          src={g.image_url || g.cover_image_url}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as any).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-300">
                          <Package className="w-8 h-8" />
                        </div>
                      )}

                      {/* Tag pill */}
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/90 backdrop-blur-xs text-slate-700 shadow-xs">
                        {g.tag || "Props"}
                      </span>

                      {/* product_sup source badge */}
                      <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#84492C]/90 text-white shadow-xs">
                        DB: {g.product_sup || "(ไม่มี)"}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{g.id}</p>
                          <p className="text-xs text-slate-500 line-clamp-1">
                            {g.name || "ไม่มีชื่อกลุ่ม"}
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            setEditingGroupId(g.id);
                            setEditGroupSup(g.product_sup || "");
                            setEditGroupTag(g.tag || "Props");
                          }}
                          title="แก้ไขหมวดหมู่นี้"
                          className="p-1 text-slate-400 hover:text-[#84492C]"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Inline quick edit */}
                      {editingGroupId === g.id && (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                          <input
                            type="text"
                            value={editGroupSup}
                            onChange={(e) => setEditGroupSup(e.target.value)}
                            placeholder="ชื่อหมวด product_sup"
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => setEditingGroupId(null)}
                              className="px-2 py-0.5 text-slate-500 rounded"
                            >
                              ยกเลิก
                            </button>
                            <button
                              onClick={() => handleSaveSingleGroup(g.id)}
                              disabled={isPending}
                              className="px-2 py-0.5 bg-[#84492C] text-white font-semibold rounded"
                            >
                              บันทึก
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Sub-products list */}
                      {g.products && g.products.length > 0 ? (
                        <div className="space-y-1 pt-2 border-t border-slate-100">
                          {g.products.slice(0, 3).map((p: any) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-slate-50"
                            >
                              <span className="font-semibold text-slate-700 truncate mr-2">
                                {p.sku}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="font-bold text-slate-800">
                                  ฿{Number(p.price || 0).toLocaleString()}
                                </span>
                                <span
                                  className={`text-[9px] font-bold px-1 rounded ${
                                    (p.status || "").toLowerCase().includes("stock") ||
                                    p.status === "active"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {p.status}
                                </span>
                              </div>
                            </div>
                          ))}
                          {g.products.length > 3 && (
                            <p className="text-[10px] text-slate-400 text-center">
                              + อีก {g.products.length - 3} สินค้าย่อย
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic pt-2">
                          ไม่มีสินค้าผูกอยู่
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {g.products?.length || 0} ชิ้น
                    </span>
                    <button
                      onClick={() => openStorefront(g.product_sup || "All")}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#84492C] hover:underline"
                    >
                      <span>ดูที่หน้าบ้าน</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
