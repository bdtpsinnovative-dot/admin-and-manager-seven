"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type StorefrontSubcategory = {
  key: string;
  titleEn: string;
  titleTh: string;
  filterParam: string;
  mappedSups: string[];
  groupCount: number;
  productCount: number;
};

export type StorefrontCategoryComparison = {
  key: string;
  titleEn: string;
  titleTh: string;
  filterParam: string;
  mappedSups: string[];
  groupCount: number;
  productCount: number;
  inStockCount: number;
  preOrderCount: number;
  sampleImages: string[];
  subcategories: StorefrontSubcategory[];
  matchedDbSups: Array<{ sup: string; groupCount: number; productCount: number }>;
};

export type FilterCategoryStat = {
  name: string;
  normalizedName: string;
  hasWhitespaceIssue: boolean;
  tag: string;
  groupCount: number;
  productCount: number;
  inStockCount: number;
  preOrderCount: number;
  sampleImages: string[];
  mappedToStorefrontCategory: string | null;
};

export type FiltersDashboardData = {
  totalGroups: number;
  totalProducts: number;
  unassignedGroupsCount: number;
  uniqueCategoriesCount: number;
  storefrontCategories: StorefrontCategoryComparison[];
  unmappedDbCategories: Array<{
    name: string;
    groupCount: number;
    productCount: number;
    tag: string;
  }>;
  categories: FilterCategoryStat[];
  unassignedGroups: Array<{
    id: string;
    name: string | null;
    image_url: string | null;
    tag: string | null;
    product_sup: string | null;
    productCount: number;
  }>;
  statusStats: Array<{ status: string; count: number }>;
  colorStats: Array<{ color: string; count: number }>;
  tagStats: Array<{ tag: string; count: number }>;
};

// Storefront Categories Architecture (from terrahome.studio)
const STOREFRONT_DEFS = [
  {
    key: "VASE & VESSELS",
    titleEn: "VASE & VESSELS",
    titleTh: "แจกันและภาชนะ",
    filterParam: "VASE & VESSELS",
    mappedSups: [
      "ceramic vases",
      "ceramic vase",
      "ceramic handmade",
      "ceramic 3d",
      "glass vases",
      "glass vase",
      "glass handmade",
      "vase glass handmade",
      "vessels",
      "vessel",
      "vase",
      "vase normal",
      "vase and flower",
      "flower",
      "others vase",
    ],
    subcategories: [
      {
        key: "Ceramic Vases",
        titleEn: "CERAMIC VASES",
        titleTh: "แจกันเซรามิก",
        filterParam: "Ceramic Vases",
        mappedSups: ["ceramic vases", "ceramic vase", "ceramic handmade", "ceramic 3d"],
      },
      {
        key: "Glass Vases",
        titleEn: "GLASS VASES",
        titleTh: "แจกันแก้ว",
        filterParam: "Glass Vases",
        mappedSups: ["glass vases", "glass vase", "glass handmade", "vase glass handmade"],
      },
      {
        key: "Vessels",
        titleEn: "VESSELS",
        titleTh: "ภาชนะ",
        filterParam: "Vessels",
        mappedSups: ["vessels", "vessel", "ceramic handmade", "ceramic 3d", "glass handmade", "vase glass handmade", "vase", "vase normal"],
      },
      {
        key: "Vase and Flower",
        titleEn: "VASE AND FLOWER",
        titleTh: "แจกันและดอกไม้",
        filterParam: "Vase and Flower",
        mappedSups: ["vase and flower", "flower"],
      },
      {
        key: "Others Vase",
        titleEn: "OTHERS VASE",
        titleTh: "แจกันอื่น ๆ",
        filterParam: "Others Vase",
        mappedSups: ["others vase", "vase", "vase normal"],
      },
    ],
  },
  {
    key: "FIGURE",
    titleEn: "FIGURE",
    titleTh: "ตุ๊กตาตกแต่ง",
    filterParam: "FIGURE",
    mappedSups: [
      "animal figure",
      "doll animal",
      "animal",
      "human figure",
      "doll human",
      "human",
      "plant figure",
      "doll plant",
      "plant",
      "others figure",
      "doll object",
      "figure",
      "art object",
    ],
    subcategories: [
      {
        key: "Animal Figure",
        titleEn: "ANIMAL FIGURE",
        titleTh: "ตุ๊กตาสัตว์",
        filterParam: "Animal Figure",
        mappedSups: ["animal figure", "doll animal", "animal"],
      },
      {
        key: "Human Figure",
        titleEn: "HUMAN FIGURE",
        titleTh: "ตุ๊กตามนุษย์",
        filterParam: "Human Figure",
        mappedSups: ["human figure", "doll human", "human"],
      },
      {
        key: "Plant Figure",
        titleEn: "PLANT FIGURE",
        titleTh: "ตุ๊กตาผลไม้และพืช",
        filterParam: "Plant Figure",
        mappedSups: ["plant figure", "doll plant", "plant"],
      },
      {
        key: "Others Figure",
        titleEn: "OTHERS FIGURE",
        titleTh: "ตุ๊กตาอื่น ๆ",
        filterParam: "Others Figure",
        mappedSups: ["others figure", "doll object", "figure", "art object"],
      },
    ],
  },
  {
    key: "SCULPTURE",
    titleEn: "SCULPTURE",
    titleTh: "ประติมากรรมตกแต่ง",
    filterParam: "Sculpture",
    mappedSups: ["sculpture"],
    subcategories: [],
  },
  {
    key: "BOOKED",
    titleEn: "BOOKED",
    titleTh: "ตกแต่งชั้นหนังสือ",
    filterParam: "BOOKED",
    mappedSups: ["book end", "booked"],
    subcategories: [],
  },
  {
    key: "CANDLE HOLDERS",
    titleEn: "CANDLE HOLDERS",
    titleTh: "เชิงเทียน",
    filterParam: "CANDLE HOLDERS",
    mappedSups: ["candle holder", "candle holders"],
    subcategories: [],
  },
  {
    key: "ACCESSORIES",
    titleEn: "ACCESSORIES",
    titleTh: "ของตกแต่งอื่น ๆ",
    filterParam: "ACCESSORIES",
    mappedSups: ["decorative box", "box", "tray", "trays", "decorative toy", "toy", "others"],
    subcategories: [
      { key: "Box", titleEn: "BOX", titleTh: "ภาชนะตกแต่ง", filterParam: "Box", mappedSups: ["decorative box", "box"] },
      { key: "Trays", titleEn: "TRAYS", titleTh: "ถาดตกแต่ง", filterParam: "Trays", mappedSups: ["tray", "trays"] },
      { key: "Toy", titleEn: "TOY", titleTh: "ของเล่นตกแต่ง", filterParam: "Toy", mappedSups: ["decorative toy", "toy"] },
    ],
  },
  {
    key: "DINING & TABLEWARE",
    titleEn: "DINING & TABLEWARE",
    titleTh: "เครื่องใช้บนโต๊ะอาหาร",
    filterParam: "DINING & TABLEWARE",
    mappedSups: ["plates & dishes", "bowls", "bowl", "glassware", "cups & mugs", "cups & mug", "trays & servingware", "kitchenware", "other dining & tableware"],
    subcategories: [
      { key: "Plates & Dishes", titleEn: "PLATES & DISHES", titleTh: "จานตกแต่ง", filterParam: "Plates & Dishes", mappedSups: ["plates & dishes"] },
      { key: "Bowls", titleEn: "BOWLS", titleTh: "ชาม", filterParam: "Bowls", mappedSups: ["bowls", "bowl"] },
      { key: "Glassware", titleEn: "GLASSWARE", titleTh: "แก้วน้ำ, แก้วไวน์", filterParam: "Glassware", mappedSups: ["glassware"] },
      { key: "Cups & Mugs", titleEn: "CUPS & MUGS", titleTh: "ถ้วย, แก้วกาแฟ", filterParam: "Cups & Mugs", mappedSups: ["cups & mugs", "cups & mug"] },
      { key: "Trays & Servingware", titleEn: "TRAYS & SERVINGWARE", titleTh: "ภาชนะเสิร์ฟ", filterParam: "Trays & Servingware", mappedSups: ["trays & servingware"] },
      { key: "Other Dining & Tableware", titleEn: "OTHER DINING & TABLEWARE", titleTh: "เครื่องใช้บนโต๊ะอาหารอื่น ๆ", filterParam: "Other Dining & Tableware", mappedSups: ["kitchenware", "other dining & tableware"] },
    ],
  },
  {
    key: "DRESSING & BATH",
    titleEn: "DRESSING & BATH",
    titleTh: "ของใช้ในห้องน้ำและห้องแต่งตัว",
    filterParam: "DRESSING & BATH",
    mappedSups: ["decorative bath", "bath", "bath room", "dressing room", "dressing"],
    subcategories: [
      { key: "Bath Room", titleEn: "BATH ROOM", titleTh: "ห้องน้ำ", filterParam: "Bath Room", mappedSups: ["bath room", "decorative bath", "bath"] },
      { key: "Dressing Room", titleEn: "DRESSING ROOM", titleTh: "ห้องแต่งตัว", filterParam: "Dressing Room", mappedSups: ["dressing room", "dressing"] },
    ],
  },
  {
    key: "ART & WALL DECOR",
    titleEn: "ART & WALL DECOR",
    titleTh: "งานศิลปะและของตกแต่งผนัง",
    filterParam: "ART & WALL DECOR",
    mappedSups: [
      "handmade",
      "wall art hand craft 50%",
      "wall art hand craft 80%",
      "wall art hand craft 100%",
      "3d handmade",
      "wall art 3d material",
      "wall art 3d physical painting",
      "wall art digital print",
      "digital print",
      "mixed media art",
      "frame",
    ],
    subcategories: [
      { key: "Handmade", titleEn: "HANDMADE", titleTh: "ภาพวาด Handmade 100%", filterParam: "Handmade", mappedSups: ["handmade", "wall art hand craft 50%", "wall art hand craft 80%", "wall art hand craft 100%"] },
      { key: "3D Handmade", titleEn: "3D HANDMADE", titleTh: "ภาพตกแต่ง Handmade 3 มิติ", filterParam: "3D Handmade", mappedSups: ["3d handmade", "wall art 3d material", "wall art 3d physical painting"] },
      { key: "Digital print", titleEn: "DIGITAL PRINT", titleTh: "ภาพดิจิตอลปริ้น", filterParam: "Digital print", mappedSups: ["wall art digital print", "digital print"] },
      { key: "Mixed Media Art", titleEn: "MIXED MEDIA ART", titleTh: "ภาพวาด Handmade ผสมดิจิตอลปริ้น", filterParam: "Mixed Media Art", mappedSups: ["mixed media art"] },
      { key: "Photo Frame", titleEn: "PHOTO FRAME", titleTh: "กรอบรูป", filterParam: "Photo Frame", mappedSups: ["frame"] },
    ],
  },
];

export async function getFiltersDashboardData(): Promise<FiltersDashboardData> {
  // 1. Fetch all collection_groups
  let allGroups: any[] = [];
  let page = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    const from = page * limit;
    const to = from + limit - 1;
    const { data, error } = await supabaseAdmin
      .from("collection_groups")
      .select("id, name, product_sup, tag, image_url, cover_image_url")
      .range(from, to);

    if (error) {
      console.error("Error fetching collection_groups:", error);
      break;
    }
    if (!data || data.length === 0) break;
    allGroups = allGroups.concat(data);
    if (data.length < limit) hasMore = false;
    else page++;
  }

  // 2. Fetch all products summary
  let allProducts: any[] = [];
  page = 0;
  hasMore = true;

  while (hasMore) {
    const from = page * limit;
    const to = from + limit - 1;
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("id, status, color, collection_group_id")
      .range(from, to);

    if (error) {
      console.error("Error fetching products:", error);
      break;
    }
    if (!data || data.length === 0) break;
    allProducts = allProducts.concat(data);
    if (data.length < limit) hasMore = false;
    else page++;
  }

  // Map products by collection_group_id
  const productsByGroup = new Map<string, any[]>();
  const statusCounts: Record<string, number> = {};
  const colorCounts: Record<string, number> = {};

  for (const prod of allProducts) {
    const st = (prod.status || "Unknown").trim();
    statusCounts[st] = (statusCounts[st] || 0) + 1;

    if (prod.color && prod.color.trim()) {
      const c = prod.color.trim();
      colorCounts[c] = (colorCounts[c] || 0) + 1;
    }

    if (prod.collection_group_id) {
      const gid = prod.collection_group_id;
      if (!productsByGroup.has(gid)) {
        productsByGroup.set(gid, []);
      }
      productsByGroup.get(gid)!.push(prod);
    }
  }

  // Aggregate by raw product_sup
  const categoryMap = new Map<string, {
    name: string;
    normalizedName: string;
    hasWhitespaceIssue: boolean;
    tags: Record<string, number>;
    groups: any[];
    productCount: number;
    inStockCount: number;
    preOrderCount: number;
    images: string[];
  }>();

  const unassignedGroups: any[] = [];
  const tagCounts: Record<string, number> = {};

  for (const group of allGroups) {
    const rawSup = group.product_sup;
    const currentTag = (group.tag || "Uncategorized").trim();
    tagCounts[currentTag] = (tagCounts[currentTag] || 0) + 1;

    const groupProducts = productsByGroup.get(group.id) || [];
    const groupProdCount = groupProducts.length;

    let inStockInGroup = 0;
    let preOrderInGroup = 0;

    for (const p of groupProducts) {
      const st = (p.status || "").toLowerCase();
      if (st.includes("stock") || st === "active") {
        inStockInGroup++;
      } else if (st.includes("pre") || st.includes("oder") || st.includes("order")) {
        preOrderInGroup++;
      }
    }

    const img = group.image_url || group.cover_image_url;

    if (!rawSup || rawSup.trim() === "" || rawSup.trim().toLowerCase() === "null") {
      unassignedGroups.push({
        id: group.id,
        name: group.name,
        image_url: img,
        tag: group.tag,
        product_sup: rawSup,
        productCount: groupProdCount,
      });
      continue;
    }

    const trimmedSup = rawSup.trim();
    const hasWhitespace = rawSup !== trimmedSup;

    if (!categoryMap.has(rawSup)) {
      categoryMap.set(rawSup, {
        name: rawSup,
        normalizedName: trimmedSup,
        hasWhitespaceIssue: hasWhitespace,
        tags: {},
        groups: [],
        productCount: 0,
        inStockCount: 0,
        preOrderCount: 0,
        images: [],
      });
    }

    const catObj = categoryMap.get(rawSup)!;
    catObj.groups.push(group);
    catObj.productCount += groupProdCount;
    catObj.inStockCount += inStockInGroup;
    catObj.preOrderCount += preOrderInGroup;
    catObj.tags[currentTag] = (catObj.tags[currentTag] || 0) + 1;

    if (img && catObj.images.length < 4 && !catObj.images.includes(img)) {
      catObj.images.push(img);
    }
  }

  // Check which DB category maps to which storefront category
  const allAllowedStorefrontSups = new Map<string, string>(); // lowerSup -> storefrontKey
  for (const sDef of STOREFRONT_DEFS) {
    for (const sup of sDef.mappedSups) {
      allAllowedStorefrontSups.set(sup.toLowerCase(), sDef.titleEn);
    }
  }

  // Build categories list
  const categories: FilterCategoryStat[] = Array.from(categoryMap.values())
    .map((c) => {
      let primaryTag = "Props";
      let maxTagCount = -1;
      for (const [t, cnt] of Object.entries(c.tags)) {
        if (cnt > maxTagCount) {
          maxTagCount = cnt;
          primaryTag = t;
        }
      }

      const mappedSf = allAllowedStorefrontSups.get(c.normalizedName.toLowerCase()) || null;

      return {
        name: c.name,
        normalizedName: c.normalizedName,
        hasWhitespaceIssue: c.hasWhitespaceIssue,
        tag: primaryTag,
        groupCount: c.groups.length,
        productCount: c.productCount,
        inStockCount: c.inStockCount,
        preOrderCount: c.preOrderCount,
        sampleImages: c.images,
        mappedToStorefrontCategory: mappedSf,
      };
    })
    .sort((a, b) => b.groupCount - a.groupCount);

  // Build Storefront Comparison
  const storefrontCategories: StorefrontCategoryComparison[] = STOREFRONT_DEFS.map((sDef) => {
    const matchingGroups: any[] = [];
    const matchedSupMap = new Map<string, { groupCount: number; productCount: number }>();
    let totalProdCount = 0;
    let inStock = 0;
    let preOrder = 0;
    const images: string[] = [];

    const allowedSet = new Set(sDef.mappedSups.map((s) => s.toLowerCase()));

    for (const group of allGroups) {
      const sup = (group.product_sup || "").trim().toLowerCase();
      if (allowedSet.has(sup)) {
        matchingGroups.push(group);
        const groupProducts = productsByGroup.get(group.id) || [];
        totalProdCount += groupProducts.length;

        for (const p of groupProducts) {
          const st = (p.status || "").toLowerCase();
          if (st.includes("stock") || st === "active") inStock++;
          else if (st.includes("pre") || st.includes("oder") || st.includes("order")) preOrder++;
        }

        const rawSup = group.product_sup || "";
        if (!matchedSupMap.has(rawSup)) {
          matchedSupMap.set(rawSup, { groupCount: 0, productCount: 0 });
        }
        const entry = matchedSupMap.get(rawSup)!;
        entry.groupCount++;
        entry.productCount += groupProducts.length;

        const img = group.image_url || group.cover_image_url;
        if (img && images.length < 4 && !images.includes(img)) {
          images.push(img);
        }
      }
    }

    // Subcategories calculation
    const subcats: StorefrontSubcategory[] = sDef.subcategories.map((sub) => {
      const subSet = new Set(sub.mappedSups.map((s) => s.toLowerCase()));
      let subGroupCount = 0;
      let subProdCount = 0;

      for (const group of allGroups) {
        const sup = (group.product_sup || "").trim().toLowerCase();
        if (subSet.has(sup)) {
          subGroupCount++;
          subProdCount += (productsByGroup.get(group.id) || []).length;
        }
      }

      return {
        key: sub.key,
        titleEn: sub.titleEn,
        titleTh: sub.titleTh,
        filterParam: sub.filterParam,
        mappedSups: sub.mappedSups,
        groupCount: subGroupCount,
        productCount: subProdCount,
      };
    });

    const matchedDbSups = Array.from(matchedSupMap.entries())
      .map(([sup, stats]) => ({
        sup,
        groupCount: stats.groupCount,
        productCount: stats.productCount,
      }))
      .sort((a, b) => b.groupCount - a.groupCount);

    return {
      key: sDef.key,
      titleEn: sDef.titleEn,
      titleTh: sDef.titleTh,
      filterParam: sDef.filterParam,
      mappedSups: sDef.mappedSups,
      groupCount: matchingGroups.length,
      productCount: totalProdCount,
      inStockCount: inStock,
      preOrderCount: preOrder,
      sampleImages: images,
      subcategories: subcats,
      matchedDbSups,
    };
  });

  // Collect unmapped categories in DB (not matching any storefront categories)
  const unmappedDbCategories = categories
    .filter((c) => !c.mappedToStorefrontCategory)
    .map((c) => ({
      name: c.name,
      groupCount: c.groupCount,
      productCount: c.productCount,
      tag: c.tag,
    }));

  const statusStats = Object.entries(statusCounts)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  const colorStats = Object.entries(colorCounts)
    .map(([color, count]) => ({ color, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  const tagStats = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalGroups: allGroups.length,
    totalProducts: allProducts.length,
    unassignedGroupsCount: unassignedGroups.length,
    uniqueCategoriesCount: categories.length,
    storefrontCategories,
    unmappedDbCategories,
    categories,
    unassignedGroups,
    statusStats,
    colorStats,
    tagStats,
  };
}

export async function getCollectionGroupsBySup(supName: string | null) {
  let query = supabaseAdmin
    .from("collection_groups")
    .select(`
      id,
      name,
      description,
      product_sup,
      tag,
      image_url,
      cover_image_url,
      created_at,
      products (
        id,
        name,
        sku,
        color,
        price,
        status,
        category_id,
        image_url
      )
    `);

  if (supName === null || supName === "" || supName === "(null)") {
    query = query.or("product_sup.is.null,product_sup.eq.'',product_sup.ilike.'null'");
  } else {
    query = query.eq("product_sup", supName);
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(200);

  if (error) {
    console.error("Error in getCollectionGroupsBySup:", error);
    throw new Error(error.message);
  }

  return data || [];
}

export async function updateSingleGroupSup(groupId: string, newProductSup: string, newTag?: string) {
  const payload: any = {
    product_sup: newProductSup.trim() === "" ? null : newProductSup.trim(),
  };
  if (newTag) {
    payload.tag = newTag.trim();
  }

  const { error } = await supabaseAdmin
    .from("collection_groups")
    .update(payload)
    .eq("id", groupId);

  if (error) {
    console.error("Error updating group product_sup:", error);
    throw new Error(error.message);
  }

  revalidatePath("/filters");
  return { success: true };
}

export async function batchUpdateGroupSup(
  oldSup: string | null,
  newSup: string,
  newTag?: string
) {
  const trimmedNewSup = newSup.trim();
  if (!trimmedNewSup) {
    throw new Error("ชื่อหมวดหมู่ใหม่ต้องไม่ว่างเปล่า");
  }

  const updateData: any = {
    product_sup: trimmedNewSup,
  };
  if (newTag && newTag.trim()) {
    updateData.tag = newTag.trim();
  }

  let query = supabaseAdmin.from("collection_groups").update(updateData);

  if (oldSup === null || oldSup === "" || oldSup === "(null)") {
    query = query.or("product_sup.is.null,product_sup.eq.'',product_sup.ilike.'null'");
  } else {
    query = query.eq("product_sup", oldSup);
  }

  const { data, error } = await query.select("id");

  if (error) {
    console.error("Error batch updating product_sup:", error);
    throw new Error(error.message);
  }

  revalidatePath("/filters");
  return { success: true, updatedCount: data?.length || 0 };
}

export async function getStorefrontFilterItems(filterParam: string, subParam?: string) {
  const targetParam = subParam || filterParam;

  if (targetParam === "All" || targetParam === "ALL") {
    const { data } = await supabaseAdmin
      .from("collection_groups")
      .select(`
        id,
        name,
        product_sup,
        tag,
        image_url,
        cover_image_url,
        products (
          id,
          name,
          sku,
          color,
          price,
          status,
          image_url
        )
      `)
      .order("created_at", { ascending: false })
      .limit(60);
    return data || [];
  }

  if (targetParam === "UNMAPPED") {
    const { data } = await supabaseAdmin
      .from("collection_groups")
      .select(`
        id,
        name,
        product_sup,
        tag,
        image_url,
        cover_image_url,
        products (
          id,
          name,
          sku,
          color,
          price,
          status,
          image_url
        )
      `)
      .or("product_sup.is.null,product_sup.eq.'',product_sup.ilike.'null'")
      .order("created_at", { ascending: false })
      .limit(60);
    return data || [];
  }

  if (targetParam === "IN_STOCK" || targetParam === "PRE_ORDER") {
    const isStock = targetParam === "IN_STOCK";
    const { data } = await supabaseAdmin
      .from("collection_groups")
      .select(`
        id,
        name,
        product_sup,
        tag,
        image_url,
        cover_image_url,
        products!inner (
          id,
          name,
          sku,
          color,
          price,
          status,
          image_url
        )
      `)
      .order("created_at", { ascending: false })
      .limit(60);

    const filtered = (data || []).filter((g) =>
      g.products?.some((p: any) => {
        const st = (p.status || "").toLowerCase();
        return isStock
          ? st.includes("stock") || st === "active"
          : st.includes("pre") || st.includes("oder") || st.includes("order");
      })
    );
    return filtered;
  }

  // Find in STOREFRONT_DEFS
  let mappedSups: string[] = [];
  for (const cat of STOREFRONT_DEFS) {
    if (cat.filterParam.toLowerCase() === targetParam.toLowerCase() || cat.key.toLowerCase() === targetParam.toLowerCase()) {
      mappedSups = cat.mappedSups;
      break;
    }
    for (const sub of cat.subcategories) {
      if (sub.filterParam.toLowerCase() === targetParam.toLowerCase() || sub.key.toLowerCase() === targetParam.toLowerCase()) {
        mappedSups = sub.mappedSups;
        break;
      }
    }
    if (mappedSups.length > 0) break;
  }

  if (mappedSups.length > 0) {
    const orCondition = mappedSups.map((s) => `product_sup.ilike.${s}`).join(",");
    const { data } = await supabaseAdmin
      .from("collection_groups")
      .select(`
        id,
        name,
        product_sup,
        tag,
        image_url,
        cover_image_url,
        products (
          id,
          name,
          sku,
          color,
          price,
          status,
          image_url
        )
      `)
      .or(orCondition)
      .order("created_at", { ascending: false })
      .limit(80);
    return data || [];
  }

  // Direct fallback
  const { data } = await supabaseAdmin
    .from("collection_groups")
    .select(`
      id,
      name,
      product_sup,
      tag,
      image_url,
      cover_image_url,
      products (
        id,
        name,
        sku,
        color,
        price,
        status,
        image_url
      )
    `)
    .ilike("product_sup", targetParam)
    .order("created_at", { ascending: false })
    .limit(60);

  return data || [];
}

