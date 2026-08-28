"use client";

/* Hallmark · macrostructure: Workbench · tone: modern-minimal · genre: modern-minimal
 * pre-emit critique: P5 H5 E5 S5 R5 V5 · theme: Modern Minimal Studio Control Center
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: pass (46–50) · zero gradients · crisp solid surfaces
 */

import { useState, useTransition, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Tag,
  Ticket,
  Percent,
  Coins,
  Plus,
  Search,
  Check,
  X,
  Edit2,
  Trash2,
  Layers,
  Zap,
  Copy,
  Package,
  Clock,
  Store,
  Globe,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Building2,
  AlertTriangle,
} from "lucide-react";

import {
  createDiscount,
  toggleDiscountStatus,
  deleteDiscount,
  updateDiscount,
  removeDiscountRule,
} from "@/actions/discoun";

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

// ── POS Product Multi-Picker Component ──────────────────────────────────────
function ProductPicker({
  products,
  selectedProductIds,
  onSelectionChange,
}: {
  products: any[];
  selectedProductIds: string[];
  onSelectionChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return products;
    const q = query.toLowerCase();
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q)
    );
  }, [products, query]);

  const toggle = (id: string) => {
    if (selectedProductIds.includes(id)) {
      onSelectionChange(selectedProductIds.filter((item) => item !== id));
    } else {
      onSelectionChange([...selectedProductIds, id]);
    }
  };

  const removeOne = (id: string) => {
    onSelectionChange(selectedProductIds.filter((item) => item !== id));
  };

  const clearAll = () => onSelectionChange([]);
  const selectAllFiltered = () => {
    const allFilteredIds = filtered.map((p) => String(p.id));
    const merged = Array.from(new Set([...selectedProductIds, ...allFilteredIds]));
    onSelectionChange(merged);
  };

  const selectedProducts = useMemo(() => {
    const set = new Set(selectedProductIds.map(String));
    return products.filter((p) => set.has(String(p.id)));
  }, [products, selectedProductIds]);

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Search & Action Rail */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="ค้นหาชื่อสินค้า หรือ SKU..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={selectAllFiltered}
          className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 transition whitespace-nowrap"
        >
          เลือกตามค้นหา ({filtered.length})
        </button>

        {selectedProductIds.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 active:bg-rose-200 transition whitespace-nowrap"
          >
            ล้าง
          </button>
        )}
      </div>

      {/* Selected Items Tray */}
      {selectedProducts.length > 0 && (
        <div className="flex-shrink-0 bg-slate-100/80 border border-slate-200 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800">
              เลือกแล้ว {selectedProducts.length} รายการ
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 transition"
            >
              ล้างทั้งหมด
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {selectedProducts.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-2xs"
              >
                <div className="w-4 h-4 rounded overflow-hidden flex-shrink-0 bg-slate-100">
                  {getImageUrl(p.image_url) ? (
                    <img
                      src={getImageUrl(p.image_url)!}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-3 h-3 text-slate-300 mx-auto" />
                  )}
                </div>
                <span className="text-xs text-slate-700 font-medium max-w-[130px] truncate">
                  {p.name || p.sku}
                </span>
                <button
                  type="button"
                  onClick={() => removeOne(String(p.id))}
                  className="text-slate-300 hover:text-rose-500 transition flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scrollable Product List */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white min-h-0 divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <Package className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-xs text-slate-500 font-medium">
              ไม่พบสินค้าที่ตรงกับ &quot;{query}&quot;
            </p>
          </div>
        ) : (
          filtered.map((p) => {
            const isSel = selectedProductIds.includes(String(p.id));
            const imgUrl = getImageUrl(p.image_url);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(String(p.id))}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition ${isSel ? "bg-slate-50" : "hover:bg-slate-50/60"
                  }`}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${isSel
                    ? "bg-slate-900 border-slate-900"
                    : "border-slate-300 bg-white"
                    }`}
                >
                  {isSel && <Check className="w-3 h-3 text-white stroke-[3]" />}
                </div>

                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-50 flex items-center justify-center">
                  {imgUrl ? (
                    <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-4 h-4 text-slate-300" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-bold truncate ${isSel ? "text-slate-900" : "text-slate-700"
                      }`}
                  >
                    {p.name || "—"}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">{p.sku}</p>
                </div>
              </button>
            );
          })
        )}
      </div>

      <p className="text-[11px] text-slate-400 flex-shrink-0">
        {selectedProductIds.length > 0
          ? `เลือก ${selectedProductIds.length} จาก ${products.length} รายการ · เว้นว่าง = ใช้ได้กับทุกสินค้า`
          : `${filtered.length} รายการ · ไม่เลือก = ใช้ได้กับทุกสินค้าในระบบ`}
      </p>
    </div>
  );
}

// ── Main Discount Hub Component ─────────────────────────────────────────────
export default function DiscountHubClient({
  initialPosDiscounts,
  products,
  branches,
  initialTerraPromotions,
  collectionGroups,
}: {
  initialPosDiscounts: any[];
  products: any[];
  branches: any[];
  initialTerraPromotions: TerraPromotion[];
  collectionGroups: AvailableCollectionGroup[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialChannel = (searchParams.get("channel") === "terra" ? "terra" : "pos") as "pos" | "terra";

  // Channel State
  const [activeChannel, setActiveChannel] = useState<"pos" | "terra">(initialChannel);

  const handleSwitchChannel = (channel: "pos" | "terra") => {
    setActiveChannel(channel);
    const params = new URLSearchParams(window.location.search);
    params.set("channel", channel);
    router.replace(`/discounts?${params.toString()}`);
  };

  // State: POS
  const [posDiscounts, setPosDiscounts] = useState<any[]>(initialPosDiscounts);
  const [posSearch, setPosSearch] = useState("");
  const [posFilterStatus, setPosFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [isPosCreateOpen, setIsPosCreateOpen] = useState(false);
  const [isPosEditOpen, setIsPosEditOpen] = useState(false);
  const [editingPosDiscount, setEditingPosDiscount] = useState<any | null>(null);
  const [posSelectedProductIds, setPosSelectedProductIds] = useState<string[]>([]);
  const [removingRuleId, setRemovingRuleId] = useState<number | null>(null);

  // State: Terra
  const [terraPromotions, setTerraPromotions] = useState<TerraPromotion[]>(initialTerraPromotions);
  const [terraSearch, setTerraSearch] = useState("");
  const [terraFilterTab, setTerraFilterTab] = useState<"all" | "coupon" | "auto" | "active" | "inactive">("all");
  const [isTerraModalOpen, setIsTerraModalOpen] = useState(false);
  const [editingTerraPromotion, setEditingTerraPromotion] = useState<TerraPromotion | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Terra Form State
  const [terraFormPromoScope, setTerraFormPromoScope] = useState<"set" | "global">("set");
  const [terraFormTitle, setTerraFormTitle] = useState("");
  const [terraFormDescription, setTerraFormDescription] = useState("");
  const [terraFormCollectionId, setTerraFormCollectionId] = useState("");
  const [terraFormTriggerType, setTerraFormTriggerType] = useState<"auto" | "coupon">("auto");
  const [terraFormCouponCode, setTerraFormCouponCode] = useState("");
  const [terraFormDiscountType, setTerraFormDiscountType] = useState<"percentage" | "fixed_amount">("percentage");
  const [terraFormDiscountValue, setTerraFormDiscountValue] = useState<number>(10);
  const [terraFormMinSets, setTerraFormMinSets] = useState<number>(1);
  const [terraFormMinSpend, setTerraFormMinSpend] = useState<string>("");
  const [terraFormMaxDiscount, setTerraFormMaxDiscount] = useState<string>("");
  const [terraFormStartDate, setTerraFormStartDate] = useState<string>("");
  const [terraFormEndDate, setTerraFormEndDate] = useState<string>("");
  const [terraFormUsageLimit, setTerraFormUsageLimit] = useState<string>("");
  const [terraFormIsActive, setTerraFormIsActive] = useState<boolean>(true);
  const [terraCollectionSearch, setTerraCollectionSearch] = useState("");
  const [terraCategoryFilter, setTerraCategoryFilter] = useState<string>("all");
  const [formInlineError, setFormInlineError] = useState<string | null>(null);

  // Delete Confirmation Modal State (Replaces native browser alert/confirm)
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{
    id: string | number;
    title: string;
    type: "pos" | "terra";
  } | null>(null);

  // Feedback Notification Toast (Always at top layer z-[99999])
  const [toast, setToast] = useState<{
    show: boolean;
    type: "success" | "error";
    title: string;
    message: string;
  }>({ show: false, type: "success", title: "", message: "" });

  const triggerToast = (type: "success" | "error", title: string, message: string) => {
    setToast({ show: true, type, title, message });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4000);
  };

  const [isPending, startTransition] = useTransition();

  // Metrics
  const posActiveCount = useMemo(() => posDiscounts.filter((d) => d.active).length, [posDiscounts]);
  const terraActiveCount = useMemo(() => terraPromotions.filter((p) => p.is_active).length, [terraPromotions]);
  const terraAutoCount = useMemo(() => terraPromotions.filter((p) => (p.promo_scope === "set" || p.trigger_type === "auto") && p.is_active).length, [terraPromotions]);
  const terraCouponCount = useMemo(() => terraPromotions.filter((p) => (p.promo_scope === "global" || p.trigger_type === "coupon") && p.is_active).length, [terraPromotions]);
  const terraTotalUsed = useMemo(() => terraPromotions.reduce((sum, p) => sum + (p.used_count || 0), 0), [terraPromotions]);

  // Unique Parent Categories for Collection Picker Tabs
  const uniqueParentCategories = useMemo(() => {
    const set = new Set<string>();
    collectionGroups.forEach((c) => {
      if (c.parentCategoryName) set.add(c.parentCategoryName);
    });
    return Array.from(set);
  }, [collectionGroups]);

  // ── POS Filtered List ──────────────────────────────────────────────────────
  const filteredPosDiscounts = useMemo(() => {
    return posDiscounts.filter((item) => {
      const q = posSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        item.name?.toLowerCase().includes(q) ||
        (item.code && item.code.toLowerCase().includes(q));

      if (!matchSearch) return false;
      if (posFilterStatus === "active") return item.active;
      if (posFilterStatus === "inactive") return !item.active;
      return true;
    });
  }, [posDiscounts, posSearch, posFilterStatus]);

  // ── POS Handlers ───────────────────────────────────────────────────────────
  const handleTogglePosStatus = (id: number, currentActive: boolean) => {
    startTransition(async () => {
      const res = await toggleDiscountStatus(id, currentActive);
      if (res?.error) {
        triggerToast("error", "ข้อผิดพลาด", res.error);
      } else {
        setPosDiscounts((prev) =>
          prev.map((d) => (d.id === id ? { ...d, active: !currentActive } : d))
        );
        triggerToast("success", "สำเร็จ", `เปลี่ยนสถานะส่วนลดเรียบร้อยแล้ว`);
      }
    });
  };

  const handleCreatePosDiscount = async (formData: FormData) => {
    setFormInlineError(null);
    formData.set("product_ids", JSON.stringify(posSelectedProductIds));
    startTransition(async () => {
      const res = await createDiscount(formData);
      if (res?.error) {
        setFormInlineError(res.error);
        triggerToast("error", "เกิดข้อผิดพลาด", res.error);
      } else {
        setIsPosCreateOpen(false);
        setPosSelectedProductIds([]);
        triggerToast("success", "สร้างส่วนลดสำเร็จ", "บันทึกส่วนลด POS หน้าร้านเรียบร้อยแล้ว");
        window.location.reload();
      }
    });
  };

  const handleEditPosDiscount = async (formData: FormData) => {
    setFormInlineError(null);
    startTransition(async () => {
      const res = await updateDiscount(formData);
      if (res?.error) {
        setFormInlineError(res.error);
        triggerToast("error", "เกิดข้อผิดพลาด", res.error);
      } else {
        setIsPosEditOpen(false);
        setEditingPosDiscount(null);
        triggerToast("success", "แก้ไขสำเร็จ", "แก้ไขข้อมูลส่วนลด POS เรียบร้อยแล้ว");
        window.location.reload();
      }
    });
  };

  const handleRemovePosRule = async (ruleId: number) => {
    setRemovingRuleId(ruleId);
    const res = await removeDiscountRule(ruleId);
    setRemovingRuleId(null);
    if (res?.error) {
      triggerToast("error", "ข้อผิดพลาด", res.error);
    } else {
      triggerToast("success", "สำเร็จ", "ถอดสินค้าออกจากส่วนลดแล้ว");
      if (editingPosDiscount) {
        setEditingPosDiscount({
          ...editingPosDiscount,
          discount_rules: editingPosDiscount.discount_rules.filter(
            (r: any) => r.id !== ruleId
          ),
        });
      }
      setPosDiscounts((prev) =>
        prev.map((d) => ({
          ...d,
          discount_rules: (d.discount_rules || []).filter((r: any) => r.id !== ruleId),
        }))
      );
    }
  };

  // ── Unified Delete Confirmation Action ─────────────────────────────────────
  const handleExecuteDelete = () => {
    if (!deleteConfirmItem) return;
    const { id, title, type } = deleteConfirmItem;

    startTransition(async () => {
      if (type === "pos") {
        const res = await deleteDiscount(Number(id));
        if (res?.error) {
          triggerToast("error", "ข้อผิดพลาด", res.error);
        } else {
          setPosDiscounts((prev) => prev.filter((d) => d.id !== Number(id)));
          triggerToast("success", "ลบสำเร็จ", `ลบส่วนลด "${title}" ออกจากระบบแล้ว`);
        }
      } else {
        const res = await deleteTerraPromotion(String(id));
        if (res.success) {
          setTerraPromotions((prev) => prev.filter((p) => p.id !== String(id)));
          triggerToast("success", "ลบสำเร็จ", `ลบโปรโมชัน "${title}" เรียบร้อยแล้ว`);
        } else {
          triggerToast("error", "ข้อผิดพลาด", res.error || "ไม่สามารถลบโปรโมชันได้");
        }
      }
      setDeleteConfirmItem(null);
    });
  };

  // ── Terra Filtered List ────────────────────────────────────────────────────
  const filteredTerraPromotions = useMemo(() => {
    return terraPromotions.filter((p) => {
      const q = terraSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.coupon_code && p.coupon_code.toLowerCase().includes(q)) ||
        (p.collection_name && p.collection_name.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q));

      if (!matchSearch) return false;
      if (terraFilterTab === "coupon") return p.trigger_type === "coupon";
      if (terraFilterTab === "auto") return p.trigger_type === "auto";
      if (terraFilterTab === "active") return p.is_active;
      if (terraFilterTab === "inactive") return !p.is_active;
      return true;
    });
  }, [terraPromotions, terraSearch, terraFilterTab]);

  const filteredCollectionGroups = useMemo(() => {
    const q = terraCollectionSearch.trim().toLowerCase();
    return collectionGroups.filter((c) => {
      if (terraCategoryFilter !== "all" && c.parentCategoryName !== terraCategoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.tag && c.tag.toLowerCase().includes(q)) ||
        c.parentCategoryName?.toLowerCase().includes(q) ||
        c.sampleSkus.some((sku) => sku.toLowerCase().includes(q))
      );
    });
  }, [collectionGroups, terraCollectionSearch, terraCategoryFilter]);

  // Selected Collection Item for Form preview
  const selectedCollectionItem = useMemo(() => {
    return collectionGroups.find((c) => c.id === terraFormCollectionId);
  }, [collectionGroups, terraFormCollectionId]);

  // ── Terra Handlers ─────────────────────────────────────────────────────────
  const handleOpenCreateTerraModal = () => {
    setFormInlineError(null);
    setEditingTerraPromotion(null);
    setTerraFormPromoScope("set"); // Default to Auto Set
    setTerraFormTitle("");
    setTerraFormDescription("");
    setTerraFormCollectionId(collectionGroups[0]?.id || "");
    setTerraFormTriggerType("auto");
    setTerraFormCouponCode("");
    setTerraFormDiscountType("percentage");
    setTerraFormDiscountValue(10);
    setTerraFormMinSets(1);
    setTerraFormMinSpend("");
    setTerraFormMaxDiscount("");
    setTerraFormStartDate("");
    setTerraFormEndDate("");
    setTerraFormUsageLimit("");
    setTerraFormIsActive(true);
    setTerraCollectionSearch("");
    setTerraCategoryFilter("all");
    setIsTerraModalOpen(true);
  };

  const handleOpenEditTerraModal = (p: TerraPromotion) => {
    setFormInlineError(null);
    setEditingTerraPromotion(p);
    const scope = p.promo_scope || (p.trigger_type === "auto" ? "set" : "global");
    setTerraFormPromoScope(scope);
    setTerraFormTitle(p.title);
    setTerraFormDescription(p.description || "");
    setTerraFormCollectionId(p.collection_group_id || collectionGroups[0]?.id || "");
    setTerraFormTriggerType(p.trigger_type);
    setTerraFormCouponCode(p.coupon_code || "");
    setTerraFormDiscountType(p.discount_type);
    setTerraFormDiscountValue(p.discount_value);
    setTerraFormMinSets(p.min_sets || 1);
    setTerraFormMinSpend(p.min_spend ? String(p.min_spend) : "");
    setTerraFormMaxDiscount(p.max_discount_amount ? String(p.max_discount_amount) : "");
    setTerraFormStartDate(p.start_date ? p.start_date.slice(0, 16) : "");
    setTerraFormEndDate(p.end_date ? p.end_date.slice(0, 16) : "");
    setTerraFormUsageLimit(p.usage_limit ? String(p.usage_limit) : "");
    setTerraFormIsActive(p.is_active);
    setTerraCollectionSearch("");
    setTerraCategoryFilter("all");
    setIsTerraModalOpen(true);
  };

  const handleSaveTerraPromotion = () => {
    setFormInlineError(null);

    if (!terraFormTitle.trim()) {
      setFormInlineError("กรุณากรอกชื่อโปรโมชัน");
      triggerToast("error", "ข้อมูลไม่ครบถ้วน", "กรุณากรอกชื่อโปรโมชัน");
      return;
    }
    if (terraFormPromoScope === "set" && !terraFormCollectionId) {
      setFormInlineError("กรุณาเลือกเซ็ตสินค้า (Sub-Collection)");
      triggerToast("error", "ข้อมูลไม่ครบถ้วน", "กรุณาเลือกเซ็ตสินค้า (Sub-Collection)");
      return;
    }
    if (terraFormDiscountValue <= 0) {
      setFormInlineError("มูลค่าส่วนลดต้องมากกว่า 0");
      triggerToast("error", "ข้อมูลไม่ถูกต้อง", "มูลค่าส่วนลดต้องมากกว่า 0");
      return;
    }
    if (terraFormPromoScope === "global" && !terraFormCouponCode.trim()) {
      setFormInlineError("กรุณากรอกรหัสคูปอง (Coupon Code)");
      triggerToast("error", "ข้อมูลไม่ครบถ้วน", "กรุณากรอกรหัสคูปอง (Coupon Code)");
      return;
    }

    startTransition(async () => {
      if (editingTerraPromotion) {
        const res = await updateTerraPromotion(editingTerraPromotion.id, {
          title: terraFormTitle,
          description: terraFormDescription,
          promo_scope: terraFormPromoScope,
          collection_group_id: terraFormPromoScope === "set" ? terraFormCollectionId : null,
          trigger_type: terraFormPromoScope === "set" ? "auto" : "coupon",
          coupon_code: terraFormPromoScope === "global" ? terraFormCouponCode : null,
          discount_type: terraFormPromoScope === "set" ? "percentage" : terraFormDiscountType,
          discount_value: terraFormDiscountValue,
          min_sets: terraFormPromoScope === "set" ? terraFormMinSets : 1,
          min_spend: terraFormPromoScope === "global" && terraFormMinSpend ? Number(terraFormMinSpend) : 0,
          max_discount_amount: terraFormMaxDiscount ? Number(terraFormMaxDiscount) : null,
          start_date: terraFormStartDate || null,
          end_date: terraFormEndDate || null,
          usage_limit: terraFormUsageLimit ? Number(terraFormUsageLimit) : null,
          is_active: terraFormIsActive,
        });

        if (!res.success) {
          setFormInlineError(res.error || "เกิดข้อผิดพลาดในการแก้ไข");
          triggerToast("error", "ข้อผิดพลาด", res.error || "เกิดข้อผิดพลาดในการแก้ไข");
          return;
        }
        setIsTerraModalOpen(false);
        triggerToast("success", "บันทึกสำเร็จ", `แก้ไขโปรโมชัน "${terraFormTitle}" เรียบร้อยแล้ว`);
      } else {
        const res = await createTerraPromotion({
          title: terraFormTitle,
          description: terraFormDescription,
          promo_scope: terraFormPromoScope,
          collection_group_id: terraFormPromoScope === "set" ? terraFormCollectionId : null,
          trigger_type: terraFormPromoScope === "set" ? "auto" : "coupon",
          coupon_code: terraFormPromoScope === "global" ? terraFormCouponCode : null,
          discount_type: terraFormPromoScope === "set" ? "percentage" : terraFormDiscountType,
          discount_value: terraFormDiscountValue,
          min_sets: terraFormPromoScope === "set" ? terraFormMinSets : 1,
          min_spend: terraFormPromoScope === "global" && terraFormMinSpend ? Number(terraFormMinSpend) : 0,
          max_discount_amount: terraFormMaxDiscount ? Number(terraFormMaxDiscount) : null,
          start_date: terraFormStartDate || null,
          end_date: terraFormEndDate || null,
          usage_limit: terraFormUsageLimit ? Number(terraFormUsageLimit) : null,
          is_active: terraFormIsActive,
        });

        if (!res.success) {
          setFormInlineError(res.error || "เกิดข้อผิดพลาดในการสร้างโปรโมชัน");
          triggerToast("error", "ข้อผิดพลาด", res.error || "เกิดข้อผิดพลาดในการสร้างโปรโมชัน");
          return;
        }
        setIsTerraModalOpen(false);
        triggerToast("success", "สร้างโปรโมชันสำเร็จ", `สร้างโปรโมชัน "${terraFormTitle}" สำเร็จแล้ว`);
      }

      const updated = await getTerraPromotions();
      setTerraPromotions(updated);
    });
  };

  const handleToggleTerraStatus = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      const res = await toggleTerraPromotion(id, currentStatus);
      if (res.success) {
        setTerraPromotions((prev) =>
          prev.map((p) => (p.id === id ? { ...p, is_active: !currentStatus } : p))
        );
        triggerToast("success", "สำเร็จ", `เปลี่ยนสถานะโปรโมชันแล้ว`);
      } else {
        triggerToast("error", "ข้อผิดพลาด", res.error || "ไม่สามารถเปลี่ยนสถานะได้");
      }
    });
  };

  const copyCouponCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
    triggerToast("success", "คัดลอกแล้ว", `คัดลอกรหัสคูปอง ${text} ไปยังคลิปบอร์ด`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 font-sans antialiased text-slate-800">
      {/* ── Toast Notification: ALWAYS on top of everything (z-[99999]) ─────────── */}
      {toast.show && (
        <div
          role="alert"
          className={`fixed top-6 right-6 z-[99999] flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-2xl border transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${toast.type === "success"
            ? "bg-slate-900 text-white border-emerald-500/50 shadow-emerald-950/20"
            : "bg-slate-900 text-white border-rose-500/50 shadow-rose-950/20"
            }`}
        >
          {toast.type === "success" ? (
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
              <AlertCircle className="w-5 h-5 stroke-[2.5]" />
            </div>
          )}
          <div className="text-xs pr-2">
            <p className="font-bold text-white tracking-tight text-[13px]">{toast.title}</p>
            <p className="text-slate-300 font-medium mt-0.5">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast((prev) => ({ ...prev, show: false }))}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Top Header Rail (Hallmark Workbench Control Center) ─────────── */}
      <header className="rounded-2xl bg-white border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Title & System Scope */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-mono font-bold tracking-wider text-slate-700 border border-slate-200 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              DISCOUNT & PROMOTION CONTROL
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              จัดการส่วนลด & โปรโมชัน
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              ศูนย์ควบคุมระบบส่วนลดสำหรับเครื่องคิดเงินหน้าร้าน (POS) และโปรโมชันคูปองออนไลน์ของ Prop
            </p>
          </div>

          {/* Action Rail & Channel Switcher */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Tactile Channel Switcher */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => handleSwitchChannel("pos")}
                className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${activeChannel === "pos"
                  ? "bg-white text-slate-900 border border-slate-200/90 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
                  }`}
              >
                <Store className={`w-3.5 h-3.5 ${activeChannel === "pos" ? "text-slate-900" : "text-slate-400"}`} />
                <span>POS หน้าร้าน</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums ${activeChannel === "pos" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-600"
                  }`}>
                  {posDiscounts.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchChannel("terra")}
                className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${activeChannel === "terra"
                  ? "bg-white text-slate-900 border border-slate-200/90 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
                  }`}
              >
                <Globe className={`w-3.5 h-3.5 ${activeChannel === "terra" ? "text-emerald-700" : "text-slate-400"}`} />
                <span>PR</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums ${activeChannel === "terra" ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-600"
                  }`}>
                  {terraPromotions.length}
                </span>
              </button>
            </div>

            {/* Primary Action Button */}
            {activeChannel === "pos" ? (
              <button
                type="button"
                onClick={() => {
                  setPosSelectedProductIds([]);
                  setFormInlineError(null);
                  setIsPosCreateOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 active:scale-95 transition shadow-xs"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>สร้างส่วนลด POS</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenCreateTerraModal}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 active:scale-95 transition shadow-xs"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>สร้างโปรโมชัน Prop</span>
              </button>
            )}
          </div>
        </div>

        {/* Overview Metric Instrument Deck */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-5 border-t border-slate-100">
          <div className="rounded-xl bg-slate-50/70 p-4 border border-slate-200/80 transition-all hover:bg-slate-50">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-slate-700" />
              ส่วนลด POS (หน้าร้าน)
            </span>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                {posActiveCount}
              </span>
              <span className="text-xs font-medium text-slate-400 font-mono">
                / {posDiscounts.length} รายการ
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>เปิดใช้งาน {Math.round((posActiveCount / (posDiscounts.length || 1)) * 100)}%</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50/70 p-4 border border-slate-200/80 transition-all hover:bg-slate-50">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              โปรโมชัน Prop (ออนไลน์)
            </span>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-emerald-700 font-mono tabular-nums">
                {terraActiveCount}
              </span>
              <span className="text-xs font-medium text-slate-400 font-mono">
                / {terraPromotions.length} แคมเปญ
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>เซ็ตสินค้า & คูปอง</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50/70 p-4 border border-slate-200/80 transition-all hover:bg-slate-50">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
              <Ticket className="w-3.5 h-3.5 text-amber-600" />
              โค้ดคูปอง & สถิติใช้
            </span>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-amber-700 font-mono tabular-nums">
                {terraCouponCount}
              </span>
              <span className="text-xs font-medium text-slate-500 font-mono">
                โค้ด ({terraTotalUsed} ครั้ง)
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-800 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>โค้ดสำหรับกรอกในตะกร้า</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50/70 p-4 border border-slate-200/80 transition-all hover:bg-slate-50">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              Auto-apply อัตโนมัติ
            </span>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-blue-800 font-mono tabular-nums">
                {terraAutoCount}
              </span>
              <span className="text-xs font-medium text-slate-400 font-mono">
                รายการ
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-blue-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>ลดอัตโนมัติเมื่อครบเซ็ต</span>
            </div>
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* TAB 1: POS DISCOUNTS (PHYSICAL STORE)                                 */}
      {/* ===================================================================== */}
      {activeChannel === "pos" && (
        <section className="space-y-4">
          {/* POS Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
            <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setPosFilterStatus("all")}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-bold transition ${posFilterStatus === "all"
                  ? "bg-white text-slate-900 border border-slate-200 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                ทั้งหมด ({posDiscounts.length})
              </button>
              <button
                type="button"
                onClick={() => setPosFilterStatus("active")}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-bold transition ${posFilterStatus === "active"
                  ? "bg-white text-emerald-700 border border-emerald-200 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                เปิดใช้งาน ({posActiveCount})
              </button>
              <button
                type="button"
                onClick={() => setPosFilterStatus("inactive")}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-bold transition ${posFilterStatus === "inactive"
                  ? "bg-white text-slate-700 border border-slate-200 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                ปิดใช้งาน ({posDiscounts.length - posActiveCount})
              </button>
            </div>

            <div className="relative min-w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อส่วนลด หรือโค้ด..."
                value={posSearch}
                onChange={(e) => setPosSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-8 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900 transition"
              />
              {posSearch && (
                <button
                  type="button"
                  onClick={() => setPosSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* POS Table */}
          <div className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wide">
                    ชื่อโปรโมชั่น / โค้ด
                  </th>
                  <th className="px-6 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wide">
                    มูลค่าส่วนลด
                  </th>
                  <th className="px-6 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wide">
                    สินค้าที่ใช้ได้
                  </th>
                  <th className="px-6 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wide text-center">
                    สถานะ
                  </th>
                  <th className="px-6 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wide text-right">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredPosDiscounts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <Tag className="w-8 h-8 text-slate-300 mb-2" />
                        <p className="text-sm font-semibold text-slate-600">ยังไม่พบส่วนลด POS</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {posSearch ? "ไม่พบข้อมูลที่ตรงกับคำค้นหา" : "สร้างส่วนลดเครื่อง POS หน้าร้านรายการแรกของคุณ"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPosDiscounts.map((item) => {
                    const linkedItems = (item.discount_rules || [])
                      .map((r: any) => {
                        const prod = r.product_id ? products.find((p) => p.id === r.product_id) : null;
                        return prod ? { ...prod, ruleId: r.id } : null;
                      })
                      .filter(Boolean);

                    const targetBranchId = item.discount_rules?.[0]?.branch_id;
                    const branchName = targetBranchId
                      ? branches.find((b) => b.id === targetBranchId)?.branch_name || `สาขา #${targetBranchId}`
                      : "ทุกสาขา";

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-slate-900">{item.name}</p>
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              {branchName}
                            </span>
                          </div>
                          {item.code && (
                            <p className="text-xs text-slate-600 font-mono font-semibold mt-0.5">
                              {item.code}
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-900 px-2.5 py-1 rounded-md text-xs font-bold font-mono border border-slate-200">
                            {item.discount_type === "PERCENT" ? `${item.value}%` : `฿${Number(item.value).toLocaleString()}`}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          {linkedItems.length === 0 ? (
                            <span className="text-xs text-slate-400 font-medium">ทุกสินค้า</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 max-w-md">
                              {linkedItems.slice(0, 3).map((lp: any) => (
                                <div
                                  key={lp.ruleId}
                                  className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1"
                                >
                                  <div className="w-4 h-4 rounded overflow-hidden flex-shrink-0 bg-white">
                                    {getImageUrl(lp.image_url) ? (
                                      <img
                                        src={getImageUrl(lp.image_url)!}
                                        alt=""
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <Package className="w-3 h-3 text-slate-300" />
                                    )}
                                  </div>
                                  <span className="text-xs text-slate-700 font-medium max-w-[90px] truncate">
                                    {lp.name || lp.sku}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePosRule(lp.ruleId)}
                                    disabled={removingRuleId === lp.ruleId}
                                    className="text-slate-300 hover:text-rose-500 transition flex-shrink-0"
                                    title="ถอดสินค้านี้ออก"
                                  >
                                    {removingRuleId === lp.ruleId ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <X className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              ))}
                              {linkedItems.length > 3 && (
                                <span className="inline-flex items-center px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700">
                                  +{linkedItems.length - 3} รายการ
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleTogglePosStatus(item.id, item.active)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${item.active ? "bg-emerald-600" : "bg-slate-300"
                              }`}
                            title={item.active ? "คลิกเพื่อปิดใช้งาน" : "คลิกเพื่อเปิดใช้งาน"}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${item.active ? "translate-x-5" : "translate-x-0"
                                }`}
                            />
                          </button>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPosDiscount(item);
                                setFormInlineError(null);
                                setIsPosEditOpen(true);
                              }}
                              className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-2 rounded-lg transition"
                              title="แก้ไขส่วนลด"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmItem({ id: item.id, title: item.name, type: "pos" })}
                              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition"
                              title="ลบส่วนลด"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: TERRA PROMOTIONS (E-COMMERCE / WEB)                            */}
      {/* ===================================================================== */}
      {activeChannel === "terra" && (
        <section className="space-y-4">
          {/* Terra Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
            <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setTerraFilterTab("all")}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-bold transition ${terraFilterTab === "all" ? "bg-white text-slate-900 border border-slate-200 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                ทั้งหมด ({terraPromotions.length})
              </button>
              <button
                type="button"
                onClick={() => setTerraFilterTab("coupon")}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${terraFilterTab === "coupon" ? "bg-white text-amber-700 border border-amber-200 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                <Ticket className="h-3.5 w-3.5 text-amber-600" />
                โค้ดคูปอง ({terraCouponCount})
              </button>
              <button
                type="button"
                onClick={() => setTerraFilterTab("auto")}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${terraFilterTab === "auto" ? "bg-white text-emerald-700 border border-emerald-200 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                <Zap className="h-3.5 w-3.5 text-emerald-600" />
                Auto-apply ({terraAutoCount})
              </button>
              <button
                type="button"
                onClick={() => setTerraFilterTab("active")}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-bold transition ${terraFilterTab === "active" ? "bg-white text-blue-700 border border-blue-200 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                เปิดใช้งาน ({terraActiveCount})
              </button>
              <button
                type="button"
                onClick={() => setTerraFilterTab("inactive")}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-bold transition ${terraFilterTab === "inactive" ? "bg-white text-slate-700 border border-slate-200 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                ปิดใช้งาน ({terraPromotions.length - terraActiveCount})
              </button>
            </div>

            <div className="relative min-w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อโปรโมชัน, โค้ด, หรือเซ็ตสินค้า..."
                value={terraSearch}
                onChange={(e) => setTerraSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-8 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900 transition"
              />
              {terraSearch && (
                <button
                  type="button"
                  onClick={() => setTerraSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Terra Card Grid - Hallmark Studio Passcards */}
          {filteredTerraPromotions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 mb-3 border border-slate-200">
                <Ticket className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">ยังไม่พบโปรโมชัน Terra</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {terraSearch
                  ? "ไม่พบโปรโมชันที่ตรงกับคำค้นหา"
                  : "สร้างโปรโมชันหรือคูปองส่วนลดสำหรับเซ็ตสินค้า Collection แรกของคุณ"}
              </p>
              {!terraSearch && (
                <button
                  type="button"
                  onClick={handleOpenCreateTerraModal}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  สร้างโปรโมชันใหม่
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTerraPromotions.map((promo) => {
                const isAuto = promo.trigger_type === "auto";
                const isPercent = promo.discount_type === "percentage";
                const isExpired =
                  promo.end_date && new Date(promo.end_date).toISOString() < new Date().toISOString();

                return (
                  <div
                    key={promo.id}
                    className={`group relative flex flex-col justify-between rounded-2xl border bg-white overflow-hidden transition-all duration-200 shadow-xs hover:shadow-md ${!promo.is_active
                      ? "opacity-60 border-slate-200 bg-slate-50/70"
                      : !isAuto
                        ? "border-slate-200/90 hover:border-amber-500"
                        : "border-slate-200/90 hover:border-emerald-500"
                      }`}
                  >
                    {/* Top Segment: Set Image Hero with Badges */}
                    <div className="p-4 pb-0">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {!isAuto ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-900 border border-amber-200">
                              <Ticket className="h-3 w-3 text-amber-600" />
                              คูปองกรอกโค้ด
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                              <Zap className="h-3 w-3 text-emerald-600" />
                              Auto-apply เซ็ต
                            </span>
                          )}

                          {isExpired && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                              หมดอายุ
                            </span>
                          )}
                        </div>

                        {/* Status Toggle Switch */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-slate-400">
                            {promo.is_active ? "เปิด" : "ปิด"}
                          </span>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleToggleTerraStatus(promo.id, promo.is_active)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${promo.is_active ? "bg-emerald-600" : "bg-slate-300"
                              }`}
                            title={promo.is_active ? "คลิกเพื่อปิดใช้งาน" : "คลิกเพื่อเปิดใช้งาน"}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${promo.is_active ? "translate-x-4" : "translate-x-0"
                                }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Main Split Info: Photo & Headline */}
                      <div className="flex items-start gap-3.5 bg-slate-50/90 rounded-xl p-3 border border-slate-200/80">
                        <div className="relative h-16 w-16 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {promo.collection_image ? (
                            <img
                              src={getImageUrl(promo.collection_image)!}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : isAuto ? (
                            <Layers className="h-6 w-6 text-slate-300" />
                          ) : (
                            <Store className="h-6 w-6 text-amber-500/60" />
                          )}
                          <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 backdrop-blur-xs text-[9px] font-bold text-white text-center py-0.5">
                            {isAuto ? `${promo.collection_item_count || "?"} ชิ้น` : "ทั้งร้าน"}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                            {promo.collection_name || (isAuto ? `เซ็ต #${promo.collection_group_id}` : "ทั้งร้านค้า (Global)")}
                          </p>
                          <h3 className="text-sm font-bold text-slate-900 leading-snug mt-0.5 truncate">
                            {promo.title}
                          </h3>
                          <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-xl font-bold font-mono text-slate-900 tracking-tight">
                              {isPercent ? `${promo.discount_value}% OFF` : `฿${Number(promo.discount_value).toLocaleString()} OFF`}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium truncate">
                              {isAuto
                                ? `ครบ ${promo.min_sets || 1} เซ็ต`
                                : promo.min_spend
                                  ? `(ขั้นต่ำ ฿${Number(promo.min_spend).toLocaleString()})`
                                  : "(ไม่มีขั้นต่ำ)"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Description if any */}
                      {promo.description && (
                        <p className="mt-2.5 text-xs text-slate-500 line-clamp-1 px-1">
                          {promo.description}
                        </p>
                      )}

                      {/* Coupon Voucher Strip (Tactile Ticket Box) */}
                      {!isAuto && promo.coupon_code && (
                        <div className="mt-3 flex items-center justify-between rounded-xl bg-amber-50/70 border border-dashed border-amber-300 p-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <Ticket className="h-4 w-4 text-amber-700 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-[10px] text-amber-800 font-semibold block uppercase">รหัสคูปอง:</span>
                              <span className="font-mono text-xs font-bold text-slate-900 tracking-wider uppercase truncate block">
                                {promo.coupon_code}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyCouponCode(promo.coupon_code!)}
                            className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-slate-700 border border-amber-200 hover:bg-amber-100/60 active:bg-amber-200 transition shrink-0 shadow-2xs"
                          >
                            {copiedCode === promo.coupon_code ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-600" />
                                <span className="text-emerald-700">คัดลอกแล้ว</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 text-slate-500" />
                                <span>คัดลอก</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Bottom Metadata & Actions */}
                    <div className="p-4 pt-3 mt-2">
                      <div className="space-y-1 text-[11px] text-slate-500 font-medium border-t border-slate-100 pt-2.5">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-slate-400">
                            <Clock className="h-3 w-3" /> ระยะเวลา:
                          </span>
                          <span className="text-slate-700 font-semibold">
                            {promo.start_date || promo.end_date
                              ? `${promo.start_date ? new Date(promo.start_date).toLocaleDateString("th-TH") : "ทันที"} – ${promo.end_date ? new Date(promo.end_date).toLocaleDateString("th-TH") : "ไม่จำกัด"
                              }`
                              : "ไม่จำกัดระยะเวลา"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> สถิติใช้:
                          </span>
                          <span className="font-mono font-bold text-slate-800">
                            {promo.used_count} {promo.usage_limit ? `/ ${promo.usage_limit} สิทธิ์` : "ครั้ง"}
                          </span>
                        </div>
                      </div>

                      {/* Action Rail */}
                      <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-slate-100 pt-2.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditTerraModal(promo)}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition active:scale-95"
                        >
                          <Edit2 className="h-3 w-3" />
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmItem({ id: promo.id, title: promo.title, type: "terra" })}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition active:scale-95"
                        >
                          <Trash2 className="h-3 w-3" />
                          ลบ
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CREATE POS DISCOUNT                                            */}
      {/* ===================================================================== */}
      {isPosCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">สร้างส่วนลด POS หน้าร้าน</h3>
                  <p className="text-xs text-slate-500">สำหรับระบบคิดเงินและแคชเชียร์หน้าร้าน</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPosCreateOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formInlineError && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formInlineError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreatePosDiscount(new FormData(e.currentTarget));
              }}
              className="flex flex-1 min-h-0"
            >
              {/* Left Column: Settings */}
              <div className="w-80 flex-shrink-0 border-r border-slate-100 flex flex-col">
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ชื่อโปรโมชั่น <span className="text-rose-500">*</span>
                    </label>
                    <input
                      name="name"
                      required
                      placeholder="เช่น ลดราคาพิเศษ 10%"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      รหัสส่วนลด (ถ้ามี)
                    </label>
                    <input
                      name="code"
                      placeholder="เช่น STORE10"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono uppercase outline-none focus:border-slate-900 focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ประเภทส่วนลด</label>
                    <select
                      name="discount_type"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-slate-900 focus:bg-white transition"
                    >
                      <option value="PERCENT">เปอร์เซ็นต์ (%)</option>
                      <option value="FIXED">จำนวนเงิน (฿)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      มูลค่า <span className="text-rose-500">*</span>
                    </label>
                    <input
                      name="value"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="เช่น 10 หรือ 500"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-slate-900 focus:bg-white transition"
                    />
                  </div>

                  {branches.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ใช้กับสาขา</label>
                      <select
                        name="branch_id"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-slate-900 focus:bg-white transition"
                      >
                        <option value="">ทุกสาขา</option>
                        {branches.map((b: any) => (
                          <option key={b.id} value={b.id}>
                            {b.branch_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex gap-2 flex-shrink-0 bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => setIsPosCreateOpen(false)}
                    className="flex-1 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                  >
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>บันทึก</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Product Picker */}
              <div className="flex-1 flex flex-col min-h-0 px-6 py-5">
                <p className="text-xs font-bold text-slate-700 mb-3 flex-shrink-0">
                  เลือกสินค้าที่ร่วมรายการ (หากไม่เลือก = ใช้ได้กับทุกสินค้า)
                </p>
                <div className="flex-1 min-h-0">
                  <ProductPicker
                    products={products}
                    selectedProductIds={posSelectedProductIds}
                    onSelectionChange={setPosSelectedProductIds}
                  />
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: EDIT POS DISCOUNT                                              */}
      {/* ===================================================================== */}
      {isPosEditOpen && editingPosDiscount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">แก้ไขส่วนลด POS</h3>
                  <p className="text-xs text-slate-500">{editingPosDiscount.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPosEditOpen(false);
                  setEditingPosDiscount(null);
                }}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formInlineError && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formInlineError}</span>
              </div>
            )}

            <div className="overflow-y-auto p-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await handleEditPosDiscount(new FormData(e.currentTarget));
                }}
                className="space-y-4"
              >
                <input type="hidden" name="discount_id" value={editingPosDiscount.id} />

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อโปรโมชั่น</label>
                  <input
                    name="name"
                    defaultValue={editingPosDiscount.name}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs outline-none focus:border-slate-900 focus:bg-white transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ประเภท</label>
                    <select
                      name="discount_type"
                      defaultValue={editingPosDiscount.discount_type}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-slate-900 transition"
                    >
                      <option value="PERCENT">เปอร์เซ็นต์ (%)</option>
                      <option value="FIXED">จำนวนเงิน (฿)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">มูลค่า</label>
                    <input
                      name="value"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={editingPosDiscount.value}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-slate-900 transition"
                    />
                  </div>
                </div>

                {branches.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ใช้กับสาขา</label>
                    <select
                      name="branch_id"
                      defaultValue={editingPosDiscount.discount_rules?.[0]?.branch_id || ""}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-slate-900 transition"
                    >
                      <option value="">ทุกสาขา</option>
                      {branches.map((b: any) => (
                        <option key={b.id} value={b.id}>
                          {b.branch_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Linked products review & remove */}
                {(() => {
                  const linkedItems = (editingPosDiscount.discount_rules || [])
                    .map((r: any) => {
                      const prod = r.product_id ? products.find((p) => p.id === r.product_id) : null;
                      return prod ? { ...prod, ruleId: r.id } : null;
                    })
                    .filter(Boolean);

                  if (linkedItems.length === 0) return null;

                  return (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <label className="block text-xs font-bold text-slate-700">
                        สินค้าที่ผูกอยู่ ({linkedItems.length} รายการ)
                      </label>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 max-h-40 overflow-y-auto space-y-1.5">
                        {linkedItems.map((lp: any) => (
                          <div
                            key={lp.ruleId}
                            className="flex items-center gap-2.5 bg-white rounded-lg px-2.5 py-1.5 border border-slate-200"
                          >
                            <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0 bg-slate-100">
                              {getImageUrl(lp.image_url) ? (
                                <img
                                  src={getImageUrl(lp.image_url)!}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="w-3 h-3 text-slate-300 mx-auto" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-800 truncate">
                                {lp.name || "—"}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">{lp.sku}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemovePosRule(lp.ruleId)}
                              disabled={removingRuleId === lp.ruleId}
                              className="text-slate-300 hover:text-rose-500 p-1 transition"
                              title="ถอดสินค้าออก"
                            >
                              {removingRuleId === lp.ruleId ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <X className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPosEditOpen(false);
                      setEditingPosDiscount(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-2 text-xs bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>บันทึกการแก้ไข</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CREATE / EDIT TERRA PROMOTION (REDESIGNED WORKBENCH FORM)       */}
      {/* ===================================================================== */}
      {isTerraModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {editingTerraPromotion ? "แก้ไขโปรโมชัน Collection (Terra Home)" : "สร้างโปรโมชัน Collection ใหม่ (Terra Home)"}
                  </h2>
                  <p className="text-xs text-slate-500">ระบบโปรโมชันซื้อครบเซ็ตและโค้ดคูปองสำหรับหน้าเว็บออนไลน์</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTerraModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Inline Error Alert Banner */}
            {formInlineError && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formInlineError}</span>
              </div>
            )}

            {/* Modal Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* ── Section 1: เลือกประเภทโปรโมชัน (Auto Set vs Global Coupon) ───────── */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] text-white">1</span>
                  <span>เลือกประเภทโปรโมชัน</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option A: Auto Set */}
                  <button
                    type="button"
                    onClick={() => {
                      setTerraFormPromoScope("set");
                      setTerraFormDiscountType("percentage");
                      if (formInlineError) setFormInlineError(null);
                    }}
                    className={`flex flex-col items-start gap-1.5 rounded-xl p-3.5 border text-left transition ${terraFormPromoScope === "set"
                      ? "bg-emerald-50/80 border-emerald-600 ring-2 ring-emerald-600 text-emerald-950 font-bold shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
                        <Zap className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold">📦 โปรโมชันเซ็ต (ลดอัตโนมัติ)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-normal leading-relaxed">
                      ลดราคาเป็นเปอร์เซ็นต์ (%) ทันทีเมื่อลูกค้าหยิบสินค้าครบทุกชิ้นในเซ็ต (ไม่ต้องกรอกโค้ด)
                    </p>
                  </button>

                  {/* Option B: Global Coupon */}
                  <button
                    type="button"
                    onClick={() => {
                      setTerraFormPromoScope("global");
                      if (formInlineError) setFormInlineError(null);
                    }}
                    className={`flex flex-col items-start gap-1.5 rounded-xl p-3.5 border text-left transition ${terraFormPromoScope === "global"
                      ? "bg-amber-50/80 border-amber-600 ring-2 ring-amber-600 text-amber-950 font-bold shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-600 text-white">
                        <Ticket className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold">🎟️ คูปองส่วนลดทั้งร้าน (Global)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-normal leading-relaxed">
                      ลดราคาทั้งตะกร้าเมื่อลูกค้ากรอกโค้ดคูปอง (กำหนดเป็น % หรือ บาท พร้อมยอดซื้อขั้นต่ำ)
                    </p>
                  </button>
                </div>
              </div>

              {/* ── Section 2: ข้อมูลพื้นฐาน ──────────────────────────────── */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] text-white">2</span>
                  <span>ชื่อและคำอธิบาย</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อโปรโมชัน <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder={terraFormPromoScope === "set" ? "เช่น ซื้อครบเซ็ตแจกันดินเผา ลดทันที 15%" : "เช่น ส่วนลดต้อนรับสมาชิกใหม่ ลด 100 บาท"}
                    value={terraFormTitle}
                    onChange={(e) => {
                      setTerraFormTitle(e.target.value);
                      if (formInlineError) setFormInlineError(null);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">คำอธิบายเพิ่มเติม (ถ้ามี)</label>
                  <input
                    type="text"
                    placeholder="เช่น โปรโมชันต้อนรับฤดูร้อน เฉพาะการสั่งซื้อออนไลน์"
                    value={terraFormDescription}
                    onChange={(e) => setTerraFormDescription(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-900 outline-none focus:border-slate-900 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* ── Section 3 (FOR SET): เลือกเซ็ตสินค้า (Sub-Collection Picker) ─────── */}
              {terraFormPromoScope === "set" && (
                <div className="space-y-3 pt-4 border-t border-slate-100 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] text-white">3</span>
                      <span>เลือกเซ็ตสินค้า (Sub-Collection) ที่ต้องซื้อครบ <span className="text-rose-500">*</span></span>
                    </div>
                    {selectedCollectionItem && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        เลือกแล้ว: {selectedCollectionItem.itemCount} ชิ้นในเซ็ต
                      </span>
                    )}
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="ค้นหาชื่อหมวด, เซ็ตสินค้า หรือ SKU..."
                        value={terraCollectionSearch}
                        onChange={(e) => setTerraCollectionSearch(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-900 focus:bg-white transition"
                      />
                    </div>

                    {uniqueParentCategories.length > 1 && (
                      <select
                        value={terraCategoryFilter}
                        onChange={(e) => setTerraCategoryFilter(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 font-medium outline-none focus:border-slate-900 focus:bg-white"
                      >
                        <option value="all">ทุกหมวดหมู่ ({uniqueParentCategories.length})</option>
                        {uniqueParentCategories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Visual Sub-Collection Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                    {filteredCollectionGroups.length === 0 ? (
                      <div className="col-span-2 py-8 text-center text-slate-400 text-xs font-medium">
                        ไม่พบเซ็ตสินค้าที่ตรงกับคำค้นหา
                      </div>
                    ) : (
                      filteredCollectionGroups.map((col) => {
                        const isSelected = terraFormCollectionId === col.id;
                        return (
                          <button
                            key={col.id}
                            type="button"
                            onClick={() => {
                              setTerraFormCollectionId(col.id);
                              if (formInlineError) setFormInlineError(null);
                            }}
                            className={`flex items-start gap-3 rounded-xl p-2.5 text-left transition-all border ${isSelected
                              ? "bg-white border-slate-900 ring-2 ring-slate-900 shadow-xs"
                              : "bg-white border-slate-200 hover:border-slate-300"
                              }`}
                          >
                            <div className="relative h-14 w-14 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center border border-slate-200">
                              {col.imageUrl ? (
                                <img src={getImageUrl(col.imageUrl)!} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Layers className="h-5 w-5 text-slate-400" />
                              )}
                              <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-[8px] font-bold text-white text-center py-0.5">
                                {col.itemCount} ชิ้น
                              </span>
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 leading-snug line-clamp-1">
                                {col.name}
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                                SKU: {col.sampleSkus.slice(0, 3).join(", ")}
                              </p>
                              <span className="inline-block text-[10px] font-semibold text-emerald-700 mt-1">
                                ต้องซื้อครบทั้ง {col.itemCount} ชิ้น
                              </span>
                            </div>

                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0">
                                <Check className="h-3 w-3 stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* ── Section 4: เงื่อนไข & มูลค่าส่วนลด ───────────────────────── */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] text-white">
                    {terraFormPromoScope === "set" ? "4" : "3"}
                  </span>
                  <span>เงื่อนไข & มูลค่าส่วนลด</span>
                </div>

                {/* Coupon Code Input if Global Coupon */}
                {terraFormPromoScope === "global" && (
                  <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1.5 animate-in fade-in duration-150">
                    <label className="block text-xs font-bold text-amber-900">
                      รหัสคูปอง (Coupon Code) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น SUMMERVASE15 หรือ TERRA100"
                      value={terraFormCouponCode}
                      onChange={(e) => {
                        setTerraFormCouponCode(e.target.value.toUpperCase());
                        if (formInlineError) setFormInlineError(null);
                      }}
                      className="w-full rounded-lg border border-amber-300 bg-white px-3.5 py-2 text-xs font-mono font-bold uppercase text-slate-900 outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 transition"
                    />
                    <p className="text-[10px] text-amber-700 font-medium">ตัวพิมพ์ใหญ่และตัวเลข (ระบบแปลงให้อัตโนมัติ)</p>
                  </div>
                )}

                {/* Discount Type & Value Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {terraFormPromoScope === "global" ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ประเภทส่วนลด</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setTerraFormDiscountType("percentage")}
                          className={`flex items-center justify-center gap-1.5 rounded-xl p-2.5 text-xs font-bold border transition ${terraFormDiscountType === "percentage"
                            ? "bg-slate-900 border-slate-900 text-white shadow-2xs"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                            }`}
                        >
                          <Percent className="h-3.5 w-3.5" />
                          เปอร์เซ็นต์ (%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setTerraFormDiscountType("fixed_amount")}
                          className={`flex items-center justify-center gap-1.5 rounded-xl p-2.5 text-xs font-bold border transition ${terraFormDiscountType === "fixed_amount"
                            ? "bg-slate-900 border-slate-900 text-white shadow-2xs"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                            }`}
                        >
                          <Coins className="h-3.5 w-3.5" />
                          บาท (฿)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ประเภทส่วนลด</label>
                      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-900">
                        <Percent className="h-4 w-4 text-emerald-600" />
                        <span>ลดเป็นเปอร์เซ็นต์ (%) ของราคารวมเซ็ต</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      มูลค่าส่วนลด ({terraFormPromoScope === "set" || terraFormDiscountType === "percentage" ? "%" : "บาท"}) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={terraFormDiscountValue}
                      onChange={(e) => setTerraFormDiscountValue(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 outline-none focus:border-slate-900 focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>

              {/* ── Section 5: เงื่อนไขเพิ่มเติม (Optional Details) ────────── */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] text-white">
                    {terraFormPromoScope === "set" ? "5" : "4"}
                  </span>
                  <span>เงื่อนไขเพิ่มเติมและระยะเวลา (ไม่บังคับ)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                  {terraFormPromoScope === "global" && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        ยอดซื้อขั้นต่ำ (บาท)
                      </label>
                      <input
                        type="number"
                        placeholder="เช่น 500 (เว้นว่าง = ไม่มีขั้นต่ำ)"
                        value={terraFormMinSpend}
                        onChange={(e) => setTerraFormMinSpend(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-slate-900"
                      />
                    </div>
                  )}

                  {terraFormDiscountType === "percentage" && (
                    <div className={terraFormPromoScope === "global" ? "" : "sm:col-span-2"}>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        เพดานส่วนลดสูงสุด (บาท)
                      </label>
                      <input
                        type="number"
                        placeholder="เช่น 1000 (ลดสูงสุดไม่เกิน 1,000 บาท)"
                        value={terraFormMaxDiscount}
                        onChange={(e) => setTerraFormMaxDiscount(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-slate-900"
                      />
                    </div>
                  )}

                  {terraFormPromoScope === "set" && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        จำนวนเซ็ตขั้นต่ำ (เซ็ต)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={terraFormMinSets}
                        onChange={(e) => setTerraFormMinSets(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-slate-900"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">วันที่เริ่มต้น</label>
                    <input
                      type="datetime-local"
                      value={terraFormStartDate}
                      onChange={(e) => setTerraFormStartDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">วันที่สิ้นสุด</label>
                    <input
                      type="datetime-local"
                      value={terraFormEndDate}
                      onChange={(e) => setTerraFormEndDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-slate-900"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">จำกัดสิทธิ์ทั้งหมด (ครั้ง)</label>
                    <input
                      type="number"
                      placeholder="เช่น 100 (เว้นว่าง = ไม่จำกัดจำนวนสิทธิ์)"
                      value={terraFormUsageLimit}
                      onChange={(e) => setTerraFormUsageLimit(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/60 shrink-0">
              <button
                type="button"
                onClick={() => setIsTerraModalOpen(false)}
                className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleSaveTerraPromotion}
                className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition flex items-center gap-1.5 disabled:opacity-50 shadow-xs active:scale-95"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{editingTerraPromotion ? "บันทึกการแก้ไข" : "สร้างโปรโมชัน"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* CUSTOM CONFIRMATION MODAL (REPLACES BROWSER ALERT / CONFIRM)          */}
      {/* ===================================================================== */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-[99990] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 border border-rose-200">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  ยืนยันการลบ{deleteConfirmItem.type === "pos" ? "ส่วนลด POS" : "โปรโมชัน Terra"}
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  คุณต้องการลบ <strong className="text-slate-900">&quot;{deleteConfirmItem.title}&quot;</strong> ออกจากระบบใช่หรือไม่? การกระทำนี้ไม่สามารถเรียกคืนได้
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                disabled={isPending}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleExecuteDelete}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 active:bg-rose-800 transition shadow-xs disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>ลบข้อมูลถาวร</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
