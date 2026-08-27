export type ProductFilterMenuItem = {
  label: string
  displayLabel?: string
  thaiLabel?: string
  fullValue?: string
  items?: Array<{ fullValue: string; displayLabel: string; thaiLabel?: string }>
  isSpecial?: boolean
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
]

export const CATEGORY_MAP: Record<string, string[]> = {
  // 1. Vase & Vessels
  "VASE & VESSELS": ["ceramic handmade", "ceramic 3d", "glass handmade", "vase glass handmade", "vase", "vase normal"],
  "Ceramic Vases": ["ceramic handmade", "ceramic 3d"],
  "Glass Vases": ["glass handmade", "vase glass handmade"],
  "Vessels": ["ceramic handmade", "ceramic 3d", "glass handmade", "vase glass handmade", "vase", "vase normal"],
  "Others Vase": ["vase", "vase normal"],

  // 2. Figure
  "FIGURE": ["doll animal", "animal", "doll human", "human", "doll plant", "plant", "doll object", "figure", "art object"],
  "Animal Figure": ["doll animal", "animal"],
  "Human Figure": ["doll human", "human"],
  "Plant Figure": ["doll plant", "plant"],
  "Others Figure": ["doll object", "figure", "art object"],

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
  "DINING & TABLEWARE": ["plates & dishes", "bowls", "glassware", "cups & mugs", "trays & servingware", "kitchenware"],
  "Plates & Dishes": ["plates & dishes"],
  "Bowls": ["bowls"],
  "Glassware": ["glassware"],
  "Cups & Mugs": ["cups & mugs"],
  "Trays & Servingware": ["trays & servingware"],
  "Other Dining & Tableware": ["kitchenware"],

  // 8. Dressing & Bath
  "DRESSING & BATH": ["decorative bath", "bath"],
  "Bath Room": ["decorative bath", "bath"],
  "Dressing Room": ["decorative bath", "bath"],

  // 9. Art & walldecor
  "ART & WALL DECOR": ["handmade", "wall art hand craft 50%", "wall art hand craft 80%", "wall art hand craft 100%", "3d handmade", "wall art 3d material", "wall art 3d physical painting", "wall art digital print", "digital print", "mixed media art", "frame"],
  "Handmade": ["handmade", "wall art hand craft 50%", "wall art hand craft 80%", "wall art hand craft 100%"],
  "3D Handmade": ["3d handmade", "wall art 3d material", "wall art 3d physical painting"],
  "Digital print": ["wall art digital print", "digital print"],
  "Mixed Media Art": ["mixed media art"],
  "Photo Frame": ["frame"],

  // Legacy mappings for backwards compatibility
  "Art Object": ["art object"],
  "Decorative": ["decorative box", "box", "tray", "trays", "decorative toy", "toy", "decorative bath", "bath"],
  "Doll": ["doll animal", "animal", "doll human", "human", "doll plant", "plant", "doll object", "figure"],
  "Kitchenware": ["kitchenware", "plates & dishes", "bowls", "glassware", "cups & mugs", "trays & servingware"],
  "Tray": ["tray", "trays"],
  "Vase": ["ceramic handmade", "ceramic 3d", "glass handmade", "vase glass handmade", "vase", "vase normal"],
  "Wall Art": ["handmade", "wall art hand craft 50%", "wall art hand craft 80%", "wall art hand craft 100%", "3d handmade", "wall art 3d material", "wall art 3d physical painting", "wall art digital print", "digital print", "mixed media art", "frame"],
}
