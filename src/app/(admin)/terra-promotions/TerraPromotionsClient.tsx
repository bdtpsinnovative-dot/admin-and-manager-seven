"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Sparkles,
  Ticket,
  Percent,
  Coins,
  Plus,
  Search,
  Check,
  X,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  Zap,
  Tag,
  AlertCircle,
  Copy,
  CheckCircle2,
  Package,
  TrendingUp,
  Clock,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import {
  TerraPromotion,
  AvailableCollectionGroup,
  createTerraPromotion,
  updateTerraPromotion,
  toggleTerraPromotion,
  deleteTerraPromotion,
  getTerraPromotions,
} from "@/actions/terra-promotions";

const R2_BASE = "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/";

function getImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return R2_BASE + url;
}

export default function TerraPromotionsClient({
  initialPromotions,
  collectionGroups,
}: {
  initialPromotions: TerraPromotion[];
  collectionGroups: AvailableCollectionGroup[];
}) {
  const [promotions, setPromotions] = useState<TerraPromotion[]>(initialPromotions);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "auto" | "coupon" | "active" | "inactive">("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<TerraPromotion | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCollectionId, setFormCollectionId] = useState("");
  const [formTriggerType, setFormTriggerType] = useState<"auto" | "coupon">("auto");
  const [formCouponCode, setFormCouponCode] = useState("");
  const [formDiscountType, setFormDiscountType] = useState<"percentage" | "fixed_amount">("percentage");
  const [formDiscountValue, setFormDiscountValue] = useState<number>(10);
  const [formMinSets, setFormMinSets] = useState<number>(1);
  const [formMaxDiscount, setFormMaxDiscount] = useState<string>("");
  const [formStartDate, setFormStartDate] = useState<string>("");
  const [formEndDate, setFormEndDate] = useState<string>("");
  const [formUsageLimit, setFormUsageLimit] = useState<string>("");
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  // Collection Picker Search
  const [collectionSearch, setCollectionSearch] = useState("");

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Reset form
  const handleOpenCreateModal = () => {
    setEditingPromotion(null);
    setFormTitle("");
    setFormDescription("");
    setFormCollectionId(collectionGroups[0]?.id || "");
    setFormTriggerType("auto");
    setFormCouponCode("");
    setFormDiscountType("percentage");
    setFormDiscountValue(10);
    setFormMinSets(1);
    setFormMaxDiscount("");
    setFormStartDate("");
    setFormEndDate("");
    setFormUsageLimit("");
    setFormIsActive(true);
    setCollectionSearch("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: TerraPromotion) => {
    setEditingPromotion(p);
    setFormTitle(p.title);
    setFormDescription(p.description || "");
    setFormCollectionId(p.collection_group_id || "");
    setFormTriggerType(p.trigger_type);
    setFormCouponCode(p.coupon_code || "");
    setFormDiscountType(p.discount_type);
    setFormDiscountValue(p.discount_value);
    setFormMinSets(p.min_sets || 1);
    setFormMaxDiscount(p.max_discount_amount ? String(p.max_discount_amount) : "");
    setFormStartDate(p.start_date ? p.start_date.slice(0, 16) : "");
    setFormEndDate(p.end_date ? p.end_date.slice(0, 16) : "");
    setFormUsageLimit(p.usage_limit ? String(p.usage_limit) : "");
    setFormIsActive(p.is_active);
    setCollectionSearch("");
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formTitle.trim()) {
      alert("กรุณากรอกชื่อโปรโมชัน");
      return;
    }
    if (!formCollectionId) {
      alert("กรุณาเลือก Collection Group");
      return;
    }
    if (formDiscountValue <= 0) {
      alert("มูลค่าส่วนลดต้องมากกว่า 0");
      return;
    }
    if (formTriggerType === "coupon" && !formCouponCode.trim()) {
      alert("กรุณากรอกรหัสคูปอง (Coupon Code)");
      return;
    }

    startTransition(async () => {
      if (editingPromotion) {
        const res = await updateTerraPromotion(editingPromotion.id, {
          title: formTitle,
          description: formDescription,
          collection_group_id: formCollectionId,
          trigger_type: formTriggerType,
          coupon_code: formCouponCode,
          discount_type: formDiscountType,
          discount_value: formDiscountValue,
          min_sets: formMinSets,
          max_discount_amount: formMaxDiscount ? Number(formMaxDiscount) : null,
          start_date: formStartDate || null,
          end_date: formEndDate || null,
          usage_limit: formUsageLimit ? Number(formUsageLimit) : null,
          is_active: formIsActive,
        });

        if (!res.success) {
          alert(res.error || "เกิดข้อผิดพลาดในการแก้ไข");
          return;
        }
      } else {
        const res = await createTerraPromotion({
          title: formTitle,
          description: formDescription,
          collection_group_id: formCollectionId,
          trigger_type: formTriggerType,
          coupon_code: formCouponCode,
          discount_type: formDiscountType,
          discount_value: formDiscountValue,
          min_sets: formMinSets,
          max_discount_amount: formMaxDiscount ? Number(formMaxDiscount) : null,
          start_date: formStartDate || null,
          end_date: formEndDate || null,
          usage_limit: formUsageLimit ? Number(formUsageLimit) : null,
          is_active: formIsActive,
        });

        if (!res.success) {
          alert(res.error || "เกิดข้อผิดพลาดในการสร้างโปรโมชัน");
          return;
        }
      }

      const updated = await getTerraPromotions();
      setPromotions(updated);
      setIsModalOpen(false);
    });
  };

  const handleToggle = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      const res = await toggleTerraPromotion(id, currentStatus);
      if (res.success) {
        setPromotions((prev) =>
          prev.map((p) => (p.id === id ? { ...p, is_active: !currentStatus } : p))
        );
      } else {
        alert(res.error || "ไม่สามารถเปลี่ยนสถานะได้");
      }
    });
  };

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`คุณต้องการลบโปรโมชัน "${title}" ใช่หรือไม่?`)) return;

    startTransition(async () => {
      const res = await deleteTerraPromotion(id);
      if (res.success) {
        setPromotions((prev) => prev.filter((p) => p.id !== id));
      } else {
        alert(res.error || "ไม่สามารถลบโปรโมชันได้");
      }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Filtered promotions
  const filteredPromotions = useMemo(() => {
    return promotions.filter((p) => {
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.coupon_code && p.coupon_code.toLowerCase().includes(q)) ||
        (p.collection_name && p.collection_name.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (filterTab === "auto") return p.trigger_type === "auto";
      if (filterTab === "coupon") return p.trigger_type === "coupon";
      if (filterTab === "active") return p.is_active;
      if (filterTab === "inactive") return !p.is_active;
      return true;
    });
  }, [promotions, searchQuery, filterTab]);

  // Filtered collection options for picker
  const filteredCollectionGroups = useMemo(() => {
    const q = collectionSearch.trim().toLowerCase();
    if (!q) return collectionGroups;
    return collectionGroups.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.tag && c.tag.toLowerCase().includes(q)) ||
        c.sampleSkus.some((sku) => sku.toLowerCase().includes(q))
    );
  }, [collectionGroups, collectionSearch]);

  const selectedColGroup = collectionGroups.find((c) => c.id === formCollectionId);

  // Stats
  const activeCount = promotions.filter((p) => p.is_active).length;
  const autoCount = promotions.filter((p) => p.trigger_type === "auto" && p.is_active).length;
  const couponCount = promotions.filter((p) => p.trigger_type === "coupon" && p.is_active).length;
  const totalUses = promotions.reduce((sum, p) => sum + (p.used_count || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute left-1/3 bottom-0 -mb-10 h-48 w-48 rounded-full bg-blue-500/15 blur-2xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 backdrop-blur-md border border-indigo-500/30">
              <Sparkles className="h-3.5 w-3.5" />
              Terra E-Commerce Promotion Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Terra คูปอง & โปรโมชัน Collection
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              กำหนดส่วนลดเมื่อลูกค้าซื้อสินค้าครบทั้ง Collection บนหน้าเว็บ Terra รองรับทั้งระบบลดให้อัตโนมัติและคูปองกรอกโค้ด
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            สร้างโปรโมชันใหม่
          </button>
        </div>

        {/* Stats Strip */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 pt-6 border-t border-white/10">
          <div className="rounded-2xl bg-white/5 p-3.5 backdrop-blur-xs border border-white/10">
            <p className="text-xs text-slate-400 font-medium">โปรโมชันที่เปิดอยู่</p>
            <p className="text-2xl font-black text-white mt-1 font-mono">{activeCount}</p>
          </div>
          <div className="rounded-2xl bg-white/5 p-3.5 backdrop-blur-xs border border-white/10">
            <p className="text-xs text-slate-400 font-medium">Auto-apply (ลดทันที)</p>
            <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">{autoCount}</p>
          </div>
          <div className="rounded-2xl bg-white/5 p-3.5 backdrop-blur-xs border border-white/10">
            <p className="text-xs text-slate-400 font-medium">คูปองแบบกรอกโค้ด</p>
            <p className="text-2xl font-black text-amber-400 mt-1 font-mono">{couponCount}</p>
          </div>
          <div className="rounded-2xl bg-white/5 p-3.5 backdrop-blur-xs border border-white/10">
            <p className="text-xs text-slate-400 font-medium">จำนวนครั้งที่ใช้แล้ว</p>
            <p className="text-2xl font-black text-indigo-300 mt-1 font-mono">{totalUses}</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition ${filterTab === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
          >
            ทั้งหมด ({promotions.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("auto")}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1 ${filterTab === "auto" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
          >
            <Zap className="h-3 w-3 text-emerald-600" />
            Auto-apply
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("coupon")}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1 ${filterTab === "coupon" ? "bg-white text-amber-700 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
          >
            <Ticket className="h-3 w-3 text-amber-600" />
            โค้ดคูปอง
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("active")}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition ${filterTab === "active" ? "bg-white text-blue-700 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
          >
            เปิดใช้งาน ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("inactive")}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition ${filterTab === "inactive" ? "bg-white text-slate-700 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
          >
            ปิดใช้งาน ({promotions.length - activeCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อโปรโมชัน, โค้ด, หรือ Collection..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Promotions List Grid */}
      {filteredPromotions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4">
            <Ticket className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">ยังไม่พบโปรโมชัน</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery ? "ไม่พบโปรโมชันที่ตรงกับคำค้นหา" : "สร้างโปรโมชันหรือคูปองส่วนลดสำหรับ Collection แรกของคุณตอนนี้"}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              สร้างโปรโมชันใหม่
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPromotions.map((promo) => {
            const isAuto = promo.trigger_type === "auto";
            const isPercent = promo.discount_type === "percentage";
            const isExpired = promo.end_date && new Date(promo.end_date).toISOString() < new Date().toISOString();

            return (
              <div
                key={promo.id}
                className={`group relative flex flex-col justify-between rounded-3xl border bg-white p-5 transition-all duration-200 hover:shadow-lg ${
                  !promo.is_active
                    ? "opacity-60 border-slate-200 bg-slate-50/50"
                    : isAuto
                    ? "border-emerald-200/80 hover:border-emerald-400"
                    : "border-indigo-200/80 hover:border-indigo-400"
                }`}
              >
                {/* Top Badge & Status Toggle */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isAuto ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                          <Zap className="h-3 w-3" />
                          ลดทันทีเมื่อครบเซ็ต
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 border border-amber-200">
                          <Ticket className="h-3 w-3" />
                          คูปองกรอกโค้ด
                        </span>
                      )}

                      {isExpired && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 border border-rose-200">
                          หมดอายุ
                        </span>
                      )}
                    </div>

                    {/* Switch Toggle */}
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleToggle(promo.id, promo.is_active)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        promo.is_active ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                      title={promo.is_active ? "คลิกเพื่อปิดใช้งาน" : "คลิกเพื่อเปิดใช้งาน"}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          promo.is_active ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Title & Description */}
                  <h3 className="mt-3 text-base font-bold text-slate-900 leading-snug">
                    {promo.title}
                  </h3>
                  {promo.description && (
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                      {promo.description}
                    </p>
                  )}

                  {/* Coupon Code Strip (If Coupon) */}
                  {!isAuto && promo.coupon_code && (
                    <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-900 p-2.5 text-white font-mono shadow-xs">
                      <div className="flex items-center gap-2 truncate">
                        <Tag className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span className="text-xs font-bold tracking-wider text-amber-300 uppercase truncate">
                          {promo.coupon_code}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(promo.coupon_code!)}
                        className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2 py-1 text-[10px] font-bold hover:bg-white/25 transition shrink-0"
                        title="คัดลอกโค้ด"
                      >
                        {copiedCode === promo.coupon_code ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span>คัดลอกแล้ว</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>คัดลอก</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Discount Value Display */}
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-black font-mono text-indigo-600 tracking-tight">
                      {isPercent ? `${promo.discount_value}%` : `฿${promo.discount_value.toLocaleString()}`}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {isPercent
                        ? promo.max_discount_amount
                          ? `ส่วนลด (สูงสุด ฿${promo.max_discount_amount.toLocaleString()})`
                          : "ส่วนลดของเซ็ต"
                        : "ส่วนลดต่อเซ็ต"}
                    </span>
                  </div>

                  {/* Target Collection Info Card */}
                  <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-2.5 border border-slate-100">
                    <div className="h-11 w-11 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {promo.collection_image ? (
                        <img
                          src={getImageUrl(promo.collection_image)!}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Layers className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {promo.collection_name || `Collection #${promo.collection_group_id}`}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        เงื่อนไข: ต้องมีครบทั้ง {promo.collection_item_count || "?"} ชิ้นในเซ็ต
                      </p>
                    </div>
                  </div>

                  {/* Promotion Schedule & Usage Meta */}
                  <div className="mt-4 space-y-1.5 text-[11px] text-slate-500 font-medium border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="h-3 w-3" /> ระยะเวลา:
                      </span>
                      <span>
                        {promo.start_date || promo.end_date
                          ? `${promo.start_date ? new Date(promo.start_date).toLocaleDateString("th-TH") : "เริ่มทันที"} – ${
                              promo.end_date ? new Date(promo.end_date).toLocaleDateString("th-TH") : "ไม่จำกัด"
                            }`
                          : "ไม่จำกัดระยะเวลา"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-400">
                        <TrendingUp className="h-3 w-3" /> สถิติการใช้:
                      </span>
                      <span className="font-mono font-bold text-slate-700">
                        {promo.used_count} {promo.usage_limit ? `/ ${promo.usage_limit} สิทธิ์` : "ครั้ง"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(promo)}
                    className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    แก้ไข
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(promo.id, promo.title)}
                    className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    ลบ
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT PROMOTION */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingPromotion ? "แก้ไขโปรโมชัน Collection" : "สร้างโปรโมชัน Collection ใหม่"}
                  </h2>
                  <p className="text-xs text-slate-500">สำหรับใช้งานบนระบบตะกร้าสินค้าของหน้าเว็บ Terra</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-5">
              {/* 1. Title & Description */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อโปรโมชัน <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น โปรซื้อครบเซ็ตแจกันดินเผา ลดทันที 15%"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">คำอธิบายโปรโมชัน (ถ้ามี)</label>
                  <textarea
                    rows={2}
                    placeholder="รายละเอียดเงื่อนไขเพิ่มเติม..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-medium text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition"
                  />
                </div>
              </div>

              {/* 2. Collection Group Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เลือก Collection Group ที่ต้องซื้อครบ <span className="text-rose-500">*</span>
                </label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อคอลเลกชัน หรือ SKU..."
                    value={collectionSearch}
                    onChange={(e) => setCollectionSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/50 p-2">
                  {filteredCollectionGroups.map((col) => {
                    const isSelected = formCollectionId === col.id;
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => setFormCollectionId(col.id)}
                        className={`flex items-center gap-2.5 rounded-xl p-2 text-left transition border ${
                          isSelected
                            ? "bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-900"
                            : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                        }`}
                      >
                        <div className="h-9 w-9 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                          {col.imageUrl ? (
                            <img src={getImageUrl(col.imageUrl)!} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Layers className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate">{col.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {col.itemCount} SKU ({col.sampleSkus.join(", ")})
                          </p>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-indigo-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Trigger Type (Auto-apply vs Coupon) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">รูปแบบการใช้งาน</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormTriggerType("auto")}
                    className={`flex flex-col items-center justify-center gap-1 rounded-2xl p-3 border text-center transition ${
                      formTriggerType === "auto"
                        ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-900 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <Zap className="h-5 w-5 text-emerald-600" />
                    <span className="text-xs">Auto-apply</span>
                    <span className="text-[10px] text-slate-500 font-normal">ลดให้อัตโนมัติเมื่อครบเซ็ต</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormTriggerType("coupon")}
                    className={`flex flex-col items-center justify-center gap-1 rounded-2xl p-3 border text-center transition ${
                      formTriggerType === "coupon"
                        ? "bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 text-amber-900 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                    }`}
                  >
                    <Ticket className="h-5 w-5 text-amber-600" />
                    <span className="text-xs">คูปองกรอกโค้ด</span>
                    <span className="text-[10px] text-slate-500 font-normal">ลูกค้าต้องพิมพ์โค้ดเอง</span>
                  </button>
                </div>

                {formTriggerType === "coupon" && (
                  <div className="mt-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      รหัสคูปอง (Coupon Code) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น SUMMERVASE15"
                      value={formCouponCode}
                      onChange={(e) => setFormCouponCode(e.target.value.toUpperCase())}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-mono font-bold uppercase text-slate-900 outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100 transition"
                    />
                  </div>
                )}
              </div>

              {/* 4. Discount Type & Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ประเภทส่วนลด</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormDiscountType("percentage")}
                      className={`flex items-center justify-center gap-1 rounded-xl p-2 text-xs font-bold border transition ${
                        formDiscountType === "percentage"
                          ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                      }`}
                    >
                      <Percent className="h-3.5 w-3.5" />
                      เปอร์เซ็นต์ (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormDiscountType("fixed_amount")}
                      className={`flex items-center justify-center gap-1 rounded-xl p-2 text-xs font-bold border transition ${
                        formDiscountType === "fixed_amount"
                          ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                      }`}
                    >
                      <Coins className="h-3.5 w-3.5" />
                      จำนวนบาท (฿)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    มูลค่าส่วนลด ({formDiscountType === "percentage" ? "%" : "บาท"}) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formDiscountValue}
                    onChange={(e) => setFormDiscountValue(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-mono font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* 5. Advanced Settings (Max Cap, Limit, Schedule) */}
              <div className="space-y-3 rounded-2xl bg-slate-50 p-4 border border-slate-200">
                <p className="text-xs font-bold text-slate-800">การตั้งค่าเงื่อนไขเพิ่มเติม (ไม่บังคับ)</p>

                {formDiscountType === "percentage" && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      เพดานส่วนลดสูงสุด (บาท) (เว้นว่างได้)
                    </label>
                    <input
                      type="number"
                      placeholder="เช่น 1000 (ลดไม่เกิน 1,000 บาท)"
                      value={formMaxDiscount}
                      onChange={(e) => setFormMaxDiscount(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">วันเริ่มต้น</label>
                    <input
                      type="datetime-local"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">วันสิ้นสุด</label>
                    <input
                      type="datetime-local"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    จำกัดสิทธิ์การใช้งานทั้งหมด (ครั้ง) (เว้นว่างถ้าไม่จำกัด)
                  </label>
                  <input
                    type="number"
                    placeholder="เช่น 100 สิทธิ์"
                    value={formUsageLimit}
                    onChange={(e) => setFormUsageLimit(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-7 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-sm disabled:opacity-50"
              >
                {isPending ? "กำลังบันทึก..." : editingPromotion ? "บันทึกการแก้ไข" : "สร้างโปรโมชัน"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
