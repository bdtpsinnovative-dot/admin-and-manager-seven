"use client";

/* Hallmark · macrostructure: Workbench · tone: modern-minimal · genre: modern-minimal
 * pre-emit critique: P5 H5 E5 S5 R5 V5 · theme: Modern Minimal Studio Control Center
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: pass (46–50) · zero gradients · crisp solid surfaces
 */

import { useState, useTransition, useMemo, useEffect } from "react";
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
  User,
  Users,
  Sparkles,
  Share2,
  FileText,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  Ruler,
  Palette,
} from "lucide-react";

import {
  PRODUCT_FILTER_ITEMS,
  COLOR_PRESENTATION,
  MATERIAL_PRESENTATION,
  productColorValues,
  productMaterialValues,
  matchesStorefrontCategory,
  productMatchesDimensions,
} from "@/lib/propFilterModel";

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
  createBatchPartnerCoupons,
  updatePartnerCoupon,
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

// ── Category Hierarchy Definitions (from furniture & terrahome.studio) ──
const FURNITURE_CATEGORY_GROUPS = [
  {
    label: "Chair",
    thaiLabel: "เก้าอี้",
    items: [
      { name: "Arm chair", thaiLabel: "เก้าอี้อาร์มแชร์" },
      { name: "Bar Stool", thaiLabel: "เก้าอี้บาร์" },
      { name: "Dining Chair", thaiLabel: "เก้าอี้ทานข้าว" },
      { name: "Lounge Chair", thaiLabel: "เก้าอี้เลานจ์" },
      { name: "Side Chair", thaiLabel: "เก้าอี้เสริม" },
    ],
  },
  {
    label: "Modular & Sofa",
    thaiLabel: "โซฟาและโมดูลาร์",
    items: [
      { name: "Modular Sofa", thaiLabel: "โมดูลาร์โซฟา" },
      { name: "Sofa", thaiLabel: "โซฟา" },
    ],
  },
  {
    label: "Bedroom Collection",
    thaiLabel: "ชุดห้องนอน",
    items: [
      { name: "Bed collection", thaiLabel: "เตียงนอน" },
    ],
  },
  {
    label: "Table",
    thaiLabel: "โต๊ะ",
    items: [
      { name: "Dining Table", thaiLabel: "โต๊ะทานข้าว" },
      { name: "Coffee Table", thaiLabel: "โต๊ะกลาง" },
      { name: "Night Table", thaiLabel: "โต๊ะข้างเตียง" },
      { name: "Side Table", thaiLabel: "โต๊ะข้าง" },
      { name: "Working Desk", thaiLabel: "โต๊ะทำงาน" },
    ],
  },
  {
    label: "Leg",
    thaiLabel: "ขาโต๊ะเฟอร์นิเจอร์",
    items: [
      { name: "Leg Dining Table", thaiLabel: "ขาโต๊ะทานข้าว" },
      { name: "Leg Coffee Table", thaiLabel: "ขาโต๊ะกลาง" },
      { name: "Leg side Table", thaiLabel: "ขาโต๊ะข้าง" },
    ],
  },
  {
    label: "Stool & Ottoman",
    thaiLabel: "สตูลและออตโตมัน",
    items: [
      { name: "Stool & Ottoman", thaiLabel: "สตูล & ออตโตมัน" },
    ],
  },
  {
    label: "Shelf",
    thaiLabel: "ชั้นวางของ",
    items: [
      { name: "Shelf", thaiLabel: "ชั้นวางของ" },
    ],
  },
  {
    label: "Cabinet & More",
    thaiLabel: "ตู้และไซด์บอร์ด",
    items: [
      { name: "Cabinet & More", thaiLabel: "ตู้เก็บของ" },
      { name: "Tall Cabinet", thaiLabel: "ตู้ทรงสูง" },
    ],
  },
  {
    label: "Dressing & Working",
    thaiLabel: "โต๊ะเครื่องแป้งและทำงาน",
    items: [
      { name: "Dressing & Working", thaiLabel: "แต่งหน้า / ทำงาน" },
    ],
  },
  {
    label: "Accessories",
    thaiLabel: "ของตกแต่งเฟอร์นิเจอร์",
    items: [
      { name: "Accessories", thaiLabel: "อุปกรณ์ตกแต่ง" },
    ],
  },
];

const SLAB_CATEGORY_GROUPS = [
  { name: "Wood slabs", thaiLabel: "แผ่นไม้จามจุรี / ไม้แผ่นใหญ่" },
  { name: "Leg", thaiLabel: "ขาโต๊ะแผ่นไม้" },
];

const ROUGH_WOOD_GROUPS = [
  { name: "Rough-Board", thaiLabel: "ไม้กระดานดิบ" },
];

function checkProductCategoryMatch(p: any, mainCat: string, subCat: string): boolean {
  if (mainCat !== "ALL" && p.category_id !== mainCat) {
    return false;
  }
  if (!subCat) return true;

  const target = subCat.toLowerCase().trim();
  const prodSup = String(p.product_sup || p.sub_category || "").toLowerCase().trim();
  const specType = String(p.specs?.spec_type || p.specs?.type || "").toLowerCase().trim();

  // 1. Furniture category matching
  if (mainCat === "furniture" || p.category_id === "furniture") {
    const group = FURNITURE_CATEGORY_GROUPS.find((g) => g.label.toLowerCase() === target);
    if (group) {
      const memberNames = group.items.map((i) => i.name.toLowerCase());
      return (
        memberNames.some((m) => prodSup.includes(m) || specType.includes(m)) ||
        prodSup.includes(target) ||
        specType.includes(target)
      );
    }
    return prodSup.includes(target) || specType.includes(target);
  }

  // 2. Prop category matching
  if (mainCat === "prop" || p.category_id === "prop") {
    return matchesStorefrontCategory(p, subCat) || prodSup.includes(target) || specType.includes(target);
  }

  // 3. SLABS or rough_wood
  return prodSup.includes(target) || specType.includes(target);
}

// ── POS Product Multi-Picker Component (Middle Spec Filter Panel + Right Product List) ──
function ProductPicker({
  products,
  selectedProductIds,
  onSelectionChange,
  selectedBranchId,
  existingDiscounts,
}: {
  products: any[];
  selectedProductIds: string[];
  onSelectionChange: (ids: string[]) => void;
  selectedBranchId?: string;
  existingDiscounts?: any[];
}) {
  const [query, setQuery] = useState("");
  const [selectedMainCat, setSelectedMainCat] = useState<string>("ALL");
  const [selectedSubCats, setSelectedSubCats] = useState<string[]>([]);
  const [stockFilter, setStockFilter] = useState<"ALL" | "IN_STOCK" | "OUT_OF_STOCK" | "NEGATIVE">("ALL");
  const [promoStatusFilter, setPromoStatusFilter] = useState<"ALL" | "NO_PROMO" | "HAS_PROMO">("ALL");
  const [priceFilter, setPriceFilter] = useState<
    "ALL" | "HAS_PRICE" | "UNDER_1K" | "1K_3K" | "3K_10K" | "OVER_10K"
  >("ALL");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [showSpecPanel, setShowSpecPanel] = useState<boolean>(true);
  const [sortBy, setSortBy] = useState<
    "default" | "stock_desc" | "stock_asc" | "price_desc" | "price_asc" | "name_asc" | "sku_asc"
  >("default");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [supplierSearch, setSupplierSearch] = useState<string>("");
  const [viewMode, setViewMode] = useState<"all" | "selected">("all");
  const [displayLimit, setDisplayLimit] = useState(100);

  // Accordion state for main spec filter panel sections (ปิดไว้เริ่มต้น ค่อยเปิดเมื่อต้องการ)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    cat: false,
    suppliers: false,
    styling: false,
    commerce: false,
  });
  const [subCatSearch, setSubCatSearch] = useState<string>("");

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const allExpanded = Boolean(
    openSections.cat && openSections.suppliers && openSections.styling && openSections.commerce
  );

  const toggleAllSections = (expand: boolean) => {
    setOpenSections({
      cat: expand,
      suppliers: expand,
      styling: expand,
      commerce: expand,
    });
  };

  // สลับการเลือกซัพพลายเออร์หลายเจ้าพร้อมกัน
  const toggleSupplier = (val: string) => {
    setSelectedSuppliers((prev) =>
      prev.includes(val) ? prev.filter((item) => item !== val) : [...prev, val]
    );
  };

  // สลับการเลือกหมวดย่อยหลายอันพร้อมกัน
  const toggleSubCat = (val: string) => {
    setSelectedSubCats((prev) =>
      prev.includes(val) ? prev.filter((item) => item !== val) : [...prev, val]
    );
  };

  // สลับการเลือกสีหลายสีพร้อมกัน
  const toggleColor = (val: string) => {
    const norm = val.toLowerCase();
    setSelectedColors((prev) =>
      prev.includes(norm) ? prev.filter((item) => item !== norm) : [...prev, norm]
    );
  };

  // สลับการเลือกวัสดุหลายวัสดุพร้อมกัน
  const toggleMaterial = (val: string) => {
    const norm = val.toLowerCase();
    setSelectedMaterials((prev) =>
      prev.includes(norm) ? prev.filter((item) => item !== norm) : [...prev, norm]
    );
  };

  // ตรวจสอบสินค้าที่มีโปรโมชันใช้งานอยู่แล้วในระบบ
  const productPromoMap = useMemo(() => {
    const map = new Map<string, Array<{ id: number | string; name: string; discount_type: string; value: number }>>();
    (existingDiscounts || []).forEach((d: any) => {
      if (d.active && Array.isArray(d.discount_rules)) {
        d.discount_rules.forEach((r: any) => {
          if (r.product_id) {
            const key = String(r.product_id);
            const list = map.get(key) || [];
            list.push({
              id: d.id,
              name: d.name,
              discount_type: d.discount_type,
              value: d.value,
            });
            map.set(key, list);
          }
        });
      }
    });
    return map;
  }, [existingDiscounts]);

  // Accordion state for category hierarchy
  const [openCatGroups, setOpenCatGroups] = useState<Record<string, boolean>>({
    Chair: true,
    Table: true,
    "VASE & VESSELS": true,
    FIGURE: true,
  });

  const toggleAccordion = (key: string) => {
    setOpenCatGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Reset lazy load limit when any filter or sort changes
  useEffect(() => {
    setDisplayLimit(100);
  }, [
    query,
    selectedMainCat,
    selectedSubCats,
    selectedSuppliers,
    stockFilter,
    promoStatusFilter,
    priceFilter,
    minPrice,
    maxPrice,
    sortBy,
    selectedColors,
    selectedMaterials,
    viewMode,
    selectedBranchId,
  ]);

  const MAIN_CATEGORIES = [
    { key: "ALL", label: "ทั้งหมด" },
    { key: "furniture", label: "เฟอร์นิเจอร์" },
    { key: "prop", label: "พร็อพ & ตกแต่ง" },
    { key: "SLABS", label: "แผ่นไม้" },
    { key: "rough_wood", label: "ไม้ดิบ" },
  ];

  // สถิติราคาสินค้าสำหรับ Quick Chips และ Filter Panel
  const priceStats = useMemo(() => {
    let hasPrice = 0;
    let under1k = 0;
    let between1k3k = 0;
    let between3k10k = 0;
    let over10k = 0;

    products.forEach((p) => {
      const price = Number(p.price) || 0;
      if (price > 0) {
        hasPrice++;
        if (price < 1000) under1k++;
        else if (price <= 3000) between1k3k++;
        else if (price <= 10000) between3k10k++;
        else over10k++;
      }
    });

    return { hasPrice, under1k, between1k3k, between3k10k, over10k };
  }, [products]);

  // คำนวณจำนวนสินค้าในแต่ละกลุ่มหมวดหมู่เฟอร์นิเจอร์
  const furnitureCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const furnProds = products.filter((p) => p.category_id === "furniture");
    FURNITURE_CATEGORY_GROUPS.forEach((g) => {
      counts[g.label] = furnProds.filter((p) => checkProductCategoryMatch(p, "furniture", g.label)).length;
      g.items.forEach((item) => {
        counts[item.name] = furnProds.filter((p) => checkProductCategoryMatch(p, "furniture", item.name)).length;
      });
    });
    return counts;
  }, [products]);

  // คำนวณจำนวนสินค้าในแต่ละกลุ่มหมวดหมู่พร็อพ
  const propCategoryItems = useMemo(() => {
    return PRODUCT_FILTER_ITEMS.filter((item) => item.label !== "ALL" && !item.isSpecial);
  }, []);

  const propCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const propProds = products.filter((p) => p.category_id === "prop");
    propCategoryItems.forEach((item) => {
      counts[item.label] = propProds.filter((p) => checkProductCategoryMatch(p, "prop", item.label)).length;
      item.items?.forEach((child) => {
        counts[child.fullValue] = propProds.filter((p) => checkProductCategoryMatch(p, "prop", child.fullValue)).length;
      });
    });
    return counts;
  }, [products, propCategoryItems]);

  // คำนวณจำนวนสินค้าในแต่ละกลุ่มแผ่นไม้
  const slabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const slabProds = products.filter((p) => p.category_id === "SLABS");
    SLAB_CATEGORY_GROUPS.forEach((g) => {
      counts[g.name] = slabProds.filter((p) => checkProductCategoryMatch(p, "SLABS", g.name)).length;
    });
    return counts;
  }, [products]);

  // หมวดย่อยทั่วไปเมื่อเลือกหมวดหมู่ ALL
  const availableSubCats = useMemo(() => {
    let source = products;
    if (selectedMainCat !== "ALL") {
      source = source.filter((p) => p.category_id === selectedMainCat);
    }
    const set = new Set<string>();
    source.forEach((p) => {
      if (p.sub_category && typeof p.sub_category === "string" && p.sub_category.trim()) {
        const val = p.sub_category.trim();
        if (!val.includes("à") && !val.includes("Ã")) {
          set.add(val);
        }
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products, selectedMainCat]);

  // จำนวนสินค้าในแต่ละหมวดย่อยทั่วไป
  const subCatCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      if (p.sub_category) {
        map[p.sub_category] = (map[p.sub_category] || 0) + 1;
      }
    });
    return map;
  }, [products]);

  // ตัวกรองหมวดย่อยผ่านช่องค้นหา mini search
  const filteredPropGroups = useMemo(() => {
    if (!subCatSearch.trim()) return propCategoryItems;
    const q = subCatSearch.toLowerCase().trim();
    return propCategoryItems
      .map((item) => {
        const matchesGroup =
          item.label.toLowerCase().includes(q) ||
          (item.thaiLabel && item.thaiLabel.toLowerCase().includes(q));
        const matchedChildren = (item.items || []).filter(
          (c) =>
            c.displayLabel.toLowerCase().includes(q) ||
            (c.thaiLabel && c.thaiLabel.toLowerCase().includes(q))
        );
        if (matchesGroup || matchedChildren.length > 0) {
          return { ...item, items: matchesGroup ? item.items : matchedChildren };
        }
        return null;
      })
      .filter(Boolean) as typeof propCategoryItems;
  }, [propCategoryItems, subCatSearch]);

  const filteredFurnGroups = useMemo(() => {
    if (!subCatSearch.trim()) return FURNITURE_CATEGORY_GROUPS;
    const q = subCatSearch.toLowerCase().trim();
    return FURNITURE_CATEGORY_GROUPS
      .map((g) => {
        const matchesGroup =
          g.label.toLowerCase().includes(q) || g.thaiLabel.toLowerCase().includes(q);
        const matchedItems = g.items.filter(
          (i) => i.name.toLowerCase().includes(q) || i.thaiLabel.toLowerCase().includes(q)
        );
        if (matchesGroup || matchedItems.length > 0) {
          return { ...g, items: matchesGroup ? g.items : matchedItems };
        }
        return null;
      })
      .filter(Boolean) as typeof FURNITURE_CATEGORY_GROUPS;
  }, [subCatSearch]);

  const filteredAllSubCats = useMemo(() => {
    if (!subCatSearch.trim()) return availableSubCats;
    const q = subCatSearch.toLowerCase().trim();
    return availableSubCats.filter((sc) => sc.toLowerCase().includes(q));
  }, [availableSubCats, subCatSearch]);

  // ตัวเลือกสีพร้อม Color Swatches (Beige, Black, Blue, Brown, Gold, Green, Grey, Orange, Pink, Purple, Red, Silver, White, Yellow)
  const colorOptions = useMemo(() => {
    let source = products;
    if (selectedMainCat !== "ALL") {
      source = source.filter((p) => p.category_id === selectedMainCat);
    }
    if (selectedSubCats.length > 0) {
      source = source.filter((p) =>
        selectedSubCats.some((sub) => checkProductCategoryMatch(p, selectedMainCat, sub))
      );
    }

    const countMap = new Map<string, number>();
    source.forEach((p) => {
      const colors = productColorValues(p);
      colors.forEach((c) => {
        const norm = c.toLowerCase();
        countMap.set(norm, (countMap.get(norm) || 0) + 1);
      });
    });

    const list: Array<{ value: string; label: string; swatch: string | null; count: number }> = [];
    Object.entries(COLOR_PRESENTATION).forEach(([key, val]) => {
      const count = countMap.get(key) || 0;
      list.push({
        value: key,
        label: val.label,
        swatch: val.swatch,
        count,
      });
    });

    countMap.forEach((count, key) => {
      if (!COLOR_PRESENTATION[key] && count > 0) {
        list.push({
          value: key,
          label: key.charAt(0).toUpperCase() + key.slice(1),
          swatch: null,
          count,
        });
      }
    });

    return list;
  }, [products, selectedMainCat, selectedSubCats]);

  // ตัวเลือกวัสดุพร้อมการจัดกลุ่ม (Ceramic, Glass, Resin, Metal, Stone, Wood, Canvas, Cement, Leather, Acrylic, Solid Wood, Bouclé)
  const materialOptions = useMemo(() => {
    let source = products;
    if (selectedMainCat !== "ALL") {
      source = source.filter((p) => p.category_id === selectedMainCat);
    }
    if (selectedSubCats.length > 0) {
      source = source.filter((p) =>
        selectedSubCats.some((sub) => checkProductCategoryMatch(p, selectedMainCat, sub))
      );
    }

    const countMap = new Map<string, number>();
    source.forEach((p) => {
      const mats = productMaterialValues(p);
      mats.forEach((m) => {
        const norm = m.toLowerCase();
        countMap.set(norm, (countMap.get(norm) || 0) + 1);
      });
    });

    const list: Array<{ value: string; label: string; thaiLabel?: string; count: number }> = [];
    Object.entries(MATERIAL_PRESENTATION).forEach(([key, val]) => {
      const count = countMap.get(key) || 0;
      if (count > 0) {
        list.push({
          value: key,
          label: val.label,
          thaiLabel: val.thaiLabel,
          count,
        });
      }
    });

    const extraCandidates = [
      "Solid Wood",
      "Bouclé Fabric",
      "W02 Black Wood",
      "W07 Light Walnut",
      "Afromosia",
      "Black Walnut",
      "Burmese Teak",
      "White Ash Wood",
    ];
    extraCandidates.forEach((candidate) => {
      const k = candidate.toLowerCase();
      let c = 0;
      source.forEach((p) => {
        const pm = String(p.material || p.specs?.material || "").toLowerCase();
        if (pm.includes(k)) c++;
      });
      if (c > 0 && !list.some((item) => item.value === k)) {
        list.push({
          value: candidate,
          label: candidate,
          count: c,
        });
      }
    });

    return list;
  }, [products, selectedMainCat, selectedSubCats]);

  // ตัวเลือกซัพพลายเออร์ / โรงงาน (สกัดจาก specs.brand / supplier / factory_name)
  const supplierOptions = useMemo(() => {
    let source = products;
    if (selectedMainCat !== "ALL") {
      source = source.filter((p) => p.category_id === selectedMainCat);
    }
    if (selectedSubCats.length > 0) {
      source = source.filter((p) =>
        selectedSubCats.some((sub) => checkProductCategoryMatch(p, selectedMainCat, sub))
      );
    }

    const countMap = new Map<string, number>();
    source.forEach((p) => {
      const raw = p.supplier || p.specs?.brand || p.specs?.supplier || p.specs?.factory || p.factory_name;
      if (raw && typeof raw === "string" && raw.trim()) {
        const val = raw.trim();
        countMap.set(val, (countMap.get(val) || 0) + 1);
      }
    });

    return Array.from(countMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [products, selectedMainCat, selectedSubCats]);

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return supplierOptions;
    const q = supplierSearch.toLowerCase().trim();
    return supplierOptions.filter((opt) => opt.name.toLowerCase().includes(q));
  }, [supplierOptions, supplierSearch]);

  // รายการสินค้าที่ถูกเลือกไว้ทั้งหมด
  const selectedProducts = useMemo(() => {
    const set = new Set(selectedProductIds.map(String));
    return products.filter((p) => set.has(String(p.id)));
  }, [products, selectedProductIds]);

  // จำนวนสินค้าที่ถูกเลือกสะสมแยกตามหมวดหมู่หลักและหมวดย่อย เพื่อแสดง Badge ให้เห็นชัดเจนตลอดเวลาว่าของเก่ายังอยู่
  const selectedCounts = useMemo(() => {
    const selectedSet = new Set(selectedProductIds.map(String));
    const mainCounts: Record<string, number> = {
      ALL: selectedProductIds.length,
      furniture: 0,
      prop: 0,
      SLABS: 0,
      rough_wood: 0,
    };
    const subCounts: Record<string, number> = {};

    products.forEach((p) => {
      if (selectedSet.has(String(p.id))) {
        if (mainCounts[p.category_id] !== undefined) {
          mainCounts[p.category_id]++;
        }
        if (p.sub_category) {
          subCounts[p.sub_category] = (subCounts[p.sub_category] || 0) + 1;
        }
        FURNITURE_CATEGORY_GROUPS.forEach((g) => {
          if (checkProductCategoryMatch(p, "furniture", g.label)) {
            subCounts[g.label] = (subCounts[g.label] || 0) + 1;
          }
          g.items.forEach((item) => {
            if (checkProductCategoryMatch(p, "furniture", item.name)) {
              subCounts[item.name] = (subCounts[item.name] || 0) + 1;
            }
          });
        });
        PRODUCT_FILTER_ITEMS.forEach((item) => {
          if (checkProductCategoryMatch(p, "prop", item.label)) {
            subCounts[item.label] = (subCounts[item.label] || 0) + 1;
          }
          item.items?.forEach((child) => {
            if (checkProductCategoryMatch(p, "prop", child.fullValue)) {
              subCounts[child.fullValue] = (subCounts[child.fullValue] || 0) + 1;
            }
          });
        });
        SLAB_CATEGORY_GROUPS.forEach((slab) => {
          if (checkProductCategoryMatch(p, "SLABS", slab.name)) {
            subCounts[slab.name] = (subCounts[slab.name] || 0) + 1;
          }
        });
        ROUGH_WOOD_GROUPS.forEach((rw) => {
          if (checkProductCategoryMatch(p, "rough_wood", rw.name)) {
            subCounts[rw.name] = (subCounts[rw.name] || 0) + 1;
          }
        });
      }
    });

    return { mainCounts, subCounts };
  }, [products, selectedProductIds]);

  // ฟิลเตอร์สินค้าตามเงื่อนไขสเปกทั้งหมด
  const filtered = useMemo(() => {
    let result = products;

    // 1. หมวดหมู่หลัก
    if (selectedMainCat !== "ALL") {
      result = result.filter((p) => p.category_id === selectedMainCat);
    }

    // 2. หมวดย่อย & โครงสร้าง (เลือกหลายหมวดย่อยพร้อมกันได้)
    if (selectedSubCats.length > 0) {
      result = result.filter((p) =>
        selectedSubCats.some((sub) => checkProductCategoryMatch(p, selectedMainCat, sub))
      );
    }

    // 2.1 ซัพพลายเออร์ / โรงงาน
    if (selectedSuppliers.length > 0) {
      result = result.filter((p) => {
        const sup = p.supplier || p.specs?.brand || p.specs?.supplier || p.specs?.factory || p.factory_name;
        return sup && selectedSuppliers.includes(String(sup).trim());
      });
    }

    // 3. กรองตามสต็อก
    if (stockFilter === "IN_STOCK") {
      result = result.filter((p) => {
        const qty = selectedBranchId
          ? (p.stock?.find((s: any) => String(s.branch_id) === String(selectedBranchId))?.qty ?? 0)
          : (p.total_stock ?? 0);
        return qty > 0;
      });
    } else if (stockFilter === "OUT_OF_STOCK") {
      result = result.filter((p) => {
        const qty = selectedBranchId
          ? (p.stock?.find((s: any) => String(s.branch_id) === String(selectedBranchId))?.qty ?? 0)
          : (p.total_stock ?? 0);
        return qty === 0;
      });
    } else if (stockFilter === "NEGATIVE") {
      result = result.filter((p) => {
        const qty = selectedBranchId
          ? (p.stock?.find((s: any) => String(s.branch_id) === String(selectedBranchId))?.qty ?? 0)
          : (p.total_stock ?? 0);
        return qty < 0;
      });
    }

    // 3.1. กรองตามสถานะโปรโมชันปัจจุบัน
    if (promoStatusFilter === "NO_PROMO") {
      result = result.filter((p) => !productPromoMap.has(String(p.id)));
    } else if (promoStatusFilter === "HAS_PROMO") {
      result = result.filter((p) => productPromoMap.has(String(p.id)));
    }

    // 3.2. กรองตามช่วงราคา (Price Filter)
    if (priceFilter === "HAS_PRICE") {
      result = result.filter((p) => (Number(p.price) || 0) > 0);
    } else if (priceFilter === "UNDER_1K") {
      result = result.filter((p) => (Number(p.price) || 0) > 0 && (Number(p.price) || 0) < 1000);
    } else if (priceFilter === "1K_3K") {
      result = result.filter((p) => (Number(p.price) || 0) >= 1000 && (Number(p.price) || 0) <= 3000);
    } else if (priceFilter === "3K_10K") {
      result = result.filter((p) => (Number(p.price) || 0) > 3000 && (Number(p.price) || 0) <= 10000);
    } else if (priceFilter === "OVER_10K") {
      result = result.filter((p) => (Number(p.price) || 0) > 10000);
    }

    if (minPrice.trim() !== "") {
      const minP = Number(minPrice);
      if (!isNaN(minP)) {
        result = result.filter((p) => (Number(p.price) || 0) >= minP);
      }
    }
    if (maxPrice.trim() !== "") {
      const maxP = Number(maxPrice);
      if (!isNaN(maxP)) {
        result = result.filter((p) => (Number(p.price) || 0) <= maxP);
      }
    }

    // 4. สี (Color - เลือกหลายสีพร้อมกันได้)
    if (selectedColors.length > 0) {
      result = result.filter((p) => {
        const colors = productColorValues(p).map((c) => c.toLowerCase());
        const rawCol = (p.color || "").toLowerCase();
        return selectedColors.some((col) => colors.includes(col) || rawCol.includes(col));
      });
    }

    // 5. วัสดุ (Material - เลือกหลายวัสดุพร้อมกันได้)
    if (selectedMaterials.length > 0) {
      result = result.filter((p) => {
        const mats = productMaterialValues(p).map((m) => m.toLowerCase());
        const rawMat = String(p.material || p.specs?.material || "").toLowerCase();
        return selectedMaterials.some((mat) => mats.includes(mat) || rawMat.includes(mat));
      });
    }

    // 6. ค้นหาข้อความ (ชื่อ, SKU, หมวดย่อย, ซัพพลายเออร์, สี, วัสดุ)
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter((p) => {
        const sup = p.supplier || p.specs?.brand || p.specs?.supplier || p.specs?.factory || p.factory_name;
        return (
          p.name?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          (p.sub_category && p.sub_category.toLowerCase().includes(q)) ||
          (sup && String(sup).toLowerCase().includes(q)) ||
          (p.color && p.color.toLowerCase().includes(q)) ||
          (p.material && p.material.toLowerCase().includes(q))
        );
      });
    }

    return result;
  }, [
    products,
    selectedMainCat,
    selectedSubCats,
    selectedSuppliers,
    stockFilter,
    promoStatusFilter,
    priceFilter,
    minPrice,
    maxPrice,
    selectedColors,
    selectedMaterials,
    query,
    selectedBranchId,
    productPromoMap,
  ]);

  // สินค้าทั้งหมดที่จะแสดงผล: ถ้า viewMode === "selected" จะแสดงสินค้าที่เลือกไว้ทั้งหมด
  const activeBaseList = useMemo(() => {
    if (viewMode === "selected") {
      let base = selectedProducts;
      if (query.trim()) {
        const q = query.toLowerCase();
        base = base.filter(
          (p) =>
            p.name?.toLowerCase().includes(q) ||
            p.sku?.toLowerCase().includes(q) ||
            (p.sub_category && p.sub_category.toLowerCase().includes(q)) ||
            (p.color && p.color.toLowerCase().includes(q)) ||
            (p.material && p.material.toLowerCase().includes(q))
        );
      }
      return base;
    }
    return filtered;
  }, [viewMode, selectedProducts, query, filtered]);

  // เรียงลำดับรายการสินค้าตามตัวเลือกที่เลือก
  const sortedList = useMemo(() => {
    const list = [...activeBaseList];
    if (sortBy === "stock_desc") {
      list.sort((a, b) => {
        const stockA = selectedBranchId
          ? (a.stock?.find((s: any) => String(s.branch_id) === String(selectedBranchId))?.qty ?? 0)
          : (a.total_stock ?? 0);
        const stockB = selectedBranchId
          ? (b.stock?.find((s: any) => String(s.branch_id) === String(selectedBranchId))?.qty ?? 0)
          : (b.total_stock ?? 0);
        return stockB - stockA;
      });
    } else if (sortBy === "stock_asc") {
      list.sort((a, b) => {
        const stockA = selectedBranchId
          ? (a.stock?.find((s: any) => String(s.branch_id) === String(selectedBranchId))?.qty ?? 0)
          : (a.total_stock ?? 0);
        const stockB = selectedBranchId
          ? (b.stock?.find((s: any) => String(s.branch_id) === String(selectedBranchId))?.qty ?? 0)
          : (b.total_stock ?? 0);
        return stockA - stockB;
      });
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => {
        const pA = Number(a.price) || 0;
        const pB = Number(b.price) || 0;
        if (pA === 0 && pB > 0) return 1;
        if (pB === 0 && pA > 0) return -1;
        return pB - pA;
      });
    } else if (sortBy === "price_asc") {
      list.sort((a, b) => {
        const pA = Number(a.price) || 0;
        const pB = Number(b.price) || 0;
        // เอาสินค้าที่มีราคาขึ้นก่อนเสมอ สินค้าไม่มีราคาไปอยู่ท้าย
        if (pA === 0 && pB > 0) return 1;
        if (pB === 0 && pA > 0) return -1;
        return pA - pB;
      });
    } else if (sortBy === "name_asc") {
      list.sort((a, b) => (a.name || "").localeCompare(b.name || "", "th"));
    } else if (sortBy === "sku_asc") {
      list.sort((a, b) => (a.sku || "").localeCompare(b.sku || ""));
    }
    return list;
  }, [activeBaseList, sortBy, selectedBranchId]);

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

  // ตรวจสอบว่าสินค้าในตัวกรองปัจจุบันถูกเลือกครบทั้งหมดแล้วหรือยัง
  const areAllFilteredSelected = useMemo(() => {
    if (sortedList.length === 0) return false;
    const selectedSet = new Set(selectedProductIds.map(String));
    return sortedList.every((p) => selectedSet.has(String(p.id)));
  }, [sortedList, selectedProductIds]);

  // สลับเลือก/ยกเลิกเลือกเฉพาะสินค้าที่กำลังแสดงในตัวกรองปัจจุบัน โดยไม่กระทบสินค้าที่เลือกจากตัวกรองอื่น
  const handleToggleSelectAllFiltered = () => {
    const filteredIdSet = new Set(sortedList.map((p) => String(p.id)));
    if (areAllFilteredSelected) {
      onSelectionChange(selectedProductIds.filter((id) => !filteredIdSet.has(id)));
    } else {
      const merged = Array.from(new Set([...selectedProductIds, ...Array.from(filteredIdSet)]));
      onSelectionChange(merged);
    }
  };

  const hasActiveFilters = Boolean(
    selectedMainCat !== "ALL" ||
    selectedSubCats.length > 0 ||
    selectedSuppliers.length > 0 ||
    stockFilter !== "ALL" ||
    promoStatusFilter !== "ALL" ||
    priceFilter !== "ALL" ||
    minPrice !== "" ||
    maxPrice !== "" ||
    sortBy !== "default" ||
    selectedColors.length > 0 ||
    selectedMaterials.length > 0 ||
    query.trim() !== ""
  );

  const clearFilters = () => {
    setQuery("");
    setSelectedMainCat("ALL");
    setSelectedSubCats([]);
    setSelectedSuppliers([]);
    setSupplierSearch("");
    setStockFilter("ALL");
    setPromoStatusFilter("ALL");
    setPriceFilter("ALL");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("default");
    setSelectedColors([]);
    setSelectedMaterials([]);
    setSubCatSearch("");
  };

  const formatDimensions = (p: any) => {
    const parts: string[] = [];
    if (p.width_cm) parts.push(`ก:${p.width_cm}`);
    if (p.length_cm) parts.push(`ย:${p.length_cm}`);
    if (p.height_cm) parts.push(`ส:${p.height_cm}`);
    return parts.length > 0 ? `${parts.join(" × ")} cm` : null;
  };

  const renderStockBadge = (p: any) => {
    const branchStock = selectedBranchId
      ? p.stock?.find((s: any) => String(s.branch_id) === String(selectedBranchId))?.qty ?? 0
      : null;
    const totalStock = p.total_stock ?? 0;

    if (selectedBranchId) {
      if (branchStock > 0) {
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            สาขา: {branchStock} <span className="font-normal text-emerald-600/70 ml-1">(รวม {totalStock})</span>
          </span>
        );
      }
      if (branchStock === 0) {
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
            สาขาหมด <span className="text-slate-400/80 ml-1">(รวม {totalStock})</span>
          </span>
        );
      }
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
          ติดลบ {branchStock} <span className="font-normal text-rose-500/70 ml-1">(รวม {totalStock})</span>
        </span>
      );
    }

    if (totalStock > 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          สต็อก: {totalStock.toLocaleString()}
        </span>
      );
    }
    if (totalStock === 0) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
          หมด (0)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
        ติดลบ {totalStock}
      </span>
    );
  };

  const displayedList = useMemo(() => {
    return sortedList.slice(0, displayLimit);
  }, [sortedList, displayLimit]);

  return (
    <>
      {/* ── Middle Column: Spec Filters Panel (แยกออกมาต่างหากอย่างละเอียด) ── */}
      {showSpecPanel && (
        <div className="w-72 sm:w-80 border-r border-slate-200/80 flex flex-col flex-shrink-0 bg-slate-50/70">
          {/* Header */}
          <div className="px-3.5 py-3 border-b border-slate-200/80 flex items-center justify-between bg-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-700" />
              <span className="text-xs font-bold text-slate-800">ตัวกรองสเปกละเอียด</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleAllSections(!allExpanded)}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-800 transition"
                title={allExpanded ? "ย่อทุกหมวดหมู่" : "ขยายทุกหมวดหมู่"}
              >
                {allExpanded ? "ย่อทั้งหมด" : "ขยายทั้งหมด"}
              </button>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 transition flex items-center gap-0.5 ml-1"
                  title="ล้างตัวกรองทั้งหมด"
                >
                  <X className="w-3 h-3" />
                  <span>ล้าง</span>
                </button>
              )}
            </div>
          </div>

          {/* Active Filter Chips Tray (สรุปตัวกรองที่เปิดอยู่ทั้งหมด ให้ลบออกได้ในคลิกเดียว) */}
          {hasActiveFilters && (
            <div className="px-3 py-2 bg-amber-50/70 border-b border-amber-200/60 flex flex-wrap gap-1 items-center flex-shrink-0 max-h-24 overflow-y-auto">
              <span className="text-[10px] font-bold text-amber-900 mr-0.5 flex items-center gap-0.5">
                <Filter className="w-3 h-3 text-amber-700" />
                <span>กรอง:</span>
              </span>

              {selectedMainCat !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-amber-300 text-[10px] font-semibold text-slate-800 shadow-2xs">
                  {MAIN_CATEGORIES.find((c) => c.key === selectedMainCat)?.label}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMainCat("ALL");
                      setSelectedSubCats([]);
                    }}
                    className="hover:text-rose-600 ml-0.5 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}

              {selectedSubCats.map((sc) => (
                <span
                  key={sc}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-amber-300 text-[10px] font-semibold text-slate-800 shadow-2xs"
                >
                  <span className="truncate max-w-[90px]">{sc}</span>
                  <button
                    type="button"
                    onClick={() => toggleSubCat(sc)}
                    className="hover:text-rose-600 ml-0.5 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}

              {stockFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-amber-300 text-[10px] font-semibold text-slate-800 shadow-2xs">
                  {stockFilter === "IN_STOCK"
                    ? "มีสต็อกพร้อมขาย"
                    : stockFilter === "OUT_OF_STOCK"
                    ? "สต็อกหมด"
                    : "สต็อกติดลบ"}
                  <button
                    type="button"
                    onClick={() => setStockFilter("ALL")}
                    className="hover:text-rose-600 ml-0.5 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}

              {promoStatusFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-amber-300 text-[10px] font-semibold text-slate-800 shadow-2xs">
                  {promoStatusFilter === "NO_PROMO" ? "ยังไม่มีโปร" : "มีโปรแล้ว"}
                  <button
                    type="button"
                    onClick={() => setPromoStatusFilter("ALL")}
                    className="hover:text-rose-600 ml-0.5 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}

              {(priceFilter !== "ALL" || minPrice !== "" || maxPrice !== "") && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-amber-300 text-[10px] font-semibold text-slate-800 shadow-2xs">
                  ราคา:{" "}
                  {minPrice || maxPrice
                    ? `${minPrice || 0}-${maxPrice || "∞"}฿`
                    : priceFilter === "HAS_PRICE"
                    ? "เฉพาะมีราคา"
                    : priceFilter === "UNDER_1K"
                    ? "< 1k฿"
                    : priceFilter === "1K_3K"
                    ? "1k-3k฿"
                    : priceFilter === "3K_10K"
                    ? "3k-10k฿"
                    : "> 10k฿"}
                  <button
                    type="button"
                    onClick={() => {
                      setPriceFilter("ALL");
                      setMinPrice("");
                      setMaxPrice("");
                    }}
                    className="hover:text-rose-600 ml-0.5 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}

              {selectedSuppliers.map((sup) => (
                <span
                  key={sup}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-amber-300 text-[10px] font-semibold text-slate-800 shadow-2xs"
                >
                  <span className="truncate max-w-[120px]">🏢 {sup}</span>
                  <button
                    type="button"
                    onClick={() => toggleSupplier(sup)}
                    className="hover:text-rose-600 ml-0.5 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}

              {selectedColors.map((col) => (
                <span
                  key={col}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-amber-300 text-[10px] font-semibold text-slate-800 shadow-2xs capitalize"
                >
                  สี: {col}
                  <button
                    type="button"
                    onClick={() => toggleColor(col)}
                    className="hover:text-rose-600 ml-0.5 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}

              {selectedMaterials.map((mat) => (
                <span
                  key={mat}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-amber-300 text-[10px] font-semibold text-slate-800 shadow-2xs capitalize"
                >
                  วัสดุ: {mat}
                  <button
                    type="button"
                    onClick={() => toggleMaterial(mat)}
                    className="hover:text-rose-600 ml-0.5 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}

              <button
                type="button"
                onClick={clearFilters}
                className="text-[10px] text-rose-600 hover:underline font-bold ml-auto"
              >
                ล้างทั้งหมด
              </button>
            </div>
          )}

          {/* Scrollable Filters Accordion Container */}
          <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2.5 text-xs">
            {/* ── Section 1: หมวดหมู่ & ชนิดสินค้า ── */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden transition">
              <button
                type="button"
                onClick={() => toggleSection("cat")}
                className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Layers className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span className="font-bold text-slate-800 text-xs truncate">หมวดหมู่ & ชนิดสินค้า</span>
                  {(selectedMainCat !== "ALL" || selectedSubCats.length > 0) && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-slate-900 text-white shrink-0">
                      {selectedMainCat !== "ALL"
                        ? MAIN_CATEGORIES.find((c) => c.key === selectedMainCat)?.label
                        : ""}
                      {selectedSubCats.length > 0 ? ` (${selectedSubCats.length})` : ""}
                    </span>
                  )}
                </div>
                {openSections.cat ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
              </button>

              {openSections.cat && (
                <div className="p-3 pt-0 border-t border-slate-100 space-y-2.5 mt-1">
                  {/* Main Category Compact Grid */}
                  <div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {MAIN_CATEGORIES.map((cat, idx) => {
                        const isActive = selectedMainCat === cat.key;
                        const count =
                          cat.key === "ALL"
                            ? products.length
                            : products.filter((p) => p.category_id === cat.key).length;
                        const chosenCount = selectedCounts.mainCounts[cat.key] || 0;
                        return (
                          <button
                            key={cat.key}
                            type="button"
                            onClick={() => {
                              setSelectedMainCat(cat.key);
                              setSelectedSubCats([]);
                            }}
                            className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition border ${
                              idx === 0 ? "col-span-2" : ""
                            } ${
                              isActive
                                ? "bg-slate-900 text-white border-slate-900 font-bold shadow-xs"
                                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80 font-medium"
                            }`}
                          >
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="truncate">{cat.label}</span>
                              {chosenCount > 0 && (
                                <span
                                  className={`px-1 rounded text-[9px] font-bold shrink-0 ${
                                    isActive
                                      ? "bg-emerald-500 text-white"
                                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  }`}
                                >
                                  {chosenCount}
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-[10px] font-mono px-1 rounded shrink-0 ml-1 ${
                                isActive ? "bg-white/20 text-white" : "text-slate-400"
                              }`}
                            >
                              {count.toLocaleString()}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Subcategories (หมวดหมู่ย่อย) */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-700">
                        {selectedMainCat === "furniture"
                          ? "หมวดย่อยเฟอร์นิเจอร์"
                          : selectedMainCat === "prop"
                          ? "หมวดย่อยพร็อพ (Terra Home)"
                          : selectedMainCat === "SLABS"
                          ? "ประเภทแผ่นไม้"
                          : selectedMainCat === "rough_wood"
                          ? "ประเภทไม้ดิบ"
                          : "หมวดหมู่ย่อย"}
                      </span>
                      {selectedSubCats.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedSubCats([])}
                          className="text-[10px] text-rose-600 hover:underline font-semibold"
                        >
                          ล้างย่อย ({selectedSubCats.length})
                        </button>
                      )}
                    </div>

                    {/* Quick Search if more than 4 subcategories */}
                    {(selectedMainCat === "prop" ||
                      selectedMainCat === "furniture" ||
                      selectedMainCat === "ALL") && (
                      <div className="relative mb-2">
                        <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={subCatSearch}
                          onChange={(e) => setSubCatSearch(e.target.value)}
                          placeholder="ค้นหาหมวดย่อย..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-6 pr-6 py-1 text-[11px] outline-none focus:border-slate-800 focus:bg-white transition"
                        />
                        {subCatSearch && (
                          <button
                            type="button"
                            onClick={() => setSubCatSearch("")}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* If Furniture selected */}
                    {selectedMainCat === "furniture" && (
                      <div className="space-y-1 max-h-52 overflow-y-auto pr-0.5">
                        {filteredFurnGroups.map((group) => {
                          const isGroupActive = selectedSubCats.includes(group.label);
                          const isOpen = !!openCatGroups[group.label];
                          const groupCount = furnitureCounts[group.label] || 0;
                          const groupChosen = selectedCounts.subCounts[group.label] || 0;

                          return (
                            <div key={group.label} className="border-b border-slate-100 last:border-0 pb-0.5">
                              <div className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50 transition">
                                <button
                                  type="button"
                                  onClick={() => toggleSubCat(group.label)}
                                  className={`flex-1 text-left flex items-center justify-between text-xs ${
                                    isGroupActive ? "text-slate-900 font-bold" : "text-slate-700 font-medium"
                                  }`}
                                >
                                  <div className="flex flex-col text-left">
                                    <div className="flex items-center gap-1.5">
                                      <span>{group.label}</span>
                                      {groupChosen > 0 && (
                                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                          เลือก {groupChosen}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-normal">{group.thaiLabel}</span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-mono ml-1 shrink-0">({groupCount})</span>
                                </button>
                                {group.items.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => toggleAccordion(group.label)}
                                    className="p-1 text-slate-400 hover:text-slate-600 rounded ml-1 shrink-0"
                                  >
                                    {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                  </button>
                                )}
                              </div>

                              {isOpen && group.items.length > 0 && (
                                <div className="pl-3 pr-1 py-1 space-y-0.5 border-l-2 border-slate-100 ml-2 mb-1">
                                  {group.items.map((item) => {
                                    const isItemActive = selectedSubCats.includes(item.name);
                                    const itemCount = furnitureCounts[item.name] || 0;
                                    const itemChosen = selectedCounts.subCounts[item.name] || 0;
                                    return (
                                      <button
                                        key={item.name}
                                        type="button"
                                        onClick={() => toggleSubCat(item.name)}
                                        className={`w-full flex items-center justify-between px-2 py-1 rounded text-[11px] transition ${
                                          isItemActive
                                            ? "bg-slate-900 text-white font-semibold"
                                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                        }`}
                                      >
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <span className="truncate">{item.name}</span>
                                          {itemChosen > 0 && (
                                            <span className={`px-1 py-0.2 rounded text-[9px] font-bold shrink-0 ${isItemActive ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                                              เลือก {itemChosen}
                                            </span>
                                          )}
                                        </div>
                                        <span className={`text-[10px] font-mono shrink-0 ml-1 ${isItemActive ? "text-slate-300" : "text-slate-400"}`}>
                                          {itemCount}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* If Prop selected */}
                    {selectedMainCat === "prop" && (
                      <div className="space-y-1 max-h-52 overflow-y-auto pr-0.5">
                        {filteredPropGroups.map((item) => {
                          const isGroupActive = selectedSubCats.includes(item.label);
                          const isOpen = !!openCatGroups[item.label];
                          const groupCount = propCounts[item.label] || 0;
                          const groupChosen = selectedCounts.subCounts[item.label] || 0;
                          const hasChildren = item.items && item.items.length > 0;

                          return (
                            <div key={item.label} className="border-b border-slate-100 last:border-0 pb-0.5">
                              <div className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50 transition">
                                <button
                                  type="button"
                                  onClick={() => toggleSubCat(item.label)}
                                  className={`flex-1 text-left flex items-center justify-between text-xs ${
                                    isGroupActive ? "text-slate-900 font-bold" : "text-slate-700 font-medium"
                                  }`}
                                >
                                  <div className="flex flex-col text-left">
                                    <div className="flex items-center gap-1.5">
                                      <span>{item.displayLabel || item.label}</span>
                                      {groupChosen > 0 && (
                                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                          เลือก {groupChosen}
                                        </span>
                                      )}
                                    </div>
                                    {item.thaiLabel && <span className="text-[10px] text-slate-400 font-normal">{item.thaiLabel}</span>}
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-mono ml-1 shrink-0">({groupCount})</span>
                                </button>
                                {hasChildren && (
                                  <button
                                    type="button"
                                    onClick={() => toggleAccordion(item.label)}
                                    className="p-1 text-slate-400 hover:text-slate-600 rounded ml-1 shrink-0"
                                  >
                                    {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                  </button>
                                )}
                              </div>

                              {isOpen && hasChildren && (
                                <div className="pl-3 pr-1 py-1 space-y-0.5 border-l-2 border-slate-100 ml-2 mb-1">
                                  {item.items?.map((child) => {
                                    const isChildActive = selectedSubCats.includes(child.fullValue);
                                    const childCount = propCounts[child.fullValue] || 0;
                                    const childChosen = selectedCounts.subCounts[child.fullValue] || 0;
                                    return (
                                      <button
                                        key={child.fullValue}
                                        type="button"
                                        onClick={() => toggleSubCat(child.fullValue)}
                                        className={`w-full flex items-center justify-between px-2 py-1 rounded text-[11px] transition ${
                                          isChildActive
                                            ? "bg-slate-900 text-white font-semibold"
                                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                        }`}
                                      >
                                        <div className="flex flex-col text-left">
                                          <div className="flex items-center gap-1.5">
                                            <span>{child.displayLabel}</span>
                                            {childChosen > 0 && (
                                              <span className={`px-1 py-0.2 rounded text-[9px] font-bold shrink-0 ${isChildActive ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                                                เลือก {childChosen}
                                              </span>
                                            )}
                                          </div>
                                          {child.thaiLabel && (
                                            <span className={`text-[9px] ${isChildActive ? "text-slate-300" : "text-slate-400"}`}>
                                              {child.thaiLabel}
                                            </span>
                                          )}
                                        </div>
                                        <span className={`text-[10px] font-mono shrink-0 ml-1 ${isChildActive ? "text-slate-300" : "text-slate-400"}`}>
                                          {childCount}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* If SLABS selected */}
                    {selectedMainCat === "SLABS" && (
                      <div className="space-y-1.5">
                        {SLAB_CATEGORY_GROUPS.map((slab) => {
                          const isActive = selectedSubCats.includes(slab.name);
                          const count = slabCounts[slab.name] || 0;
                          const slabChosen = selectedCounts.subCounts[slab.name] || 0;
                          return (
                            <button
                              key={slab.name}
                              type="button"
                              onClick={() => toggleSubCat(slab.name)}
                              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition border ${
                                isActive
                                  ? "bg-slate-900 text-white border-slate-900 font-bold shadow-xs"
                                  : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 font-medium"
                              }`}
                            >
                              <div className="flex flex-col text-left">
                                <div className="flex items-center gap-1.5">
                                  <span>{slab.name}</span>
                                  {slabChosen > 0 && (
                                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                      เลือก {slabChosen}
                                    </span>
                                  )}
                                </div>
                                <span className={`text-[10px] ${isActive ? "text-slate-300" : "text-slate-400"}`}>
                                  {slab.thaiLabel}
                                </span>
                              </div>
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* If rough_wood selected */}
                    {selectedMainCat === "rough_wood" && (
                      <div className="space-y-1.5">
                        {ROUGH_WOOD_GROUPS.map((rw) => {
                          const isActive = selectedSubCats.includes(rw.name);
                          const count = products.filter((p) => p.category_id === "rough_wood").length;
                          const rwChosen = selectedCounts.subCounts[rw.name] || 0;
                          return (
                            <button
                              key={rw.name}
                              type="button"
                              onClick={() => toggleSubCat(rw.name)}
                              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition border ${
                                isActive
                                  ? "bg-slate-900 text-white border-slate-900 font-bold shadow-xs"
                                  : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 font-medium"
                              }`}
                            >
                              <div className="flex flex-col text-left">
                                <div className="flex items-center gap-1.5">
                                  <span>{rw.name}</span>
                                  {rwChosen > 0 && (
                                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                      เลือก {rwChosen}
                                    </span>
                                  )}
                                </div>
                                <span className={`text-[10px] ${isActive ? "text-slate-300" : "text-slate-400"}`}>
                                  {rw.thaiLabel}
                                </span>
                              </div>
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* If ALL selected */}
                    {selectedMainCat === "ALL" && (
                      <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
                        {filteredAllSubCats.map((sc) => {
                          const isScActive = selectedSubCats.includes(sc);
                          const scChosen = selectedCounts.subCounts[sc] || 0;
                          return (
                            <button
                              key={sc}
                              type="button"
                              onClick={() => toggleSubCat(sc)}
                              className={`w-full flex items-center justify-between px-2 py-1 rounded text-[11px] transition ${
                                isScActive
                                  ? "bg-slate-900 text-white font-semibold"
                                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="truncate">{sc}</span>
                                {scChosen > 0 && (
                                  <span className={`px-1 py-0.2 rounded text-[9px] font-bold shrink-0 ${isScActive ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                                    เลือก {scChosen}
                                  </span>
                                )}
                              </div>
                              <span className={`text-[10px] font-mono shrink-0 ml-1 ${isScActive ? "text-slate-300" : "text-slate-400"}`}>
                                {subCatCountMap[sc] || 0}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Section 2: ซัพพลายเออร์ / โรงงาน (Supplier) ── */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden transition">
              <button
                type="button"
                onClick={() => toggleSection("suppliers")}
                className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Store className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span className="font-bold text-slate-800 text-xs truncate">ซัพพลายเออร์ / โรงงาน</span>
                  {selectedSuppliers.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-slate-900 text-white shrink-0">
                      เลือก {selectedSuppliers.length}
                    </span>
                  )}
                </div>
                {openSections.suppliers ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
              </button>

              {openSections.suppliers && (
                <div className="p-3 pt-0 border-t border-slate-100 space-y-2.5 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">
                      รายชื่อ ({supplierOptions.length})
                    </span>
                    {selectedSuppliers.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedSuppliers([])}
                        className="text-[10px] text-rose-600 hover:underline font-semibold"
                      >
                        ล้าง ({selectedSuppliers.length})
                      </button>
                    )}
                  </div>

                  {/* Search Supplier */}
                  <div className="relative">
                    <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={supplierSearch}
                      onChange={(e) => setSupplierSearch(e.target.value)}
                      placeholder="ค้นหาซัพพลายเออร์..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-6 pr-6 py-1 text-[11px] outline-none focus:border-slate-800 focus:bg-white transition"
                    />
                    {supplierSearch && (
                      <button
                        type="button"
                        onClick={() => setSupplierSearch("")}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Supplier list with checkboxes & counts */}
                  <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
                    {filteredSuppliers.length === 0 ? (
                      <p className="text-[11px] text-slate-400 text-center py-3">
                        ไม่พบซัพพลายเออร์ที่ตรงกัน
                      </p>
                    ) : (
                      filteredSuppliers.map((opt) => {
                        const isSelected = selectedSuppliers.includes(opt.name);
                        return (
                          <button
                            key={opt.name}
                            type="button"
                            onClick={() => toggleSupplier(opt.name)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition border ${
                              isSelected
                                ? "bg-slate-900 text-white border-slate-900 font-bold shadow-xs"
                                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80 font-medium"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="truncate">{opt.name}</span>
                            </div>
                            <span
                              className={`text-[10px] font-mono px-1 rounded shrink-0 ml-1 ${
                                isSelected ? "bg-white/20 text-white" : "text-slate-400"
                              }`}
                            >
                              {opt.count.toLocaleString()}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Section 3: สี & วัสดุ ── */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden transition">
              <button
                type="button"
                onClick={() => toggleSection("styling")}
                className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Palette className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span className="font-bold text-slate-800 text-xs truncate">สี & วัสดุ</span>
                  {(selectedColors.length > 0 || selectedMaterials.length > 0) && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-slate-900 text-white shrink-0">
                      เลือก {selectedColors.length + selectedMaterials.length}
                    </span>
                  )}
                </div>
                {openSections.styling ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
              </button>

              {openSections.styling && (
                <div className="p-3 pt-0 border-t border-slate-100 space-y-3 mt-1">
                  {/* สี (Color) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-700">
                        สี ({colorOptions.filter((c) => c.count > 0).length})
                      </span>
                      {selectedColors.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedColors([])}
                          className="text-[10px] text-rose-600 hover:underline font-semibold"
                        >
                          ล้างสี ({selectedColors.length})
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto pr-0.5">
                      {colorOptions.map((opt) => {
                        const isSelected = selectedColors.includes(opt.value.toLowerCase());
                        const disabled = opt.count === 0;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={disabled}
                            onClick={() => toggleColor(opt.value)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-left transition select-none ${
                              isSelected
                                ? "bg-slate-900 text-white font-bold shadow-xs"
                                : disabled
                                ? "opacity-35 cursor-not-allowed text-slate-400"
                                : "hover:bg-slate-50 text-slate-700 font-medium"
                            }`}
                          >
                            <span
                              className="w-3 h-3 rounded-full shrink-0 border border-slate-300"
                              style={opt.swatch ? { backgroundColor: opt.swatch } : { backgroundColor: "#cbd5e1" }}
                            />
                            <span className="text-[11px] truncate flex-1">{opt.label}</span>
                            <span className={`text-[10px] font-mono shrink-0 ${isSelected ? "text-slate-300" : "text-slate-400"}`}>
                              {opt.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* วัสดุ (Material) */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-700">
                        วัสดุ ({materialOptions.length})
                      </span>
                      {selectedMaterials.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedMaterials([])}
                          className="text-[10px] text-rose-600 hover:underline font-semibold"
                        >
                          ล้างวัสดุ ({selectedMaterials.length})
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto pr-0.5">
                      {materialOptions.map((mat) => {
                        const isSelected = selectedMaterials.includes(mat.value.toLowerCase());
                        return (
                          <button
                            key={mat.value}
                            type="button"
                            onClick={() => toggleMaterial(mat.value)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition ${
                              isSelected
                                ? "bg-slate-900 text-white font-bold shadow-xs"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 font-medium"
                            }`}
                          >
                            <span>{mat.label}</span>
                            <span className={`text-[10px] font-mono ${isSelected ? "text-slate-300" : "text-slate-400"}`}>
                              {mat.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Section 4: ราคา, สต็อก & โปรโมชัน ── */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden transition">
              <button
                type="button"
                onClick={() => toggleSection("commerce")}
                className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Coins className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="font-bold text-slate-800 text-xs truncate">ราคา, สต็อก & โปรโมชัน</span>
                  {(stockFilter !== "ALL" || promoStatusFilter !== "ALL" || priceFilter !== "ALL" || minPrice || maxPrice) && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-slate-950 shrink-0">
                      กำลังกรอง
                    </span>
                  )}
                </div>
                {openSections.commerce ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
              </button>

              {openSections.commerce && (
                <div className="p-3 pt-0 border-t border-slate-100 space-y-3 mt-1">
                  {/* สถานะสต็อก */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 block mb-1">
                      สถานะสต็อก
                    </span>
                    <div className="grid grid-cols-2 gap-1 bg-slate-50 rounded-lg p-1 border border-slate-200/60">
                      {[
                        { key: "ALL", label: "ทั้งหมด" },
                        { key: "IN_STOCK", label: "มีสต็อก (> 0)" },
                        { key: "OUT_OF_STOCK", label: "สต็อกหมด (0)" },
                        { key: "NEGATIVE", label: "สต็อกติดลบ (< 0)" },
                      ].map((item) => {
                        const isActive = stockFilter === item.key;
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setStockFilter(item.key as any)}
                            className={`px-2 py-1 rounded text-[11px] font-medium transition text-center ${
                              isActive
                                ? "bg-slate-900 text-white font-bold shadow-xs"
                                : "hover:bg-slate-200/60 text-slate-600"
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* สถานะโปรโมชันปัจจุบัน */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 block mb-1">
                      สถานะโปรโมชันปัจจุบัน
                    </span>
                    <div className="grid grid-cols-3 gap-1 bg-slate-50 rounded-lg p-1 border border-slate-200/60">
                      {[
                        { key: "ALL", label: "ทั้งหมด" },
                        { key: "NO_PROMO", label: "ยังไม่มีโปร" },
                        { key: "HAS_PROMO", label: "มีโปรแล้ว" },
                      ].map((item) => {
                        const isActive = promoStatusFilter === item.key;
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setPromoStatusFilter(item.key as any)}
                            className={`px-1 py-1 rounded text-[11px] font-medium transition text-center ${
                              isActive
                                ? "bg-slate-900 text-white font-bold shadow-xs"
                                : "hover:bg-slate-200/60 text-slate-600"
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ช่วงราคา */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-700">
                        กรองราคาเอง (กำหนดต่ำสุด - สูงสุด)
                      </span>
                      {(priceFilter !== "ALL" || minPrice !== "" || maxPrice !== "") && (
                        <button
                          type="button"
                          onClick={() => {
                            setPriceFilter("ALL");
                            setMinPrice("");
                            setMaxPrice("");
                          }}
                          className="text-[10px] text-rose-600 hover:underline font-semibold"
                        >
                          รีเซ็ตราคา
                        </button>
                      )}
                    </div>

                    {/* Custom Min / Max Price Inputs */}
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                      <div>
                        <span className="text-[10px] text-slate-500 font-medium block mb-0.5">ราคาต่ำสุด</span>
                        <input
                          type="number"
                          placeholder="0 ฿"
                          value={minPrice}
                          onChange={(e) => {
                            setMinPrice(e.target.value);
                            setPriceFilter("ALL");
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-slate-800 focus:bg-white font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-medium block mb-0.5">ราคาสูงสุด</span>
                        <input
                          type="number"
                          placeholder="ไม่จำกัด ฿"
                          value={maxPrice}
                          onChange={(e) => {
                            setMaxPrice(e.target.value);
                            setPriceFilter("ALL");
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-slate-800 focus:bg-white font-mono"
                        />
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-400 block mb-1">หรือเลือกช่วงราคาสำเร็จรูป:</span>
                    <div className="grid grid-cols-2 gap-1 bg-slate-50 rounded-lg p-1 border border-slate-200/60">
                      {[
                        { key: "ALL", label: "ทุกราคา", count: products.length },
                        { key: "HAS_PRICE", label: "เฉพาะมีราคา", count: priceStats.hasPrice },
                        { key: "UNDER_1K", label: "< 1,000 ฿", count: priceStats.under1k },
                        { key: "1K_3K", label: "1k - 3k ฿", count: priceStats.between1k3k },
                        { key: "3K_10K", label: "3k - 10k ฿", count: priceStats.between3k10k },
                        { key: "OVER_10K", label: "> 10,000 ฿", count: priceStats.over10k },
                      ].map((item) => {
                        const isActive = priceFilter === item.key && minPrice === "" && maxPrice === "";
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => {
                              setPriceFilter(item.key as any);
                              setMinPrice("");
                              setMaxPrice("");
                            }}
                            className={`flex items-center justify-between px-2 py-1 rounded text-[11px] font-medium transition ${
                              isActive
                                ? "bg-slate-900 text-white font-bold shadow-xs"
                                : "hover:bg-slate-200/60 text-slate-600"
                            }`}
                          >
                            <span>{item.label}</span>
                            <span className={`text-[10px] font-mono ${isActive ? "text-slate-300" : "text-slate-400"}`}>
                              {item.count.toLocaleString()}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer info box */}
          <div className="p-3 bg-white border-t border-slate-200/80 flex-shrink-0 text-center text-[11px] text-slate-600 font-medium">
            ตรงตามสเปก <strong className="text-slate-900 font-bold">{filtered.length.toLocaleString()}</strong> จาก {products.length.toLocaleString()} รายการ
          </div>
        </div>
      )}

      {/* ── Column 3: Product Picker List & Search ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white p-5 space-y-3">
        {/* View Mode, Category, Price & Selection Tabs (Header Bar) */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 flex-shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowSpecPanel(!showSpecPanel)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
                showSpecPanel
                  ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                  : "bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100 shadow-2xs"
              }`}
              title="สลับซ่อน/แสดงแผงตัวกรองสเปกละเอียดด้านซ้าย"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>{showSpecPanel ? "ซ่อนสเปก" : "เปิดสเปก"}</span>
            </button>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  viewMode === "all"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>สินค้าตามตัวกรอง ({filtered.length.toLocaleString()})</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("selected")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  viewMode === "selected"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>รายการที่เลือกแล้ว ({selectedProductIds.length.toLocaleString()})</span>
              </button>
            </div>

            {/* Dropdown 1: หมวดหมู่ (ข้าง ๆ ข้างบน) */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-2.5 py-1.5 transition">
              <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                value={selectedMainCat}
                onChange={(e) => {
                  setSelectedMainCat(e.target.value);
                  setSelectedSubCats([]);
                }}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                {MAIN_CATEGORIES.map((cat) => {
                  const count =
                    cat.key === "ALL"
                      ? products.length
                      : products.filter((p) => p.category_id === cat.key).length;
                  return (
                    <option key={cat.key} value={cat.key}>
                      หมวดหมู่: {cat.label} ({count.toLocaleString()})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Dropdown 2: ซัพพลายเออร์ */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-2.5 py-1.5 transition">
              <Store className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <select
                value={selectedSuppliers.length === 1 ? selectedSuppliers[0] : selectedSuppliers.length > 1 ? "__MULTI__" : "ALL"}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "ALL") {
                    setSelectedSuppliers([]);
                  } else if (val !== "__MULTI__") {
                    setSelectedSuppliers([val]);
                  }
                }}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer max-w-[170px] truncate"
              >
                <option value="ALL">ซัพพลายเออร์: ทั้งหมด</option>
                {selectedSuppliers.length > 1 && (
                  <option value="__MULTI__">เลือกแล้ว ({selectedSuppliers.length})</option>
                )}
                {supplierOptions.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name} ({s.count.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            {/* Control 3: กรองราคาเอง (ต่ำสุด - สูงสุด) */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-2.5 py-1 transition">
              <Coins className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-xs font-semibold text-slate-600 mr-0.5">ราคา:</span>
              <input
                type="number"
                placeholder="ต่ำสุด ฿"
                value={minPrice}
                onChange={(e) => {
                  setMinPrice(e.target.value);
                  setPriceFilter("ALL");
                }}
                className="w-16 sm:w-20 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono outline-none focus:border-slate-800"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="number"
                placeholder="สูงสุด ฿"
                value={maxPrice}
                onChange={(e) => {
                  setMaxPrice(e.target.value);
                  setPriceFilter("ALL");
                }}
                className="w-16 sm:w-20 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono outline-none focus:border-slate-800"
              />
              {(minPrice !== "" || maxPrice !== "") && (
                <button
                  type="button"
                  onClick={() => {
                    setMinPrice("");
                    setMaxPrice("");
                  }}
                  className="p-0.5 text-slate-400 hover:text-rose-600 rounded transition"
                  title="ล้างช่วงราคา"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown 4: สถานะสต็อก */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-2.5 py-1.5 transition">
              <Package className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as any)}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="ALL">สต็อก: ทั้งหมด</option>
                <option value="IN_STOCK">สต็อก: มีสต็อกพร้อมขาย (&gt; 0)</option>
                <option value="OUT_OF_STOCK">สต็อก: หมด (0)</option>
                <option value="NEGATIVE">สต็อก: ติดลบ (&lt; 0)</option>
              </select>
            </div>
          </div>

          {selectedProductIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                เลือกสะสมไว้ {selectedProductIds.length} รายการ
              </span>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-semibold text-rose-600 hover:bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 transition"
              >
                ล้างที่เลือกทั้งหมด
              </button>
            </div>
          )}
        </div>

        {/* Top search & batch action bar */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                viewMode === "selected"
                  ? "ค้นหาภายในสินค้าที่เลือกไว้..."
                  : "ค้นหาชื่อสินค้า, SKU, สี, วัสดุ, หมวดย่อย..."
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs font-medium outline-none focus:border-slate-900 focus:bg-white transition"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 flex-shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="default">เรียงลำดับ: ค่าเริ่มต้น (SKU)</option>
              <option value="price_asc">ราคา: ต่ำสุด ไป สูงสุด (มีราคาขึ้นก่อน)</option>
              <option value="price_desc">ราคา: สูงสุด ไป ต่ำสุด</option>
              <option value="stock_desc">สต็อก: มากสุด ไป น้อยสุด</option>
              <option value="stock_asc">สต็อก: น้อยสุด ไป มากสุด</option>
              <option value="name_asc">ชื่อสินค้า: ก-ฮ / A-Z</option>
              <option value="sku_asc">รหัสสินค้า SKU</option>
            </select>
          </div>

          {viewMode === "all" ? (
            <button
              type="button"
              onClick={handleToggleSelectAllFiltered}
              disabled={sortedList.length === 0}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 flex-shrink-0 disabled:opacity-40 ${
                areAllFilteredSelected
                  ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                  : "bg-slate-900 hover:bg-slate-800 text-white"
              }`}
              title={areAllFilteredSelected ? "ยกเลิกเลือกเฉพาะสินค้าในตัวกรองนี้" : "เลือกสินค้าที่กรองอยู่ทั้งหมดเข้าสู่โปรโมชั่น"}
            >
              <Check className="w-3.5 h-3.5" />
              <span>
                {areAllFilteredSelected
                  ? `ยกเลิกที่กรอง (${sortedList.length})`
                  : `เลือกที่กรองทั้งหมด (${sortedList.length})`}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={clearAll}
              disabled={selectedProductIds.length === 0}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition flex items-center gap-1.5 flex-shrink-0 disabled:opacity-40"
            >
              <X className="w-3.5 h-3.5" />
              <span>ล้างรายการทั้งหมด ({selectedProductIds.length})</span>
            </button>
          )}
        </div>

        {/* Selected Items Tray (only shown when in 'all' mode so user can see quick chips) */}
        {viewMode === "all" && selectedProducts.length > 0 && (
          <div className="flex-shrink-0 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-800">
                เลือกไว้ {selectedProducts.length} รายการ
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode("selected")}
                  className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 underline"
                >
                  เปิดดูแบบการ์ด
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 transition"
                >
                  ล้างทั้งหมด
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
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

        {/* Product Cards List (Lazy Loaded Virtual Scroll) */}
        <div
          onScroll={(e) => {
            const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
            if (scrollHeight - scrollTop <= clientHeight + 300) {
              if (displayLimit < activeBaseList.length) {
                setDisplayLimit((prev) => Math.min(prev + 100, activeBaseList.length));
              }
            }
          }}
          className="flex-1 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white min-h-0"
        >
          {activeBaseList.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-600">
                {viewMode === "selected"
                  ? "ยังไม่มีสินค้าที่เลือกไว้ในระบบ"
                  : "ไม่พบสินค้าตรงตามสเปกและตัวกรองที่เลือก"}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {viewMode === "selected"
                  ? "สามารถสลับไปที่แท็บ 'สินค้าตามตัวกรอง' เพื่อเลือกสินค้าได้เลย"
                  : "ลองปรับขนาด สี หรือหมวดหมู่ในแผงตัวกรองด้านซ้าย"}
              </p>
              {viewMode === "selected" ? (
                <button
                  type="button"
                  onClick={() => setViewMode("all")}
                  className="mt-3 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
                >
                  ไปเลือกสินค้าตามตัวกรอง
                </button>
              ) : hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-3 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              ) : null}
            </div>
          ) : (
            <>
              {displayedList.map((p) => {
                const isSel = selectedProductIds.includes(String(p.id));
                const imgUrl = getImageUrl(p.image_url);
                const dims = formatDimensions(p);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(String(p.id))}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition select-none ${
                      isSel
                        ? "bg-slate-900/5 hover:bg-slate-900/10"
                        : "hover:bg-slate-50/80"
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition ${
                        isSel
                          ? "bg-slate-900 text-white"
                          : "border border-slate-300 bg-white hover:border-slate-400"
                      }`}
                    >
                      {isSel && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>

                    {/* Image */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-50 flex items-center justify-center">
                      {imgUrl ? (
                        <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-4 h-4 text-slate-300" />
                      )}
                    </div>

                    {/* Main Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-xs font-bold truncate ${
                            isSel ? "text-slate-900" : "text-slate-700"
                          }`}
                        >
                          {p.name || "—"}
                        </p>
                        {p.sub_category && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600 font-medium shrink-0">
                            {p.sub_category}
                          </span>
                        )}
                      </div>

                      {/* Specs badges line */}
                      <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px]">
                        <span className="text-slate-400 font-mono">{p.sku}</span>
                        {(p.supplier || p.specs?.brand || p.specs?.supplier || p.specs?.factory || p.factory_name) && (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-medium inline-flex items-center gap-1">
                            <Store className="w-2.5 h-2.5" />
                            {p.supplier || p.specs?.brand || p.specs?.supplier || p.specs?.factory || p.factory_name}
                          </span>
                        )}
                        {p.color && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-medium inline-flex items-center gap-1">
                            {COLOR_PRESENTATION[p.color.toLowerCase()]?.swatch && (
                              <span
                                className="w-2 h-2 rounded-full border border-slate-300 shrink-0"
                                style={{ backgroundColor: COLOR_PRESENTATION[p.color.toLowerCase()].swatch }}
                              />
                            )}
                            สี: {p.color}
                          </span>
                        )}
                        {p.material && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-medium">
                            วัสดุ: {p.material}
                          </span>
                        )}
                        {(() => {
                          const activePromos = productPromoMap.get(String(p.id));
                          if (!activePromos || activePromos.length === 0) return null;
                          return (
                            <span
                              title={activePromos
                                .map(
                                  (pr) =>
                                    `${pr.name} (${
                                      pr.discount_type === "PERCENT" ? `${pr.value}%` : `${pr.value}฿`
                                    })`
                                )
                                .join(", ")}
                              className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold inline-flex items-center gap-1 text-[10px]"
                            >
                              <Tag className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                              <span>
                                มีโปร:{" "}
                                {activePromos
                                  .map(
                                    (pr) =>
                                      pr.name ||
                                      (pr.discount_type === "PERCENT" ? `${pr.value}%` : `${pr.value}฿`)
                                  )
                                  .join(", ")}
                              </span>
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Price & Stock Display Badge */}
                    <div className="shrink-0 text-right space-y-1">
                      {p.price > 0 ? (
                        <div className="text-xs font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {Number(p.price).toLocaleString()} ฿
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
                          ไม่ระบุราคา
                        </div>
                      )}
                      <div>{renderStockBadge(p)}</div>
                    </div>
                  </button>
                );
              })}

              {displayLimit < activeBaseList.length && (
                <div className="p-3 text-center text-xs text-slate-400 bg-slate-50/50">
                  แสดงแล้ว {displayLimit} จาก {activeBaseList.length} รายการ (เลื่อนลงเพื่อดูเพิ่ม)
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Status Bar */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 flex-shrink-0 pt-0.5">
          <span>
            {viewMode === "selected" ? "สินค้าที่เลือกไว้" : "กรองพบ"}{" "}
            <strong className="text-slate-700">{activeBaseList.length.toLocaleString()}</strong> จาก{" "}
            {products.length.toLocaleString()} รายการ
          </span>
          {selectedProductIds.length > 0 ? (
            <span className="font-semibold text-slate-700">
              เลือกไว้ {selectedProductIds.length} รายการ
            </span>
          ) : (
            <span className="text-slate-400 italic">ไม่เลือก = ใช้ได้กับทุกสินค้าในระบบ</span>
          )}
        </div>
      </div>
    </>
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

  // LocalStorage keys สำหรับจำร่างการเลือกสินค้าข้ามหน้า/แท็บ/ปิดเปิด modal
  const POS_DRAFT_PRODUCTS_KEY = "wc_pos_discount_draft_selected_product_ids";
  const POS_DRAFT_BRANCH_KEY = "wc_pos_discount_draft_branch_id";

  // State: POS
  const [posDiscounts, setPosDiscounts] = useState<any[]>(initialPosDiscounts);
  const [posSearch, setPosSearch] = useState("");
  const [posFilterStatus, setPosFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [isPosCreateOpen, setIsPosCreateOpen] = useState(false);
  const [isPosEditOpen, setIsPosEditOpen] = useState(false);
  const [editingPosDiscount, setEditingPosDiscount] = useState<any | null>(null);
  const [posCreateDiscountType, setPosCreateDiscountType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [posEditDiscountType, setPosEditDiscountType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [posSelectedProductIds, setPosSelectedProductIds] = useState<string[]>([]);
  const [posCreateBranchId, setPosCreateBranchId] = useState<string>("");
  const [removingRuleId, setRemovingRuleId] = useState<number | null>(null);

  // Persistent Draft: กู้คืนรายการสินค้าและสาขาที่เลือกค้างไว้จาก localStorage เมื่อโหลดหน้า
  useEffect(() => {
    try {
      const saved = localStorage.getItem(POS_DRAFT_PRODUCTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPosSelectedProductIds(parsed);
        }
      }
      const savedBranch = localStorage.getItem(POS_DRAFT_BRANCH_KEY);
      if (savedBranch) {
        setPosCreateBranchId(savedBranch);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleUpdatePosSelectedProductIds = (ids: string[]) => {
    setPosSelectedProductIds(ids);
    try {
      if (ids.length > 0) {
        localStorage.setItem(POS_DRAFT_PRODUCTS_KEY, JSON.stringify(ids));
      } else {
        localStorage.removeItem(POS_DRAFT_PRODUCTS_KEY);
      }
    } catch {
      // ignore
    }
  };

  const handleClearPosDraftSelection = () => {
    setPosSelectedProductIds([]);
    try {
      localStorage.removeItem(POS_DRAFT_PRODUCTS_KEY);
    } catch {
      // ignore
    }
  };

  const handleUpdatePosCreateBranchId = (branchId: string) => {
    setPosCreateBranchId(branchId);
    try {
      if (branchId) {
        localStorage.setItem(POS_DRAFT_BRANCH_KEY, branchId);
      } else {
        localStorage.removeItem(POS_DRAFT_BRANCH_KEY);
      }
    } catch {
      // ignore
    }
  };

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
  const [terraFormIsTopUp, setTerraFormIsTopUp] = useState<boolean>(false);
  const [terraCollectionSearch, setTerraCollectionSearch] = useState("");
  const [terraCategoryFilter, setTerraCategoryFilter] = useState<string>("all");
  const [formInlineError, setFormInlineError] = useState<string | null>(null);

  // ── Batch Partner Coupon Generator State ────────────────────────────────────
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingPartnerCoupon, setEditingPartnerCoupon] = useState<TerraPromotion | null>(null);
  const [batchSingleCode, setBatchSingleCode] = useState<string>("");
  const [batchUpdateEntireBatch, setBatchUpdateEntireBatch] = useState<boolean>(false);
  const [batchLeadSales, setBatchLeadSales] = useState("ยันได");
  const [batchPartnerCompany, setBatchPartnerCompany] = useState("");
  const [batchPartnerSales, setBatchPartnerSales] = useState("");
  const [batchNote, setBatchNote] = useState("");
  const [batchCount, setBatchCount] = useState<number>(10);
  const [batchPattern, setBatchPattern] = useState("YD-AA-####");
  const [batchTitlePrefix, setBatchTitlePrefix] = useState("");
  const [batchDiscountType, setBatchDiscountType] = useState<"percentage" | "fixed_amount">("percentage");
  const [batchDiscountValue, setBatchDiscountValue] = useState<number>(10);
  const [batchMinSpend, setBatchMinSpend] = useState<string>("");
  const [batchMaxDiscount, setBatchMaxDiscount] = useState<string>("");
  const [batchStartDate, setBatchStartDate] = useState<string>("");
  const [batchEndDate, setBatchEndDate] = useState<string>("");
  const [batchUsageLimit, setBatchUsageLimit] = useState<number>(1);
  const [batchIsTopUp, setBatchIsTopUp] = useState<boolean>(false);
  const [batchInlineError, setBatchInlineError] = useState<string | null>(null);
  const [batchCopiedIndex, setBatchCopiedIndex] = useState<number | null>(null);

  // Tiered step discount state
  const [batchIsTiered, setBatchIsTiered] = useState(false);
  const [batchTiers, setBatchTiers] = useState<Array<{
    id: string;
    min_spend: string;
    discount_type: "percentage" | "fixed_amount";
    discount_value: string;
  }>>([
    { id: "1", min_spend: "20000", discount_type: "percentage", discount_value: "5" },
    { id: "2", min_spend: "30000", discount_type: "percentage", discount_value: "10" },
  ]);
  const [batchCreatedResult, setBatchCreatedResult] = useState<{
    batchId: string;
    codes: string[];
    leadSales: string;
    partnerCompany: string;
    partnerSales: string;
    note?: string;
    discountSummary: string;
    expiresSummary: string;
  } | null>(null);

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
        try {
          localStorage.removeItem(POS_DRAFT_PRODUCTS_KEY);
          localStorage.removeItem(POS_DRAFT_BRANCH_KEY);
        } catch {
          // ignore
        }
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
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.attribution?.lead_sales && p.attribution.lead_sales.toLowerCase().includes(q)) ||
        (p.attribution?.partner_company && p.attribution.partner_company.toLowerCase().includes(q)) ||
        (p.attribution?.partner_sales && p.attribution.partner_sales.toLowerCase().includes(q));

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
    setTerraFormIsTopUp(false);
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

    let editIsTopUp = Boolean(p.is_top_up || p.attribution?.is_top_up);
    let displayDesc = p.description || "";
    if (displayDesc.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(displayDesc);
        if (parsed.is_top_up !== undefined) editIsTopUp = Boolean(parsed.is_top_up);
        if (parsed.note !== undefined) displayDesc = parsed.note;
      } catch {}
    }
    setTerraFormIsTopUp(editIsTopUp);
    setTerraFormDescription(displayDesc);

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
          is_top_up: terraFormPromoScope === "global" ? terraFormIsTopUp : false,
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
          is_top_up: terraFormPromoScope === "global" ? terraFormIsTopUp : false,
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

  // ── Batch Partner Coupon Actions & Live Preview ────────────────────────────
  const samplePreviewCode = useMemo(() => {
    const p = (batchPattern || "YD-AA-####").trim().toUpperCase();
    if (p.includes("#") || p.includes("*")) {
      let counter = 1;
      return p.replace(/[#*]/g, (ch) => {
        if (ch === "#") return String((counter++ * 3 + 2) % 10);
        return String.fromCharCode(65 + ((counter++ * 4) % 26));
      });
    }
    const sep = p.endsWith("-") ? "" : "-";
    return `${p}${sep}6351`;
  }, [batchPattern]);

  const handleExecuteCreateBatch = () => {
    setBatchInlineError(null);
    if (!batchLeadSales.trim()) {
      setBatchInlineError("กรุณาระบุชื่อเซลล์คนแรก (เช่น ยันได)");
      return;
    }
    if (!batchPattern.trim()) {
      setBatchInlineError("กรุณาระบุรูปแบบรหัส (เช่น YD-AA-####)");
      return;
    }

    let validTiers: Array<{ min_spend: number; discount_type: "percentage" | "fixed_amount"; discount_value: number }> = [];
    if (batchIsTiered) {
      validTiers = batchTiers
        .map(t => ({
          min_spend: Number(t.min_spend) || 0,
          discount_type: t.discount_type || "percentage",
          discount_value: Number(t.discount_value) || 0,
        }))
        .filter(t => t.min_spend > 0 && t.discount_value > 0)
        .sort((a, b) => a.min_spend - b.min_spend);

      if (validTiers.length < 1) {
        setBatchInlineError("กรุณาระบุขั้นบันไดอย่างน้อย 1 ขั้น (ต้องมียอดซื้อและส่วนลดมากกว่า 0)");
        return;
      }
    } else {
      if (batchDiscountValue <= 0) {
        setBatchInlineError("มูลค่าส่วนลดต้องมากกว่า 0");
        return;
      }
    }

    startTransition(async () => {
      const res = await createBatchPartnerCoupons({
        lead_sales: batchLeadSales,
        partner_company: batchPartnerCompany,
        partner_sales: batchPartnerSales,
        note: batchNote,
        count: Math.max(1, Math.min(100, Number(batchCount) || 1)),
        pattern: batchPattern,
        title_prefix: batchTitlePrefix.trim() || undefined,
        discount_type: batchIsTiered ? validTiers[0].discount_type : batchDiscountType,
        discount_value: batchIsTiered ? validTiers[0].discount_value : batchDiscountValue,
        min_spend: batchIsTiered ? validTiers[0].min_spend : (batchMinSpend ? Number(batchMinSpend) : 0),
        max_discount_amount: batchMaxDiscount ? Number(batchMaxDiscount) : null,
        start_date: batchStartDate ? new Date(batchStartDate).toISOString() : null,
        end_date: batchEndDate ? new Date(batchEndDate).toISOString() : null,
        usage_limit: batchUsageLimit,
        is_tiered: batchIsTiered,
        tiers: batchIsTiered ? validTiers : undefined,
        is_top_up: batchIsTopUp,
      });

      if (!res.success || !res.codes) {
        setBatchInlineError(res.error || "เกิดข้อผิดพลาดในการสร้างรหัสส่วนลด");
        triggerToast("error", "เกิดข้อผิดพลาด", res.error || "ไม่สามารถสร้างชุดรหัสได้");
        return;
      }

      const discountSummary = batchIsTiered
        ? `ขั้นบันได: ` + validTiers.map(t => `ซื้อครบ ฿${Number(t.min_spend).toLocaleString()} ลด ${t.discount_type === "percentage" ? `${t.discount_value}%` : `฿${Number(t.discount_value).toLocaleString()}`}`).join(" | ") + (batchMaxDiscount ? ` (ลดสูงสุด ฿${Number(batchMaxDiscount).toLocaleString()})` : "")
        : batchDiscountType === "percentage"
          ? `${batchDiscountValue}% (ลดสูงสุด ${batchMaxDiscount ? `฿${Number(batchMaxDiscount).toLocaleString()}` : "ไม่จำกัด"})`
          : `฿${Number(batchDiscountValue).toLocaleString()}`;

      const expiresSummary = batchEndDate
        ? new Date(batchEndDate).toLocaleDateString("th-TH")
        : "ไม่มีกำหนดหมดอายุ";

      setBatchCreatedResult({
        batchId: res.batchId || "BATCH",
        codes: res.codes,
        leadSales: batchLeadSales.trim(),
        partnerCompany: batchPartnerCompany.trim(),
        partnerSales: batchPartnerSales.trim(),
        note: batchNote.trim(),
        discountSummary,
        expiresSummary,
      });

      const updated = await getTerraPromotions();
      setTerraPromotions(updated);
      triggerToast("success", "สร้างรหัสสำเร็จ!", `สร้างรหัสส่วนลด ${res.codes.length} โค้ดเรียบร้อยแล้ว`);
    });
  };

  const handleCopyAllBatchCodes = () => {
    if (!batchCreatedResult) return;
    const headerTitle = batchCreatedResult.partnerCompany
      ? `รหัสส่วนลดพิเศษสำหรับ ${batchCreatedResult.partnerCompany}`
      : `รหัสส่วนลดพิเศษ`;
    const lines = [
      headerTitle,
      `เซลล์ผู้ดูแล: ${batchCreatedResult.leadSales}`,
      batchCreatedResult.partnerSales ? `ผู้ติดต่อ: ${batchCreatedResult.partnerSales}` : "",
      `ส่วนลด: ${batchCreatedResult.discountSummary}`,
      `หมดอายุ: ${batchCreatedResult.expiresSummary}`,
      batchCreatedResult.note ? `หมายเหตุ: ${batchCreatedResult.note}` : "",
      "----------------------------------------",
      "รหัสคูปอง (สิทธิ์ละ 1 ครั้ง):",
      ...batchCreatedResult.codes.map((code, idx) => `${idx + 1}. ${code}`),
      "----------------------------------------",
      "นำรหัสไปใช้ที่จุดขาย (POS) หรือทางแชทสั่งซื้อสินค้าได้ทันที",
    ].filter(Boolean).join("\n");

    navigator.clipboard.writeText(lines);
    triggerToast("success", "คัดลอกทั้งหมดแล้ว", "คัดลอกข้อความพร้อมรหัสทั้งหมดสำหรับส่ง LINE เรียบร้อยแล้ว");
  };

  const handleOpenCreateBatchModal = () => {
    setEditingPartnerCoupon(null);
    setBatchCreatedResult(null);
    setBatchInlineError(null);
    setBatchLeadSales("ยันได");
    setBatchPartnerCompany("");
    setBatchPartnerSales("");
    setBatchNote("");
    setBatchCount(10);
    setBatchPattern("YD-AA-####");
    setBatchTitlePrefix("");
    setBatchSingleCode("");
    setBatchDiscountType("percentage");
    setBatchDiscountValue(10);
    setBatchMinSpend("");
    setBatchMaxDiscount("");
    setBatchStartDate("");
    setBatchEndDate("");
    setBatchUsageLimit(1);
    setBatchIsTopUp(false);
    setBatchIsTiered(false);
    setBatchUpdateEntireBatch(false);
    setBatchTiers([
      { id: "1", min_spend: "20000", discount_type: "percentage", discount_value: "5" },
      { id: "2", min_spend: "30000", discount_type: "percentage", discount_value: "10" },
    ]);
    setIsBatchModalOpen(true);
  };

  const handleOpenEditPartnerModal = (promo: TerraPromotion) => {
    setEditingPartnerCoupon(promo);
    setBatchCreatedResult(null);
    setBatchInlineError(null);
    setBatchLeadSales(promo.attribution?.lead_sales || "");
    setBatchPartnerCompany(promo.attribution?.partner_company || "");
    setBatchPartnerSales(promo.attribution?.partner_sales || "");
    setBatchNote(promo.attribution?.note || "");
    setBatchTitlePrefix(promo.title || "");
    setBatchSingleCode(promo.coupon_code || "");
    setBatchDiscountType(promo.discount_type || "percentage");
    setBatchDiscountValue(promo.discount_value || 10);
    setBatchMinSpend(promo.min_spend ? String(promo.min_spend) : "");
    setBatchMaxDiscount(promo.max_discount_amount ? String(promo.max_discount_amount) : "");
    setBatchStartDate(promo.start_date ? promo.start_date.slice(0, 16) : "");
    setBatchEndDate(promo.end_date ? promo.end_date.slice(0, 16) : "");
    setBatchUsageLimit(promo.usage_limit || 1);
    setBatchIsTopUp(Boolean(promo.is_top_up || promo.attribution?.is_top_up));
    setBatchUpdateEntireBatch(false);

    if (promo.is_tiered && promo.tiers && promo.tiers.length > 0) {
      setBatchIsTiered(true);
      setBatchTiers(
        promo.tiers.map((t, idx) => ({
          id: String(idx + 1),
          min_spend: String(t.min_spend),
          discount_type: t.discount_type,
          discount_value: String(t.discount_value),
        }))
      );
    } else {
      setBatchIsTiered(false);
    }

    setIsBatchModalOpen(true);
  };

  const handleExecuteUpdatePartner = () => {
    if (!editingPartnerCoupon) return;
    setBatchInlineError(null);
    if (!batchLeadSales.trim()) {
      setBatchInlineError("กรุณาระบุชื่อเซลล์คนแรก (เช่น ยันได)");
      return;
    }
    if (!batchSingleCode.trim()) {
      setBatchInlineError("กรุณาระบุรหัสคูปอง (Coupon Code)");
      return;
    }

    let validTiers: Array<{ min_spend: number; discount_type: "percentage" | "fixed_amount"; discount_value: number }> = [];
    if (batchIsTiered) {
      validTiers = batchTiers
        .map(t => ({
          min_spend: Number(t.min_spend) || 0,
          discount_type: t.discount_type || "percentage",
          discount_value: Number(t.discount_value) || 0,
        }))
        .filter(t => t.min_spend > 0 && t.discount_value > 0)
        .sort((a, b) => a.min_spend - b.min_spend);

      if (validTiers.length < 1) {
        setBatchInlineError("กรุณาระบุขั้นบันไดอย่างน้อย 1 ขั้น (ต้องมียอดซื้อและส่วนลดมากกว่า 0)");
        return;
      }
    } else {
      if (batchDiscountValue <= 0) {
        setBatchInlineError("มูลค่าส่วนลดต้องมากกว่า 0");
        return;
      }
    }

    startTransition(async () => {
      const res = await updatePartnerCoupon({
        id: editingPartnerCoupon.id,
        lead_sales: batchLeadSales,
        partner_company: batchPartnerCompany,
        partner_sales: batchPartnerSales,
        note: batchNote,
        coupon_code: batchSingleCode,
        title: batchTitlePrefix.trim() || undefined,
        discount_type: batchIsTiered ? validTiers[0].discount_type : batchDiscountType,
        discount_value: batchIsTiered ? validTiers[0].discount_value : batchDiscountValue,
        min_spend: batchIsTiered ? validTiers[0].min_spend : (batchMinSpend ? Number(batchMinSpend) : 0),
        max_discount_amount: batchMaxDiscount ? Number(batchMaxDiscount) : null,
        start_date: batchStartDate ? new Date(batchStartDate).toISOString() : null,
        end_date: batchEndDate ? new Date(batchEndDate).toISOString() : null,
        usage_limit: batchUsageLimit,
        is_tiered: batchIsTiered,
        tiers: batchIsTiered ? validTiers : undefined,
        is_top_up: batchIsTopUp,
        update_entire_batch: batchUpdateEntireBatch,
      });

      if (!res.success) {
        setBatchInlineError(res.error || "เกิดข้อผิดพลาดในการแก้ไขรหัสส่วนลด");
        triggerToast("error", "เกิดข้อผิดพลาด", res.error || "ไม่สามารถแก้ไขรหัสได้");
        return;
      }

      setIsBatchModalOpen(false);
      setEditingPartnerCoupon(null);
      const updated = await getTerraPromotions();
      setTerraPromotions(updated);
      triggerToast("success", "บันทึกสำเร็จ!", "แก้ไขข้อมูลโค้ดส่วนลดเซลล์และพันธมิตรเรียบร้อยแล้ว");
    });
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
                  setPosCreateDiscountType("PERCENT");
                  setFormInlineError(null);
                  setIsPosCreateOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 active:scale-95 transition shadow-xs"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>สร้างส่วนลด POS</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenCreateBatchModal}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition shadow-2xs cursor-pointer"
                >
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>สร้างโค้ดเซลล์ / พันธมิตร (Batch)</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenCreateTerraModal}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 active:scale-95 transition shadow-xs"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>สร้างโปรโมชัน Prop</span>
                </button>
              </div>
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
                          {item.max_discount && Number(item.max_discount) > 0 && (
                            <p className="text-[10px] text-indigo-600 font-semibold mt-1">
                              สูงสุด ฿{Number(item.max_discount).toLocaleString()}
                            </p>
                          )}
                          {(item.start_date || item.end_date) && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {item.start_date ? new Date(item.start_date).toLocaleDateString("th-TH") : "ทันที"}
                              {" - "}
                              {item.end_date ? new Date(item.end_date).toLocaleDateString("th-TH") : "ไม่จำกัด"}
                            </p>
                          )}
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
                                setPosEditDiscountType(item.discount_type === "FIXED" ? "FIXED" : "PERCENT");
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
                const isTopUpPromo = Boolean(promo.is_top_up || promo.attribution?.is_top_up);

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

                          {isTopUpPromo && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900 border border-amber-300">
                              <Zap className="w-3 h-3 text-amber-700" />
                              <span>TOP-UP</span>
                            </span>
                          )}

                          {promo.is_tiered && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200">
                              ขั้นบันได
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

                          {promo.is_tiered && promo.tiers && promo.tiers.length > 0 ? (
                            <div className="mt-1.5 space-y-1">
                              <div className="flex items-center gap-1 flex-wrap">
                                {promo.tiers.map((t, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[10px] font-medium"
                                  >
                                    ≥฿{Number(t.min_spend).toLocaleString()}: {t.discount_type === "percentage" ? `${t.discount_value}%` : `฿${Number(t.discount_value).toLocaleString()}`}
                                  </span>
                                ))}
                              </div>
                              {promo.max_discount_amount && (
                                <span className="text-[10px] text-slate-400 font-medium block">
                                  (ลดสูงสุด ฿{Number(promo.max_discount_amount).toLocaleString()})
                                </span>
                              )}
                            </div>
                          ) : (
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
                          )}
                        </div>
                      </div>

                      {/* Attribution Badges & Top-Up Badges */}
                      {(promo.attribution || isTopUpPromo) && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 px-1">
                          {isTopUpPromo && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase tracking-wider">
                              <Zap className="w-3 h-3 text-amber-700" />
                              <span>TOP-UP (ลด On-top)</span>
                            </span>
                          )}
                          {promo.attribution && (
                            <>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                                <User className="w-3 h-3" />
                                <span>เซลล์: {promo.attribution.lead_sales}</span>
                              </span>
                              {promo.attribution.partner_company && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                                  <Building2 className="w-3 h-3" />
                                  <span>บริษัท: {promo.attribution.partner_company}</span>
                                </span>
                              )}
                              {promo.attribution.partner_sales && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                  <Users className="w-3 h-3" />
                                  <span>เซลล์คู่ค้า: {promo.attribution.partner_sales}</span>
                                </span>
                              )}
                              {promo.attribution.note && (
                                <span className="text-[10px] text-slate-500 italic block w-full mt-0.5">
                                  โน้ต: {promo.attribution.note}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {/* Description if any and no attribution */}
                      {!promo.attribution && promo.description && (
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
                          onClick={() => {
                            if (promo.attribution || promo.is_tiered) {
                              handleOpenEditPartnerModal(promo);
                            } else {
                              handleOpenEditTerraModal(promo);
                            }
                          }}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1440px] h-[92vh] flex flex-col overflow-hidden border border-slate-200">
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
              {/* Left Column: Promotion Settings */}
              <div className="w-72 sm:w-80 flex-shrink-0 border-r border-slate-100 flex flex-col bg-white">
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        ประเภท & มูลค่าส่วนลด <span className="text-rose-500">*</span>
                      </label>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        posCreateDiscountType === "PERCENT"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}>
                        หน่วย: {posCreateDiscountType === "PERCENT" ? "เปอร์เซ็นต์ (%)" : "จำนวนเงิน (฿ บาท)"}
                      </span>
                    </div>

                    {/* Attached Input Group: Dropdown ต่อท้ายด้วย ช่องกรอกมูลค่า */}
                    <div className="flex rounded-lg border border-slate-200 bg-slate-50 focus-within:border-slate-900 focus-within:bg-white focus-within:ring-1 focus-within:ring-slate-900 transition overflow-hidden">
                      {/* ประเภทส่วนลด */}
                      <div className="w-[45%] shrink-0 border-r border-slate-200 bg-slate-100/70">
                        <select
                          name="discount_type"
                          value={posCreateDiscountType}
                          onChange={(e) => setPosCreateDiscountType(e.target.value as "PERCENT" | "FIXED")}
                          className="w-full h-full bg-transparent px-2.5 py-2 text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                        >
                          <option value="PERCENT">% เปอร์เซ็นต์</option>
                          <option value="FIXED">฿ จำนวนเงิน</option>
                        </select>
                      </div>

                      {/* ช่องกรอกมูลค่า ต่อท้ายกัน */}
                      <div className="relative flex-1 flex items-center">
                        <input
                          name="value"
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          placeholder={posCreateDiscountType === "PERCENT" ? "กรอก % เช่น 10" : "กรอกเงิน เช่น 100"}
                          className="w-full bg-transparent pl-3 pr-12 py-2 text-xs font-mono font-bold text-slate-900 outline-none placeholder:text-slate-400 placeholder:font-normal"
                        />
                        <span className={`absolute right-2 text-[11px] font-bold font-mono px-1.5 py-0.5 rounded ${
                          posCreateDiscountType === "PERCENT"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {posCreateDiscountType === "PERCENT" ? "%" : "บาท"}
                        </span>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                      <span>💡</span>
                      {posCreateDiscountType === "PERCENT" ? (
                        <span>หน่วยเป็น <strong>เปอร์เซ็นต์ (%)</strong> เช่น 10 คือลด 10% ของราคา</span>
                      ) : (
                        <span>หน่วยเป็น <strong>จำนวนเงิน (บาท)</strong> เช่น 100 คือลดทันที 100 บาท</span>
                      )}
                    </p>
                  </div>

                  {posCreateDiscountType === "PERCENT" ? (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          ส่วนลดสูงสุด (บาท)
                        </label>
                        <span className="text-[10px] text-slate-400">ถ้ามี / เว้นว่างหากไม่จำกัด</span>
                      </div>
                      <div className="relative">
                        <input
                          name="max_discount"
                          type="number"
                          step="1"
                          min="0"
                          placeholder="เช่น 500 (เว้นว่าง = ไม่จำกัด)"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-12 py-2 text-xs font-mono outline-none focus:border-slate-900 focus:bg-white transition"
                        />
                        <span className="absolute right-3 top-2 text-xs font-medium text-slate-400">บาท</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        * ใช้จำกัดเพดานยอดลด เช่น ลด 20% สูงสุดไม่เกิน 500 บาท
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-slate-50 border border-dashed border-slate-200 p-2 text-[10px] text-slate-500 flex items-center gap-1.5">
                      <input type="hidden" name="max_discount" value="" />
                      <span>ℹ️</span>
                      <span>ส่วนลดแบบจำนวนเงิน (บาท) จะลดตรงตามมูลค่า ไม่จำเป็นต้องระบุส่วนลดสูงสุด</span>
                    </div>
                  )}

                  {/* วันเริ่มต้น และ วันสิ้นสุด */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        วันเริ่มต้น <span className="text-slate-400 font-normal">(ถ้ามี)</span>
                      </label>
                      <input
                        name="start_date"
                        type="date"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-slate-900 focus:bg-white transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        วันสิ้นสุด <span className="text-slate-400 font-normal">(ถ้ามี)</span>
                      </label>
                      <input
                        name="end_date"
                        type="date"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-slate-900 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  {branches.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ใช้กับสาขา</label>
                      <select
                        name="branch_id"
                        value={posCreateBranchId}
                        onChange={(e) => handleUpdatePosCreateBranchId(e.target.value)}
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

                  {/* สรุปสถานะการเลือกสินค้า */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold text-slate-700">การครอบคลุมสินค้า</p>
                      {posSelectedProductIds.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearPosDraftSelection}
                          className="text-[10px] text-rose-600 hover:text-rose-700 hover:underline font-semibold"
                        >
                          ล้างรายการที่เลือก
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {posSelectedProductIds.length > 0 ? (
                        <span className="font-semibold text-emerald-700">
                          เจาะจง {posSelectedProductIds.length.toLocaleString()} รายการ
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">
                          ใช้ได้กับทุกสินค้าในระบบ (ไม่ได้ระบุเฉพาะ)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="px-5 py-4 border-t border-slate-100 flex gap-2 flex-shrink-0 bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPosCreateOpen(false);
                    }}
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

              {/* Middle (Spec Filters) + Right (Product Selection) Columns */}
              <ProductPicker
                products={products}
                selectedProductIds={posSelectedProductIds}
                onSelectionChange={handleUpdatePosSelectedProductIds}
                selectedBranchId={posCreateBranchId}
                existingDiscounts={posDiscounts}
              />
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

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      ประเภท & มูลค่าส่วนลด <span className="text-rose-500">*</span>
                    </label>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      posEditDiscountType === "PERCENT"
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}>
                      หน่วย: {posEditDiscountType === "PERCENT" ? "เปอร์เซ็นต์ (%)" : "จำนวนเงิน (฿ บาท)"}
                    </span>
                  </div>

                  {/* Attached Input Group: Dropdown ต่อท้ายด้วย ช่องกรอกมูลค่า */}
                  <div className="flex rounded-lg border border-slate-200 bg-slate-50 focus-within:border-slate-900 focus-within:bg-white focus-within:ring-1 focus-within:ring-slate-900 transition overflow-hidden">
                    {/* ประเภทส่วนลด */}
                    <div className="w-[45%] shrink-0 border-r border-slate-200 bg-slate-100/70">
                      <select
                        name="discount_type"
                        value={posEditDiscountType}
                        onChange={(e) => setPosEditDiscountType(e.target.value as "PERCENT" | "FIXED")}
                        className="w-full h-full bg-transparent px-2.5 py-2 text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                      >
                        <option value="PERCENT">% เปอร์เซ็นต์</option>
                        <option value="FIXED">฿ จำนวนเงิน</option>
                      </select>
                    </div>

                    {/* ช่องกรอกมูลค่า ต่อท้ายกัน */}
                    <div className="relative flex-1 flex items-center">
                      <input
                        name="value"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={editingPosDiscount.value}
                        required
                        placeholder={posEditDiscountType === "PERCENT" ? "กรอก % เช่น 10" : "กรอกเงิน เช่น 100"}
                        className="w-full bg-transparent pl-3 pr-12 py-2 text-xs font-mono font-bold text-slate-900 outline-none placeholder:text-slate-400 placeholder:font-normal"
                      />
                      <span className={`absolute right-2 text-[11px] font-bold font-mono px-1.5 py-0.5 rounded ${
                        posEditDiscountType === "PERCENT"
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {posEditDiscountType === "PERCENT" ? "%" : "บาท"}
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                    <span>💡</span>
                    {posEditDiscountType === "PERCENT" ? (
                      <span>หน่วยเป็น <strong>เปอร์เซ็นต์ (%)</strong> เช่น 10 คือลด 10% ของราคา</span>
                    ) : (
                      <span>หน่วยเป็น <strong>จำนวนเงิน (บาท)</strong> เช่น 100 คือลดทันที 100 บาท</span>
                    )}
                  </p>
                </div>

                {posEditDiscountType === "PERCENT" ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        ส่วนลดสูงสุด (บาท)
                      </label>
                      <span className="text-[10px] text-slate-400">ถ้ามี / เว้นว่างหากไม่จำกัด</span>
                    </div>
                    <div className="relative">
                      <input
                        name="max_discount"
                        type="number"
                        step="1"
                        min="0"
                        defaultValue={editingPosDiscount.max_discount ?? ""}
                        placeholder="เช่น 500 (เว้นว่าง = ไม่จำกัด)"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-12 py-2 text-xs font-mono outline-none focus:border-slate-900 focus:bg-white transition"
                      />
                      <span className="absolute right-3 top-2 text-xs font-medium text-slate-400">บาท</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      * ใช้จำกัดเพดานยอดลด เช่น ลด 20% สูงสุดไม่เกิน 500 บาท
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg bg-slate-50 border border-dashed border-slate-200 p-2 text-[10px] text-slate-500 flex items-center gap-1.5">
                    <input type="hidden" name="max_discount" value="" />
                    <span>ℹ️</span>
                    <span>ส่วนลดแบบจำนวนเงิน (บาท) จะลดตรงตามมูลค่า ไม่จำเป็นต้องระบุส่วนลดสูงสุด</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      วันเริ่มต้น <span className="text-slate-400 font-normal">(ถ้ามี)</span>
                    </label>
                    <input
                      name="start_date"
                      type="date"
                      defaultValue={editingPosDiscount.start_date ? editingPosDiscount.start_date.substring(0, 10) : ""}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-slate-900 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      วันสิ้นสุด <span className="text-slate-400 font-normal">(ถ้ามี)</span>
                    </label>
                    <input
                      name="end_date"
                      type="date"
                      defaultValue={editingPosDiscount.end_date ? editingPosDiscount.end_date.substring(0, 10) : ""}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-slate-900 transition"
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
                      <span className="text-xs font-bold">โปรโมชันเซ็ต (ลดอัตโนมัติ)</span>
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
                      <span className="text-xs font-bold">คูปองส่วนลดทั้งร้าน (Global)</span>
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

                  {terraFormPromoScope === "global" && (
                    <div className="sm:col-span-2 pt-1">
                      <label className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-200 bg-amber-50/60 cursor-pointer hover:bg-amber-50 transition">
                        <input
                          type="checkbox"
                          checked={terraFormIsTopUp}
                          onChange={(e) => setTerraFormIsTopUp(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300 mt-0.5"
                        />
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
                              <Zap className="w-3.5 h-3.5 text-amber-700" />
                              <span>ส่วนลดแบบ Top-up (ลด On-top ร่วมกับสินค้าที่มีส่วนลดแล้วได้)</span>
                            </span>
                            <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded">TOP-UP</span>
                          </div>
                          <p className="text-[11px] text-amber-800/80 mt-0.5 leading-relaxed">
                            เปิดใช้งานเพื่อให้โค้ดนี้สามารถใช้ร่วมกับสินค้าที่ลดราคาอยู่แล้ว 50% ได้ โดยระบบจะคำนวณส่วนลด On-top เพิ่มเติมจากราคาที่ลดแล้ว
                          </p>
                        </div>
                      </label>
                    </div>
                  )}
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
      {/* MODAL 3: BATCH PARTNER COUPON GENERATOR MODAL                         */}
      {/* ===================================================================== */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-[99980] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-white">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                  {editingPartnerCoupon ? (
                    <Edit2 className="h-4.5 w-4.5 text-slate-700" />
                  ) : (
                    <Ticket className="h-4.5 w-4.5 text-slate-700" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingPartnerCoupon
                      ? "แก้ไขโค้ดส่วนลดเซลล์และพันธมิตร"
                      : "สร้างโค้ดส่วนลดเซลล์และพันธมิตร (Batch)"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingPartnerCoupon
                      ? "แก้ไขข้อมูลผู้รับสิทธิ์ รหัสคูปอง และเงื่อนไขส่วนลด"
                      : "กำหนดข้อมูลผู้รับสิทธิ์ รูปแบบรหัส และเงื่อนไขส่วนลด"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsBatchModalOpen(false);
                  setEditingPartnerCoupon(null);
                  setBatchCreatedResult(null);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {batchInlineError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{batchInlineError}</span>
                </div>
              )}

              {batchCreatedResult ? (
                /* ── RESULTS PHASE (SHARING & CODE LIST) ──────────────────── */
                <div className="space-y-4">
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-slate-800 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        สร้างชุดรหัสส่วนลดสำเร็จ {batchCreatedResult.codes.length} โค้ด
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        ระบบได้บันทึกคูปองทั้งหมดลงในฐานข้อมูลเรียบร้อยแล้ว รหัสทุกตัวพร้อมใช้งานที่ POS และทางเว็บได้ทันที
                      </p>
                    </div>
                  </div>

                  {/* Summary Card */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-2 border-b border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block uppercase">เซลล์ผู้ดูแล:</span>
                        <span className="font-bold text-slate-800">{batchCreatedResult.leadSales}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block uppercase">บริษัทคู่ค้า / โครงการ / แฟร์:</span>
                        <span className="font-bold text-slate-800">{batchCreatedResult.partnerCompany || "-"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block uppercase">เซลล์คู่ค้า / ผู้ติดต่อ:</span>
                        <span className="font-bold text-slate-800">{batchCreatedResult.partnerSales || "-"}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-600">
                      <span>ส่วนลด: <strong className="text-slate-900">{batchCreatedResult.discountSummary}</strong></span>
                      <span>หมดอายุ: <strong className="text-slate-900">{batchCreatedResult.expiresSummary}</strong></span>
                      {batchCreatedResult.note && (
                        <span className="w-full text-slate-500">หมายเหตุ: {batchCreatedResult.note}</span>
                      )}
                    </div>
                  </div>

                  {/* Copy for LINE Button */}
                  <button
                    type="button"
                    onClick={handleCopyAllBatchCodes}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 active:scale-98 transition shadow-xs cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>คัดลอกข้อความทั้งหมดสำหรับส่ง LINE</span>
                  </button>

                  {/* Individual Codes Box */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-100 px-3.5 py-2 text-[11px] font-bold text-slate-700 flex justify-between items-center">
                      <span>รายการโค้ดที่สร้าง ({batchCreatedResult.codes.length} รายการ)</span>
                      <span className="text-[10px] text-slate-500 font-normal">คลิกเพื่อคัดลอกแยกโค้ด</span>
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 bg-white">
                      {batchCreatedResult.codes.map((code, idx) => (
                        <div key={code} className="flex items-center justify-between px-3.5 py-2 hover:bg-slate-50 transition">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-bold text-slate-400 w-6">#{idx + 1}</span>
                            <span className="font-mono text-xs font-bold text-slate-900 tracking-wider uppercase">
                              {code}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(code);
                              setBatchCopiedIndex(idx);
                              setTimeout(() => setBatchCopiedIndex(null), 2000);
                              triggerToast("success", "คัดลอกแล้ว", `คัดลอกโค้ด ${code}`);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                          >
                            {batchCopiedIndex === idx ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700 font-bold">คัดลอกแล้ว</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                                <span>คัดลอก</span>
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* ── FORM INPUT PHASE ─────────────────────────────────────── */
                <div className="space-y-4">
                  {/* Section 1: 3 Attribution Fields */}
                  <div className="space-y-3 rounded-xl bg-slate-50/70 border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                      <Users className="w-4 h-4 text-slate-600" />
                      <span>1. ข้อมูลผู้รับสิทธิ์และพันธมิตร</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          เซลล์ของเรา (คนแรก) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={batchLeadSales}
                          onChange={(e) => setBatchLeadSales(e.target.value)}
                          placeholder="เช่น ยันได"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          บริษัทคู่ค้า / โครงการ / แฟร์ <span className="text-slate-400 font-normal text-[10px] ml-1">(ถ้ามี)</span>
                        </label>
                        <input
                          type="text"
                          value={batchPartnerCompany}
                          onChange={(e) => setBatchPartnerCompany(e.target.value)}
                          placeholder="เช่น บ. สถาปัตย์ AA, งานแฟร์ (เว้นว่างได้)"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          เซลล์คู่ค้า / ผู้ติดต่อ <span className="text-slate-400 font-normal text-[10px] ml-1">(ถ้ามี)</span>
                        </label>
                        <input
                          type="text"
                          value={batchPartnerSales}
                          onChange={(e) => setBatchPartnerSales(e.target.value)}
                          placeholder="เช่น คุณสมชาย (เว้นว่างได้)"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-1">
                        หมายเหตุ / แคมเปญ (ถ้ามี)
                      </label>
                      <input
                        type="text"
                        value={batchNote}
                        onChange={(e) => setBatchNote(e.target.value)}
                        placeholder="เช่น โครงการคอนโดสาทร ล็อตพิเศษ Q4"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition"
                      />
                    </div>
                  </div>

                  {/* Section 2: Pattern & Batch Count OR Single Coupon Code if Editing */}
                  {editingPartnerCoupon ? (
                    <div className="space-y-3 rounded-xl bg-slate-50/70 border border-slate-200 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                          <Tag className="w-4 h-4 text-slate-600" />
                          <span>2. รหัสคูปองและชื่อโปรโมชัน</span>
                        </div>
                        {editingPartnerCoupon.attribution?.batch_id && (
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-md">
                            Batch: {editingPartnerCoupon.attribution.batch_id}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            รหัสคูปอง (Coupon Code) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={batchSingleCode}
                            onChange={(e) => setBatchSingleCode(e.target.value.toUpperCase())}
                            placeholder="เช่น YD-AA-1234"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold uppercase text-slate-900 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            ชื่อแคมเปญ / โปรโมชัน <span className="text-slate-400 font-normal text-[10px] ml-1">(สำหรับแสดงผล)</span>
                          </label>
                          <input
                            type="text"
                            value={batchTitlePrefix}
                            onChange={(e) => setBatchTitlePrefix(e.target.value)}
                            placeholder="เช่น โค้ดส่วนลดพิเศษพันธมิตร"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition"
                          />
                        </div>
                      </div>

                      {editingPartnerCoupon.attribution?.batch_id && (
                        <div className="pt-1">
                          <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 transition">
                            <input
                              type="checkbox"
                              checked={batchUpdateEntireBatch}
                              onChange={(e) => setBatchUpdateEntireBatch(e.target.checked)}
                              className="w-4 h-4 rounded text-slate-900 focus:ring-slate-800 border-slate-300 mt-0.5"
                            />
                            <div className="flex-1 text-left">
                              <span className="text-xs font-bold text-slate-800 block">
                                อัปเดตเงื่อนไขส่วนลดนี้ไปยังทุกโค้ดในชุดเดียวกัน (Batch)
                              </span>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                หากเลือก ส่วนลด, วันหมดอายุ, ยอดซื้อขั้นต่ำ, และ Top-up จะถูกปรับใช้กับรหัสทั้งหมดในชุดเดียวกันโดยอัตโนมัติ
                              </p>
                            </div>
                          </label>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-xl bg-slate-50/70 border border-slate-200 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                          <Tag className="w-4 h-4 text-slate-600" />
                          <span>2. กำหนดรูปแบบรหัสและจำนวนที่ต้องการสร้าง</span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          # = สุ่มตัวเลข (0-9) | * = สุ่มตัวอักษร/ตัวเลข
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            รูปแบบรหัส (Pattern Template) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={batchPattern}
                            onChange={(e) => setBatchPattern(e.target.value.toUpperCase())}
                            placeholder="เช่น YD-AA-#### หรือ YD-6351-####"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold uppercase text-slate-900 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition"
                          />
                          {/* Quick Presets */}
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className="text-[10px] text-slate-400 font-medium">ตัวอย่าง:</span>
                            {["YD-AA-####", "YD-INT-####", "YD-6351-####", "PROJ-####"].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setBatchPattern(preset)}
                                className={`text-[10px] font-mono px-2 py-0.5 rounded-md border transition cursor-pointer ${
                                  batchPattern === preset
                                    ? "bg-slate-900 text-white border-slate-900 font-bold"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-bold text-slate-700 block">
                                จำนวนโค้ดที่ต้องการสร้าง (ชุดละ)
                              </label>
                              <span className="text-[10px] text-slate-400 font-medium">
                                (1 - 100 โค้ด)
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                              {[1, 2, 5, 10, 20].map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => setBatchCount(num)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                                    batchCount === num
                                      ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                                  }`}
                                >
                                  {num}
                                </button>
                              ))}
                              <div className="relative flex-1 min-w-[75px] flex items-center">
                                <input
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={batchCount || ""}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    if (isNaN(val)) {
                                      setBatchCount(0);
                                    } else {
                                      setBatchCount(Math.min(100, Math.max(1, val)));
                                    }
                                  }}
                                  onBlur={() => {
                                    if (!batchCount || batchCount < 1) {
                                      setBatchCount(1);
                                    }
                                  }}
                                  placeholder="ระบุเอง..."
                                  className="w-full text-center py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 shadow-2xs"
                                />
                              </div>
                              <span className="text-[11px] font-bold text-slate-500 shrink-0">โค้ด</span>
                            </div>
                          </div>

                          {/* Live Sample Preview Badge */}
                          <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-100 border border-slate-200 px-3 py-1.5">
                            <span className="text-[10px] text-slate-500 font-semibold">ตัวอย่างรหัสจริง:</span>
                            <span className="font-mono text-xs font-bold text-slate-900 tracking-wider">
                              {samplePreviewCode}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section 3: Discount Terms */}
                  <div className="space-y-3.5 rounded-xl bg-slate-50/70 border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                        <Percent className="w-4 h-4 text-slate-600" />
                        <span>3. เงื่อนไขส่วนลด</span>
                      </div>

                      {/* Mode Selector */}
                      <div className="flex rounded-lg bg-slate-200/70 p-0.5 border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setBatchIsTiered(false)}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                            !batchIsTiered
                              ? "bg-white text-slate-900 shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          ส่วนลดปกติ
                        </button>
                        <button
                          type="button"
                          onClick={() => setBatchIsTiered(true)}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                            batchIsTiered
                              ? "bg-white text-slate-900 shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          ขั้นบันได
                        </button>
                      </div>
                    </div>

                    {!batchIsTiered ? (
                      /* Flat Mode Inputs */
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            ประเภทส่วนลด
                          </label>
                          <div className="flex rounded-lg bg-slate-200/70 p-1 border border-slate-200">
                            <button
                              type="button"
                              onClick={() => setBatchDiscountType("percentage")}
                              className={`flex-1 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                                batchDiscountType === "percentage"
                                  ? "bg-white text-slate-900 shadow-2xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              % เปอร์เซ็นต์
                            </button>
                            <button
                              type="button"
                              onClick={() => setBatchDiscountType("fixed_amount")}
                              className={`flex-1 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                                batchDiscountType === "fixed_amount"
                                  ? "bg-white text-slate-900 shadow-2xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              ฿ บาทถ้วน
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            มูลค่าส่วนลด <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="1"
                              value={batchDiscountValue}
                              onChange={(e) => setBatchDiscountValue(Number(e.target.value))}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                              {batchDiscountType === "percentage" ? "%" : "฿"}
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-medium text-slate-600 block mb-1">
                            ยอดซื้อขั้นต่ำ (บาท)
                          </label>
                          <input
                            type="number"
                            placeholder="0 (ไม่มีขั้นต่ำ)"
                            value={batchMinSpend}
                            onChange={(e) => setBatchMinSpend(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition"
                          />
                        </div>
                      </div>
                    ) : (
                      /* Tiered Step Mode Inputs - Clean, Native Form */
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-700">
                            กำหนดระดับส่วนลดตามยอดซื้อ
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setBatchTiers(prev => {
                                const lastMin = Number(prev[prev.length - 1]?.min_spend || 30000);
                                const lastDisc = Number(prev[prev.length - 1]?.discount_value || 10);
                                return [
                                  ...prev,
                                  {
                                    id: String(Date.now()),
                                    min_spend: String(lastMin + 10000),
                                    discount_type: "percentage",
                                    discount_value: String(lastDisc + 5),
                                  }
                                ];
                              });
                            }}
                            className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer shadow-2xs"
                          >
                            <Plus size={13} />
                            <span>เพิ่มขั้น</span>
                          </button>
                        </div>

                        <div className="space-y-2">
                          {batchTiers.map((tier, idx) => (
                            <div key={tier.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs">
                              <span className="text-xs font-bold text-slate-400 w-12 shrink-0 text-center">
                                ขั้น {idx + 1}
                              </span>
                              <div className="flex-1 min-w-[120px]">
                                <label className="text-[10px] font-medium text-slate-500 block mb-0.5">
                                  ยอดซื้อครบ (บาท) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={tier.min_spend}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setBatchTiers(prev => prev.map(t => t.id === tier.id ? { ...t, min_spend: val } : t));
                                  }}
                                  placeholder="20000"
                                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition"
                                />
                              </div>
                              <div className="w-28 shrink-0">
                                <label className="text-[10px] font-medium text-slate-500 block mb-0.5">
                                  ประเภท
                                </label>
                                <select
                                  value={tier.discount_type}
                                  onChange={(e) => {
                                    const val = e.target.value as "percentage" | "fixed_amount";
                                    setBatchTiers(prev => prev.map(t => t.id === tier.id ? { ...t, discount_type: val } : t));
                                  }}
                                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-slate-800 cursor-pointer"
                                >
                                  <option value="percentage">% เปอร์เซ็นต์</option>
                                  <option value="fixed_amount">฿ บาท</option>
                                </select>
                              </div>
                              <div className="w-24 shrink-0">
                                <label className="text-[10px] font-medium text-slate-500 block mb-0.5">
                                  มูลค่าลด <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="1"
                                    value={tier.discount_value}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setBatchTiers(prev => prev.map(t => t.id === tier.id ? { ...t, discount_value: val } : t));
                                    }}
                                    placeholder="5"
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition pr-5"
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                    {tier.discount_type === "percentage" ? "%" : "฿"}
                                  </span>
                                </div>
                              </div>
                              {batchTiers.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setBatchTiers(prev => prev.filter(t => t.id !== tier.id))}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0 cursor-pointer mt-3"
                                  title="ลบขั้นนี้"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Minimal quiet summary */}
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap pt-0.5">
                          <span className="font-semibold text-slate-600">ตัวอย่าง:</span>
                          {batchTiers
                            .filter(t => Number(t.min_spend) > 0 && Number(t.discount_value) > 0)
                            .sort((a, b) => Number(a.min_spend) - Number(b.min_spend))
                            .map((t, i) => (
                              <span key={t.id || i} className="font-mono text-slate-700 font-medium">
                                {i > 0 && <span className="text-slate-300 mr-1.5">|</span>}
                                ครบ ฿{Number(t.min_spend).toLocaleString()} ลด {t.discount_type === "percentage" ? `${t.discount_value}%` : `฿${Number(t.discount_value).toLocaleString()}`}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <label className="text-[11px] font-medium text-slate-600 block mb-1">
                          ลดสูงสุด (บาท - เฉพาะแบบ %)
                        </label>
                        <input
                          type="number"
                          placeholder="ไม่จำกัด"
                          disabled={batchIsTiered ? !batchTiers.some(t => t.discount_type === "percentage") : batchDiscountType !== "percentage"}
                          value={batchMaxDiscount}
                          onChange={(e) => setBatchMaxDiscount(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-medium text-slate-600 block mb-1">
                          วันหมดอายุ (End Date)
                        </label>
                        <input
                          type="datetime-local"
                          value={batchEndDate}
                          onChange={(e) => setBatchEndDate(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-medium text-slate-600 block mb-1">
                          สิทธิ์การใช้งานต่อโค้ด
                        </label>
                        <select
                          value={batchUsageLimit}
                          onChange={(e) => setBatchUsageLimit(Number(e.target.value))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition cursor-pointer"
                        >
                          <option value={1}>1 ครั้งต่อโค้ด (Single-Use)</option>
                          <option value={5}>5 ครั้งต่อโค้ด</option>
                          <option value={10}>10 ครั้งต่อโค้ด</option>
                        </select>
                      </div>
                    </div>

                    {/* Top-Up Toggle */}
                    <div className="pt-2">
                      <label className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-200 bg-amber-50/60 cursor-pointer hover:bg-amber-50 transition">
                        <input
                          type="checkbox"
                          checked={batchIsTopUp}
                          onChange={(e) => setBatchIsTopUp(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300 mt-0.5"
                        />
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
                              <Zap className="w-3.5 h-3.5 text-amber-700" />
                              <span>ส่วนลดแบบ Top-up (ลด On-top ร่วมกับสินค้าที่มีส่วนลดแล้วได้)</span>
                            </span>
                            <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded">TOP-UP</span>
                          </div>
                          <p className="text-[11px] text-amber-800/80 mt-0.5 leading-relaxed">
                            เปิดใช้งานเพื่อให้โค้ดทุกรหัสในชุดนี้ สามารถใช้ลด On-top กับสินค้าที่มีส่วนลดรายชิ้นหรือลด 50% อยู่แล้วได้
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 px-6 py-3.5 bg-slate-50">
              {batchCreatedResult ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setBatchCreatedResult(null);
                      setBatchInlineError(null);
                    }}
                    className="rounded-lg px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                  >
                    สร้างชุดอื่นเพิ่ม
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsBatchModalOpen(false);
                      setEditingPartnerCoupon(null);
                      setBatchCreatedResult(null);
                    }}
                    className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
                  >
                    เสร็จสิ้น / ปิดหน้าต่าง
                  </button>
                </>
              ) : editingPartnerCoupon ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsBatchModalOpen(false);
                      setEditingPartnerCoupon(null);
                    }}
                    disabled={isPending}
                    className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleExecuteUpdatePartner}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 active:scale-95 transition shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>บันทึกการแก้ไข</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setIsBatchModalOpen(false)}
                    disabled={isPending}
                    className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleExecuteCreateBatch}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 active:scale-95 transition shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>สร้าง {batchCount || 1} โค้ด</span>
                  </button>
                </>
              )}
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
