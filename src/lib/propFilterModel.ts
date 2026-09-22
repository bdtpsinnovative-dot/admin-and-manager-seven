export type ProductFilterMenuItem = {
  label: string
  displayLabel?: string
  thaiLabel?: string
  fullValue?: string
  items?: Array<{ fullValue: string; displayLabel: string; thaiLabel?: string }>
  isSpecial?: boolean
}

export type ProductColorOption = {
  value: string
  label: string
  count: number
  swatch: string | null
}

export type ProductMaterialOption = {
  value: string
  label: string
  thaiLabel?: string
  count: number
}

export type DimensionFilter = {
  minHeight?: string
  maxHeight?: string
  minWidth?: string
  maxWidth?: string
  minDepth?: string
  maxDepth?: string
}

export const EMPTY_DIMENSION_FILTER: DimensionFilter = {
  minHeight: "",
  maxHeight: "",
  minWidth: "",
  maxWidth: "",
  minDepth: "",
  maxDepth: "",
}

export function hasActiveDimensions(filter?: DimensionFilter): boolean {
  if (!filter) return false
  return Boolean(
    filter.minHeight ||
    filter.maxHeight ||
    filter.minWidth ||
    filter.maxWidth ||
    filter.minDepth ||
    filter.maxDepth
  )
}

export const PRODUCT_FILTER_ITEMS: ProductFilterMenuItem[] = [
  { label: "ALL", displayLabel: "ALL", thaiLabel: "สินค้าทั้งหมด", fullValue: "All" },
  {
    label: "VASE & VESSELS",
    displayLabel: "VASE & VESSELS",
    thaiLabel: "แจกันและภาชนะ",
    fullValue: "VASE & VESSELS",
    items: [
      { fullValue: "Ceramic Vases", displayLabel: "CERAMIC VASES", thaiLabel: "แจกันเซรามิก" },
      { fullValue: "Glass Vases", displayLabel: "GLASS VASES", thaiLabel: "แจกันแก้ว" },
      { fullValue: "Vessels", displayLabel: "VESSELS", thaiLabel: "ภาชนะ" },
      { fullValue: "Vase and Flower", displayLabel: "VASE AND FLOWER", thaiLabel: "แจกันและดอกไม้" },
      { fullValue: "Others Vase", displayLabel: "OTHERS VASE", thaiLabel: "แจกันอื่น ๆ" },
    ],
  },
  {
    label: "FIGURE",
    displayLabel: "FIGURE",
    thaiLabel: "ตุ๊กตาตกแต่ง",
    fullValue: "FIGURE",
    items: [
      { fullValue: "Animal Figure", displayLabel: "ANIMAL FIGURE", thaiLabel: "ตุ๊กตาสัตว์" },
      { fullValue: "Human Figure", displayLabel: "HUMAN FIGURE", thaiLabel: "ตุ๊กตามนุษย์" },
      { fullValue: "Plant Figure", displayLabel: "PLANT FIGURE", thaiLabel: "ตุ๊กตาผลไม้และพืช" },
      { fullValue: "Others Figure", displayLabel: "OTHERS FIGURE", thaiLabel: "ตุ๊กตาอื่น ๆ" },
    ],
  },
  { label: "SCULPTURE", displayLabel: "SCULPTURE", thaiLabel: "ประติมากรรมตกแต่ง", fullValue: "Sculpture" },
  { label: "BOOKED", displayLabel: "BOOKED", thaiLabel: "ตกแต่งชั้นหนังสือ", fullValue: "BOOKED" },
  { label: "CANDLE HOLDERS", displayLabel: "CANDLE HOLDERS", thaiLabel: "เชิงเทียน", fullValue: "CANDLE HOLDERS" },
  {
    label: "ACCESSORIES",
    displayLabel: "ACCESSORIES",
    thaiLabel: "ของตกแต่งอื่น ๆ",
    fullValue: "ACCESSORIES",
    items: [
      { fullValue: "Box", displayLabel: "BOX", thaiLabel: "ภาชนะตกแต่ง" },
      { fullValue: "Trays", displayLabel: "TRAYS", thaiLabel: "ถาดตกแต่ง" },
      { fullValue: "Toy", displayLabel: "TOY", thaiLabel: "ของเล่นตกแต่ง" },
    ],
  },
  {
    label: "DINING & TABLEWARE",
    displayLabel: "DINING & TABLEWARE",
    thaiLabel: "เครื่องใช้บนโต๊ะอาหาร",
    fullValue: "DINING & TABLEWARE",
    items: [
      { fullValue: "Plates & Dishes", displayLabel: "PLATES & DISHES", thaiLabel: "จานตกแต่ง" },
      { fullValue: "Bowls", displayLabel: "BOWLS", thaiLabel: "ชาม" },
      { fullValue: "Glassware", displayLabel: "GLASSWARE", thaiLabel: "แก้วน้ำ, แก้วไวน์" },
      { fullValue: "Cups & Mugs", displayLabel: "CUPS & MUGS", thaiLabel: "ถ้วย, แก้วกาแฟ" },
      { fullValue: "Trays & Servingware", displayLabel: "TRAYS & SERVINGWARE", thaiLabel: "ภาชนะเสิร์ฟ" },
      { fullValue: "Other Dining & Tableware", displayLabel: "OTHER DINING & TABLEWARE", thaiLabel: "เครื่องใช้บนโต๊ะอาหารอื่น ๆ" },
    ],
  },
  {
    label: "DRESSING & BATH",
    displayLabel: "DRESSING & BATH",
    thaiLabel: "ของใช้ในห้องน้ำและห้องแต่งตัว",
    fullValue: "DRESSING & BATH",
    items: [
      { fullValue: "Bath Room", displayLabel: "BATH ROOM", thaiLabel: "ห้องน้ำ" },
      { fullValue: "Dressing Room", displayLabel: "DRESSING ROOM", thaiLabel: "ห้องแต่งตัว" },
    ],
  },
  {
    label: "ART & WALL DECOR",
    displayLabel: "ART & WALL DECOR",
    thaiLabel: "งานศิลปะและของตกแต่งผนัง",
    fullValue: "ART & WALL DECOR",
    items: [
      { fullValue: "Handmade", displayLabel: "HANDMADE", thaiLabel: "ภาพวาด Handmade 100%" },
      { fullValue: "3D Handmade", displayLabel: "3D HANDMADE", thaiLabel: "ภาพตกแต่ง Handmade 3 มิติ" },
      { fullValue: "Digital print", displayLabel: "DIGITAL PRINT", thaiLabel: "ภาพดิจิตอลปริ้น" },
      { fullValue: "Mixed Media Art", displayLabel: "MIXED MEDIA ART", thaiLabel: "ภาพวาด Handmade ผสมดิจิตอลปริ้น" },
      { fullValue: "Photo Frame", displayLabel: "PHOTO FRAME", thaiLabel: "กรอบรูป" },
    ],
  },
  { label: "IN STOCK", displayLabel: "IN STOCK", thaiLabel: "สินค้าพร้อมส่ง", fullValue: "IN_STOCK", isSpecial: true },
  { label: "PRE-ORDER", displayLabel: "PRE-ORDER", thaiLabel: "พรีออเดอร์", fullValue: "PRE_ORDER", isSpecial: true },
  { label: "SALE OFFERS %", displayLabel: "SALE OFFERS %", thaiLabel: "ลดราคาพิเศษ", fullValue: "SPECIAL_DISCOUNT", isSpecial: true },
]

export const CATEGORY_MAP: Record<string, string[]> = {
  // 1. Vase & Vessels
  "VASE & VESSELS": ["ceramic vases", "ceramic vase", "ceramic handmade", "ceramic 3d", "glass vases", "glass vase", "glass handmade", "vase glass handmade", "vessels", "vessel", "vase", "vase normal", "vase and flower", "flower", "others vase"],
  "Ceramic Vases": ["ceramic vases", "ceramic vase", "ceramic handmade", "ceramic 3d"],
  "Glass Vases": ["glass vases", "glass vase", "glass handmade", "vase glass handmade"],
  "Vessels": ["vessels", "vessel", "ceramic handmade", "ceramic 3d", "glass handmade", "vase glass handmade", "vase", "vase normal"],
  "Vase and Flower": ["vase and flower", "flower"],
  "Others Vase": ["others vase", "vase", "vase normal"],

  // 2. Figure
  "FIGURE": ["animal figure", "doll animal", "animal", "human figure", "doll human", "human", "plant figure", "doll plant", "plant", "others figure", "doll object", "figure", "art object"],
  "Animal Figure": ["animal figure", "doll animal", "animal"],
  "Human Figure": ["human figure", "doll human", "human"],
  "Plant Figure": ["plant figure", "doll plant", "plant"],
  "Others Figure": ["others figure", "doll object", "figure", "art object"],

  // 3. Sculpture
  "Sculpture": ["sculpture"],
  "SCULPTURE": ["sculpture"],

  // 4. BOOKED
  "BOOKED": ["book end", "booked"],
  "Book End": ["book end", "booked"],

  // 5. CANDLE HOLDERS
  "CANDLE HOLDERS": ["candle holder", "candle holders"],
  "Candle Holder": ["candle holder", "candle holders"],

  // 6. Accessories
  "ACCESSORIES": ["decorative box", "box", "tray", "trays", "decorative toy", "toy", "others"],
  "Box": ["decorative box", "box"],
  "Trays": ["tray", "trays"],
  "Toy": ["decorative toy", "toy"],

  // 7. Dining & Tableware
  "DINING & TABLEWARE": ["plates & dishes", "bowls", "glassware", "cups & mugs", "cups & mug", "trays & servingware", "kitchenware", "other dining & tableware"],
  "Plates & Dishes": ["plates & dishes"],
  "Bowls": ["bowls"],
  "Glassware": ["glassware"],
  "Cups & Mugs": ["cups & mugs", "cups & mug"],
  "Trays & Servingware": ["trays & servingware"],
  "Other Dining & Tableware": ["kitchenware", "other dining & tableware"],

  // 8. Dressing & Bath
  "DRESSING & BATH": ["decorative bath", "bath", "bath room", "dressing room", "dressing"],
  "Bath Room": ["bath room", "decorative bath", "bath"],
  "Dressing Room": ["dressing room", "dressing"],

  // 9. Art & walldecor
  "ART & WALL DECOR": ["handmade", "wall art hand craft 50%", "wall art hand craft 80%", "wall art hand craft 100%", "3d handmade", "wall art 3d material", "wall art 3d physical painting", "wall art digital print", "digital print", "mixed media art", "frame", "photo frame"],
  "Handmade": ["handmade", "wall art hand craft 50%", "wall art hand craft 80%", "wall art hand craft 100%"],
  "3D Handmade": ["3d handmade", "wall art 3d material", "wall art 3d physical painting"],
  "Digital print": ["wall art digital print", "digital print"],
  "Mixed Media Art": ["mixed media art"],
  "Photo Frame": ["frame", "photo frame"],

  // Legacy mappings for backwards compatibility
  "Art Object": ["art object"],
  "Decorative": ["decorative box", "box", "tray", "trays", "decorative toy", "toy", "decorative bath", "bath"],
  "Doll": ["doll animal", "animal", "doll human", "human", "doll plant", "plant", "doll object", "figure"],
  "Kitchenware": ["kitchenware", "plates & dishes", "bowls", "glassware", "cups & mugs", "trays & servingware"],
  "Tray": ["tray", "trays"],
  "Vase": ["ceramic vases", "ceramic vase", "ceramic handmade", "ceramic 3d", "glass vases", "glass vase", "glass handmade", "vase glass handmade", "vase", "vase normal"],
  "Wall Art": ["handmade", "wall art hand craft 50%", "wall art hand craft 80%", "wall art hand craft 100%", "3d handmade", "wall art 3d material", "wall art 3d physical painting", "wall art digital print", "digital print", "mixed media art", "frame", "photo frame"],
}

export const COLOR_PRESENTATION: Record<string, { label: string; swatch: string }> = {
  beige: { label: "Beige", swatch: "#D8C5A8" },
  black: { label: "Black", swatch: "#222222" },
  blue: { label: "Blue", swatch: "#5B8FB9" },
  brown: { label: "Brown", swatch: "#84492C" },
  gold: { label: "Gold", swatch: "#C8A97E" },
  green: { label: "Green", swatch: "#6E8B68" },
  grey: { label: "Grey", swatch: "#9E9E9E" },
  orange: { label: "Orange", swatch: "#E07A5F" },
  pink: { label: "Pink", swatch: "#E8A598" },
  purple: { label: "Purple", swatch: "#8F728E" },
  red: { label: "Red", swatch: "#B84A39" },
  silver: { label: "Silver", swatch: "#C0C0C0" },
  white: { label: "White", swatch: "#FAFAFA" },
  yellow: { label: "Yellow", swatch: "#E6AF2E" },
}

const COLOR_ALIASES: Record<string, string> = { gray: "grey" }

export function normalizeAttribute(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ").toLowerCase()
  return COLOR_ALIASES[normalized] || normalized
}

function attributeValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(attributeValues)
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    const namedValue = record.name ?? record.label ?? record.value
    return namedValue === undefined ? [] : attributeValues(namedValue)
  }
  if (typeof value !== "string") return []
  const normalizedValue = value.trim()
  if (!normalizedValue) return []
  if ((normalizedValue.startsWith("[") && normalizedValue.endsWith("]")) || (normalizedValue.startsWith("{") && normalizedValue.endsWith("}"))) {
    try {
      return attributeValues(JSON.parse(normalizedValue))
    } catch {
      // ignore
    }
  }
  return normalizedValue.split(/[,/|]+/).map((item) => item.trim()).filter(Boolean)
}

export function productColorValues(product: any): string[] {
  const specs = product?.specs && typeof product.specs === "object" ? product.specs : {}
  const rawValues = [
    product?.color,
    product?.colour,
    product?.colors,
    product?.colours,
    specs.color,
    specs.colour,
    specs.colors,
    specs.colours,
    specs.tone,
    specs.color_tone,
    specs.colour_tone,
    specs.colorTone,
  ]
  return Array.from(new Set(rawValues.flatMap(attributeValues).map(normalizeAttribute)))
}

export const MATERIAL_PRESENTATION: Record<string, { label: string; thaiLabel: string; aliases: string[] }> = {
  ceramic: {
    label: "Ceramic",
    thaiLabel: "เซรามิก",
    aliases: ["ceramic", "ceramic handmade", "ceramic printing", "ceramic hand drawn", "porcelain"],
  },
  glass: {
    label: "Glass",
    thaiLabel: "แก้ว",
    aliases: ["glass", "glass handmade", "crystal"],
  },
  resin: {
    label: "Resin",
    thaiLabel: "เรซิ่น",
    aliases: ["resin"],
  },
  metal: {
    label: "Metal & Alloy",
    thaiLabel: "โลหะและอัลลอยด์",
    aliases: ["metal", "alloy", "stainless steel"],
  },
  stone: {
    label: "Stone & Marble",
    thaiLabel: "หินอ่อนและหินธรรมชาติ",
    aliases: ["marble", "travertine", "natural stone", "alloy & marble"],
  },
  wood: {
    label: "Wood",
    thaiLabel: "ไม้",
    aliases: ["wood", "mdf", "bamboo weaving"],
  },
  canvas: {
    label: "Canvas",
    thaiLabel: "ผ้าใบ / แคนวาส",
    aliases: ["canvas"],
  },
  cement: {
    label: "Cement",
    thaiLabel: "ปูนและซีเมนต์",
    aliases: ["cement"],
  },
  leather: {
    label: "Leather",
    thaiLabel: "หนัง",
    aliases: ["leather"],
  },
  acrylic: {
    label: "Acrylic",
    thaiLabel: "อะคริลิก",
    aliases: ["acrylic"],
  },
}

export function productMaterialValues(product: any): string[] {
  const specs = product?.specs && typeof product.specs === "object" ? product.specs : {}
  const rawValues = [
    product?.material,
    product?.materials,
    specs.material,
    specs.materials,
  ]
  const result = new Set<string>()

  for (const raw of rawValues.flatMap(attributeValues)) {
    const lower = raw.trim().toLowerCase()
    if (!lower) continue
    result.add(lower)

    for (const [key, config] of Object.entries(MATERIAL_PRESENTATION)) {
      if (config.aliases.some((alias) => lower === alias || lower.includes(alias))) {
        result.add(key)
      }
    }
  }

  return Array.from(result)
}

export function productMatchesDimensions(product: any, filter: DimensionFilter): boolean {
  if (!hasActiveDimensions(filter)) return true

  const specs = product?.specs && typeof product.specs === "object" ? product.specs : {}
  const h = Number(product.height_cm ?? specs.H ?? specs.thickness_cm ?? specs.height ?? 0)
  const w = Number(product.width_cm ?? specs.W ?? specs.width_cm ?? specs.width ?? 0)
  const d = Number(product.length_cm ?? specs.D ?? specs.length_cm ?? specs.depth ?? 0)

  if (filter.minHeight && h < Number(filter.minHeight)) return false
  if (filter.maxHeight && h > Number(filter.maxHeight)) return false
  if (filter.minWidth && w < Number(filter.minWidth)) return false
  if (filter.maxWidth && w > Number(filter.maxWidth)) return false
  if (filter.minDepth && d < Number(filter.minDepth)) return false
  if (filter.maxDepth && d > Number(filter.maxDepth)) return false

  return true
}

// ✨ อัลกอริทึมจัดลำดับหมวดหมู่แบบเดียวกับหน้าเว็บหน้าร้าน (terrahome.studio)
export function getStorefrontCategoryOrder(productSup: string | null | undefined): number {
  const value = (productSup || "").trim().toLowerCase()
  // 1. VASE & VESSELS
  if (value.startsWith("vase") || value.includes("vessel") || value.includes("ceramic vase") || value.includes("glass vase")) return 1
  // 2. FIGURE
  if (value.startsWith("doll") || value.startsWith("figure") || value.includes("animal") || value.includes("human") || value.includes("plant")) return 2
  // 3. SCULPTURE
  if (value.includes("sculpture")) return 3
  // 4. BOOKED & CANDLE HOLDERS
  if (value.includes("booked") || value.includes("book end") || value.includes("candle")) return 4
  // 5. ACCESSORIES
  if (value.startsWith("decorative") || value.includes("tray") || value.includes("box") || value.includes("toy")) return 5
  // 6. DINING & TABLEWARE
  if (value.includes("dining") || value.includes("kitchen") || value.includes("plate") || value.includes("bowl") || value.includes("cup") || value.includes("glassware")) return 6
  // 7. DRESSING & BATH
  if (value.includes("bath") || value.includes("dressing")) return 7
  // 8. ART & WALL DECOR
  if (value.includes("art") || value.includes("wall") || value.includes("frame") || value.includes("print")) return 8
  // 9. อื่นๆ
  return 9
}

// ✨ ฟังก์ชันกรองสินค้าฝั่ง POS ตามตัวเลือกหน้าบ้าน
export function matchesStorefrontCategory(product: any, activeCategory: string): boolean {
  if (!activeCategory || activeCategory === "All" || activeCategory === "ALL") return true

  if (activeCategory === "SPECIAL_DISCOUNT") {
    return Boolean(product.discount_label) || Boolean(product.discount_id) || (Number(product.original_price) > Number(product.price))
  }

  const totalStock = (product.stocks || []).reduce((sum: number, s: any) => sum + Number(s.qty || 0), 0)

  if (activeCategory === "IN_STOCK") {
    return totalStock > 0
  }

  if (activeCategory === "PRE_ORDER") {
    return totalStock <= 0
  }

  const target = activeCategory.trim()
  const allowed = CATEGORY_MAP[target] || CATEGORY_MAP[target.toUpperCase()] || [target.toLowerCase()]
  const sup = String(product.product_sup || "").trim().toLowerCase()
  return allowed.includes(sup)
}

// ✨ คำนวณตัวเลือกสีสำหรับสินค้าในหน้า POS
export function getPosColorOptions(products: any[], activeCategory: string): ProductColorOption[] {
  const counts = new Map<string, number>()
  for (const product of products) {
    if (!matchesStorefrontCategory(product, activeCategory)) continue
    for (const color of productColorValues(product)) {
      counts.set(color, (counts.get(color) || 0) + 1)
    }
  }

  return Array.from(counts.entries())
    .map(([value, count]) => ({
      value,
      count,
      label: COLOR_PRESENTATION[value]?.label || value.replace(/\b\w/g, (c) => c.toUpperCase()),
      swatch: COLOR_PRESENTATION[value]?.swatch || null,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

// ✨ คำนวณตัวเลือกวัสดุสำหรับสินค้าในหน้า POS
export function getPosMaterialOptions(products: any[], activeCategory: string): ProductMaterialOption[] {
  const counts = new Map<string, number>()
  for (const product of products) {
    if (!matchesStorefrontCategory(product, activeCategory)) continue
    for (const mat of productMaterialValues(product)) {
      if (MATERIAL_PRESENTATION[mat] || !Object.values(MATERIAL_PRESENTATION).some((cfg) => cfg.aliases.includes(mat))) {
        counts.set(mat, (counts.get(mat) || 0) + 1)
      }
    }
  }

  return Array.from(counts.entries())
    .map(([value, count]) => {
      const presentation = MATERIAL_PRESENTATION[value]
      return {
        value,
        count,
        label: presentation?.label || value.replace(/\b\w/g, (c) => c.toUpperCase()),
        thaiLabel: presentation?.thaiLabel,
      }
    })
    .filter((opt) => opt.count > 0)
    .sort((a, b) => b.count - a.count)
}

export interface ResolvedCategory {
  mainKey: string
  mainLabel: string
  mainThaiLabel: string
  subKey: string
  subLabel: string
  subThaiLabel?: string
  groupType: 'prop' | 'furniture' | 'wood' | 'other'
}

export function resolveCategoryInfo(product: any): ResolvedCategory {
  const colGroup = Array.isArray(product?.collection_groups)
    ? product.collection_groups[0]
    : product?.collection_groups

  const rawSup = String(
    colGroup?.product_sup ||
    product?.specs?.product_sup ||
    colGroup?.name ||
    product?.specs?.type ||
    product?.specs?.spec_type ||
    ""
  ).trim()

  const rawTag = String(colGroup?.tag || "").toLowerCase()
  const catId = String(product?.category_id || "").toLowerCase()
  const lowerSup = rawSup.toLowerCase()

  // 1. ตรวจสอบการจับคู่กับหมวดหมู่พร็อพ (PRODUCT_FILTER_ITEMS / CATEGORY_MAP)
  for (const item of PRODUCT_FILTER_ITEMS) {
    if (item.isSpecial || item.label === "ALL") continue

    // ตรวจสอบหมวดหมู่ย่อย (Subcategories) ก่อนเพื่อให้ระบุได้อย่างแม่นยำ
    if (item.items && item.items.length > 0) {
      for (const sub of item.items) {
        const subKey = sub.fullValue
        const allowed = CATEGORY_MAP[subKey] || CATEGORY_MAP[subKey.toUpperCase()] || [subKey.toLowerCase()]
        if (
          lowerSup === subKey.toLowerCase() ||
          lowerSup === (sub.displayLabel || "").toLowerCase() ||
          allowed.some(a => {
            const al = a.toLowerCase()
            return al === lowerSup || (lowerSup.length >= 3 && al.includes(lowerSup)) || (al.length >= 3 && lowerSup.includes(al))
          })
        ) {
          return {
            mainKey: item.label,
            mainLabel: item.displayLabel || item.label,
            mainThaiLabel: item.thaiLabel || item.label,
            subKey: sub.fullValue,
            subLabel: sub.displayLabel || sub.fullValue,
            subThaiLabel: sub.thaiLabel,
            groupType: 'prop',
          }
        }
      }
    }

    // ตรวจสอบหมวดหมู่หลัก (Main Category)
    const mainKey = item.label
    const mainAllowed = CATEGORY_MAP[mainKey] || CATEGORY_MAP[item.fullValue || ""] || [mainKey.toLowerCase()]
    if (
      lowerSup === mainKey.toLowerCase() ||
      lowerSup === (item.displayLabel || "").toLowerCase() ||
      (item.fullValue && lowerSup === item.fullValue.toLowerCase()) ||
      mainAllowed.some(a => {
        const al = a.toLowerCase()
        return al === lowerSup || (lowerSup.length >= 3 && al.includes(lowerSup)) || (al.length >= 3 && lowerSup.includes(al))
      })
    ) {
      return {
        mainKey: item.label,
        mainLabel: item.displayLabel || item.label,
        mainThaiLabel: item.thaiLabel || item.label,
        subKey: rawSup || item.label,
        subLabel: rawSup || item.displayLabel || item.label,
        subThaiLabel: item.thaiLabel,
        groupType: 'prop',
      }
    }
  }

  // 2. Fallbacks สำหรับหมวดหมู่พร็อพที่อาจระบุชื่อเฉพาะ
  if (catId === 'prop' || rawTag.includes('prop')) {
    return {
      mainKey: rawSup ? rawSup.toUpperCase() : "PROPS_OTHER",
      mainLabel: rawSup || "OTHER PROPS",
      mainThaiLabel: rawSup ? `พร็อพ (${rawSup})` : "พร็อพตกแต่งอื่น ๆ",
      subKey: rawSup || "Other Props",
      subLabel: rawSup || "Other Props",
      groupType: 'prop',
    }
  }

  // 3. หมวดหมู่เฟอร์นิเจอร์
  if (catId === 'furniture' || rawTag.includes('furn')) {
    return {
      mainKey: "FURNITURE",
      mainLabel: "FURNITURE",
      mainThaiLabel: "เฟอร์นิเจอร์",
      subKey: rawSup || "Furniture",
      subLabel: rawSup || "เฟอร์นิเจอร์",
      groupType: 'furniture',
    }
  }

  // 4. หมวดหมู่แผ่นไม้
  if (catId === 'slabs' || catId === 'slab') {
    return {
      mainKey: "WOOD SLABS",
      mainLabel: "WOOD SLABS",
      mainThaiLabel: "แผ่นไม้จามจุรี",
      subKey: rawSup || "Wood Slabs",
      subLabel: rawSup || "แผ่นไม้",
      groupType: 'wood',
    }
  }

  // 5. หมวดหมู่ไม้ดิบ
  if (catId === 'rough_wood') {
    return {
      mainKey: "ROUGH WOOD",
      mainLabel: "ROUGH WOOD",
      mainThaiLabel: "ไม้ดิบ",
      subKey: rawSup || "Rough Wood",
      subLabel: rawSup || "ไม้ดิบ",
      groupType: 'wood',
    }
  }

  // 6. สินค้าอื่นๆ
  return {
    mainKey: rawSup ? rawSup.toUpperCase() : "OTHER",
    mainLabel: rawSup || "OTHER",
    mainThaiLabel: rawSup || "สินค้าทั่วไป",
    subKey: rawSup || "Other",
    subLabel: rawSup || "ทั่วไป",
    groupType: 'other',
  }
}
