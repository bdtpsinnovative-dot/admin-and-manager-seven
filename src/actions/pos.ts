"use server"

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import {
  matchesStorefrontCategory,
  productColorValues,
  productMaterialValues,
  productMatchesDimensions,
  getPosColorOptions,
  getPosMaterialOptions,
  getStorefrontCategoryOrder,
  DimensionFilter,
  EMPTY_DIMENSION_FILTER,
  hasActiveDimensions,
  getProductBrand,
  getPosBrandOptions,
  ProductBrandOption
} from '@/lib/propFilterModel'

export interface PosSetBundle {
  id: number;
  name: string;
  categoryName: string;
  imageUrl: string | null;
  items: any[];
  totalOriginalPrice: number;
  totalPrice: number;
  discountAmount: number;
  discountPercent: number;
  promoId?: string;
  promoTitle?: string;
}

// ✨ ระบบ In-Memory Cache เพื่อประหยัด Egress Data และลดการยิง Query ซ้ำซ้อนไปที่ Supabase
interface PosCache {
  timestamp: number;
  products: any[];
  branches: any[];
  categories: any[];
  sets: PosSetBundle[];
}

let posCache: PosCache | null = null;
const CACHE_TTL = 5 * 60 * 1000; // แคชไว้ 5 นาที

interface FurnitureCache {
  timestamp: number;
  products: any[];
  subcategories: string[];
  brands: string[];
}
let furnitureCache: FurnitureCache | null = null;
const FURNITURE_CACHE_TTL = 5 * 60 * 1000; // แคชเฟอร์นิเจอร์ไว้ 5 นาที

interface SlabsCache {
  timestamp: number;
  products: any[];
  subcategories: string[];
  brands: string[];
}
let slabsCache: SlabsCache | null = null;
const SLABS_CACHE_TTL = 5 * 60 * 1000; // แคชแผ่นไม้สแลปไว้ 5 นาที

export async function clearPosCache() {
  posCache = null;
  furnitureCache = null;
  slabsCache = null;
}

async function ensurePosCache(forceRefresh: boolean = false) {
  const cookieStore = await cookies() 
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll() } }
  })

  const now = Date.now();
  if (!forceRefresh && posCache && (now - posCache.timestamp < CACHE_TTL)) {
    return { success: true, fromCache: true }
  }

  const { data: branches, error: branchError } = await supabase
    .from('branches')
    .select('id, branch_name')
    .order('id', { ascending: true })

  const { data: collections, error: colError } = await supabase
    .from('collection_groups')
    .select('product_sup')
    .ilike('tag', '%prop%')

  if (branchError || colError) {
    return { success: false, error: "เกิดข้อผิดพลาดในการโหลดข้อมูลสาขาหรือหมวดหมู่" }
  }

  // ✨ ดึงจำนวนรายการทั้งหมดเพื่อยิงแบบคู่ขนาน (Parallel Fetching) ลดเวลารอจาก 5 วิเหลือ < 1 วิ
  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', 'prop')

  const totalPropCount = count || 5000
  const chunkSize = 1000
  const numChunks = Math.ceil(totalPropCount / chunkSize)
  const chunkPromises = []

  for (let i = 0; i < numChunks; i++) {
    const offset = i * chunkSize
    chunkPromises.push(
      supabase
        .from('products')
        .select(`
          id, name, sku, price, image_url, barcode, specs,
          collection_groups ( product_sup, tag, image_url, cover_image_url ),
          stock ( branch_id, qty ),
          discount_rules (
            discounts ( id, name, discount_type, value, active )
          )
        `)
        .eq('category_id', 'prop')
        .order('id', { ascending: true })
        .range(offset, offset + chunkSize - 1)
    )
  }

  const chunkResults = await Promise.all(chunkPromises)
  let allProducts: any[] = []
  for (const res of chunkResults) {
    if (res.data && res.data.length > 0) {
      allProducts.push(...res.data)
    }
  }

  const uniqueCategories = Array.from(new Set(collections?.map(c => (c.product_sup || '').trim()).filter(Boolean))).sort()

  const formattedProducts = allProducts
    .filter(p => !p.collection_groups || !p.collection_groups.tag || p.collection_groups.tag.toLowerCase().includes('prop'))
    .map(p => {
      const originalPrice = Number(p.price) || 0
      let finalPrice = originalPrice
      let discountPercentString = "" 
      let appliedDiscountId = null
      let appliedDiscountName = null

      const activeRule = p.discount_rules?.find((r: any) => r.discounts?.active === true)

      if (activeRule && activeRule.discounts) {
        const disc = activeRule.discounts
        const discValue = Number(disc.value) || 0
        
        appliedDiscountId = disc.id
        appliedDiscountName = disc.name

        if (disc.discount_type === 'FIXED') {
          finalPrice = Math.max(0, originalPrice - discValue)
          if (originalPrice > 0) discountPercentString = `-${Math.round((discValue / originalPrice) * 100)}%`
        } else if (disc.discount_type === 'PERCENT') {
          finalPrice = Math.max(0, originalPrice - (originalPrice * (discValue / 100)))
          discountPercentString = `-${discValue}%`
        }
      }

      const colGroup = Array.isArray(p.collection_groups) ? p.collection_groups[0] : p.collection_groups
      const resolvedImageUrl = p.image_url || colGroup?.image_url || colGroup?.cover_image_url || null

      const brand = getProductBrand(p)

      return {
        id: p.id,
        name: p.name,
        sku: p.sku || '',
        original_price: originalPrice, 
        price: finalPrice,              
        discount_label: discountPercentString, 
        discount_id: appliedDiscountId,
        discount_name: appliedDiscountName,
        image_url: resolvedImageUrl,
        barcode: p.barcode,
        product_sup: colGroup ? colGroup.product_sup : null,
        category_id: 'prop',
        brand,
        stocks: p.stock || [],
        specs: p.specs ? {
          brand: p.specs.brand || p.specs.Brand || brand || null,
          material: p.specs.material || null,
          color: p.specs.color || p.specs.colour || p.color || null,
          width_cm: p.specs.width_cm || p.specs.W || null,
          length_cm: p.specs.length_cm || p.specs.D || null,
          thickness_cm: p.specs.thickness_cm || p.specs.H || null,
        } : { brand }
      }
    })

  // ✨ ดึงข้อมูลเซ็ตสินค้าที่ผูกไว้ใน Web Gallery (journal_images)
  const { data: linkedImages } = await supabase
    .from('journal_images')
    .select(`
      id,
      image_url,
      alt_text,
      sort_order,
      journal_categories ( id, title_th, title_en ),
      journal_image_products ( product_id )
    `)
    .order('sort_order', { ascending: true })

  const nowIso = new Date().toISOString()
  const { data: activeSetPromos } = await supabase
    .from('terra_collection_promotions')
    .select('*')
    .eq('is_active', true)
    .eq('trigger_type', 'auto')

  const validSetPromos = (activeSetPromos || []).filter(p => {
    if (p.start_date && p.start_date > nowIso) return false
    if (p.end_date && p.end_date < nowIso) return false
    if (p.usage_limit && p.used_count >= p.usage_limit) return false
    return true
  })

  const productMap = new Map<number, any>()
  formattedProducts.forEach(p => productMap.set(p.id, p))

  const setBundles: PosSetBundle[] = []
  const setsWithProducts = (linkedImages || []).filter(img => img.journal_image_products && img.journal_image_products.length > 0)

  for (const s of setsWithProducts) {
    const pIds: number[] = s.journal_image_products.map((p: any) => Number(p.product_id)).filter((id: number) => !isNaN(id))
    const setProducts = pIds.map(id => productMap.get(id)).filter(Boolean)
    if (setProducts.length === 0) continue

    const jCat: any = Array.isArray(s.journal_categories) ? s.journal_categories[0] : s.journal_categories
    const catName = jCat?.title_th || jCat?.title_en || 'เซ็ตตกแต่ง'
    const imgLabel = s.alt_text || `เซ็ต #${s.id}`
    const setName = `${catName} — ${imgLabel} (${setProducts.length} ชิ้น)`

    const totalOriginalPrice = setProducts.reduce((sum, p) => sum + (Number(p.original_price) || 0), 0)
    let totalPrice = setProducts.reduce((sum, p) => sum + (Number(p.price) || 0), 0)
    let discountPercent = 0
    let discountAmount = 0
    let promoId: string | undefined
    let promoTitle: string | undefined

    const matchedPromo = validSetPromos.find(p => String(p.collection_group_id) === String(s.id))
    if (matchedPromo) {
      discountPercent = Number(matchedPromo.discount_value) || 0
      promoId = matchedPromo.id
      promoTitle = matchedPromo.title

      let promoDiscount = (totalPrice * discountPercent) / 100
      if (matchedPromo.max_discount_amount && promoDiscount > Number(matchedPromo.max_discount_amount)) {
        promoDiscount = Number(matchedPromo.max_discount_amount)
      }
      discountAmount = Math.round(promoDiscount)
      totalPrice = Math.max(0, totalPrice - discountAmount)
    }

    setBundles.push({
      id: s.id,
      name: setName,
      categoryName: catName,
      imageUrl: s.image_url || null,
      items: setProducts,
      totalOriginalPrice,
      totalPrice,
      discountAmount,
      discountPercent,
      promoId,
      promoTitle
    })
  }

  posCache = {
    timestamp: now,
    products: formattedProducts,
    branches: branches || [],
    categories: uniqueCategories,
    sets: setBundles
  }

  return { success: true, fromCache: false }
}

function filterAndSortPosProducts(
  products: any[],
  options: {
    searchQuery?: string;
    selectedCategory?: string;
    storefrontCategory?: string;
    selectedColors?: string[];
    selectedMaterials?: string[];
    selectedBrands?: string[];
    dimensionFilter?: DimensionFilter;
    selectedLocation?: number | 'ALL';
    myBranchId?: number;
  }
) {
  const {
    searchQuery = '',
    selectedCategory = 'ALL',
    storefrontCategory = 'All',
    selectedColors = [],
    selectedMaterials = [],
    selectedBrands = [],
    dimensionFilter = EMPTY_DIMENSION_FILTER,
    selectedLocation = 'ALL',
    myBranchId = 1,
  } = options;

  const query = searchQuery.trim().toLowerCase();

  const filtered = products.filter(p => {
    if (query) {
      const matchSearch = (p.name || '').toLowerCase().includes(query) || (p.sku || '').toLowerCase().includes(query);
      if (!matchSearch) return false;
    }

    if (selectedCategory !== 'ALL' && p.product_sup !== selectedCategory) return false;

    if (storefrontCategory !== 'All' && storefrontCategory !== 'ALL') {
      if (!matchesStorefrontCategory(p, storefrontCategory)) return false;
    }

    if (selectedColors.length > 0) {
      const pColors = productColorValues(p);
      const hasColor = selectedColors.some(c => pColors.includes(c));
      if (!hasColor) return false;
    }

    if (selectedMaterials.length > 0) {
      const pMats = productMaterialValues(p);
      const hasMat = selectedMaterials.some(m => pMats.includes(m));
      if (!hasMat) return false;
    }

    if (selectedBrands.length > 0) {
      const pBrand = getProductBrand(p);
      if (!selectedBrands.includes(pBrand)) return false;
    }

    if (hasActiveDimensions(dimensionFilter)) {
      if (!productMatchesDimensions(p, dimensionFilter)) return false;
    }

    if (storefrontCategory === 'PRE_ORDER') {
      const checkStock = selectedLocation !== 'ALL'
        ? (p.stocks?.find((s: any) => s.branch_id === selectedLocation)?.qty || 0)
        : (p.stocks?.reduce((sum: number, s: any) => sum + Number(s.qty), 0) || 0);
      if (Number(checkStock) > 0) return false;
    }

    return true;
  });

  filtered.sort((a, b) => {
    const targetBranch = selectedLocation === 'ALL' ? myBranchId : selectedLocation;
    const aLocStock = a.stocks?.find((s: any) => s.branch_id === targetBranch)?.qty || 0;
    const bLocStock = b.stocks?.find((s: any) => s.branch_id === targetBranch)?.qty || 0;
    const aTotalStock = a.stocks?.reduce((sum: number, s: any) => sum + Number(s.qty), 0) || 0;
    const bTotalStock = b.stocks?.reduce((sum: number, s: any) => sum + Number(s.qty), 0) || 0;

    const getStockTier = (locStock: number, totalStock: number) => {
      if (selectedLocation === 'ALL') {
        return totalStock > 0 ? 0 : 1;
      }
      if (locStock > 0) return 0;
      if (totalStock > 0) return 1;
      return 2;
    };

    const aTier = getStockTier(Number(aLocStock), Number(aTotalStock));
    const bTier = getStockTier(Number(bLocStock), Number(bTotalStock));
    if (aTier !== bTier) return aTier - bTier;

    const aCatOrder = getStorefrontCategoryOrder(a.product_sup);
    const bCatOrder = getStorefrontCategoryOrder(b.product_sup);
    if (aCatOrder !== bCatOrder) return aCatOrder - bCatOrder;

    const aHasDiscount = a.discount_label ? 0 : 1;
    const bHasDiscount = b.discount_label ? 0 : 1;
    if (aHasDiscount !== bHasDiscount) return aHasDiscount - bHasDiscount;

    if (aTotalStock !== bTotalStock) {
      return bTotalStock - aTotalStock;
    }

    return a.id - b.id;
  });

  return filtered;
}

export async function getPosProductsPage(params: {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  selectedCategory?: string;
  storefrontCategory?: string;
  selectedColors?: string[];
  selectedMaterials?: string[];
  selectedBrands?: string[];
  dimensionFilter?: DimensionFilter;
  selectedLocation?: number | 'ALL';
  forceRefresh?: boolean;
}) {
  const cookieStore = await cookies();
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll(); } }
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const { data: profile } = await supabase.from('profiles').select('branch_id').eq('user_id', user.id).single();
  const branchId = profile?.branch_id || 1;

  const cacheRes = await ensurePosCache(params.forceRefresh || false);
  if (!cacheRes.success || !posCache) {
    return { success: false, error: cacheRes.error || "เกิดข้อผิดพลาดในการโหลดสินค้า" };
  }

  const filtered = filterAndSortPosProducts(posCache.products, {
    searchQuery: params.searchQuery,
    selectedCategory: params.selectedCategory,
    storefrontCategory: params.storefrontCategory,
    selectedColors: params.selectedColors,
    selectedMaterials: params.selectedMaterials,
    selectedBrands: params.selectedBrands,
    dimensionFilter: params.dimensionFilter,
    selectedLocation: params.selectedLocation,
    myBranchId: branchId,
  });

  const page = Math.max(1, params.page || 1);
  const pageSize = Math.max(1, params.pageSize || 48);
  const startIndex = (page - 1) * pageSize;
  const pagedProducts = filtered.slice(startIndex, startIndex + pageSize);

  return {
    success: true,
    products: pagedProducts,
    totalCount: filtered.length,
    page,
    pageSize,
    hasMore: (startIndex + pageSize) < filtered.length,
    colorOptions: getPosColorOptions(posCache.products, params.storefrontCategory || 'All'),
    materialOptions: getPosMaterialOptions(posCache.products, params.storefrontCategory || 'All'),
    brandOptions: getPosBrandOptions(posCache.products, params.storefrontCategory || 'All'),
  };
}

export async function getPosData(forceRefresh: boolean = false) {
  const cookieStore = await cookies();
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll(); } }
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const { data: profile } = await supabase.from('profiles').select('branch_id').eq('user_id', user.id).single();
  const branchId = profile?.branch_id || 1;

  const cacheRes = await ensurePosCache(forceRefresh);
  if (!cacheRes.success || !posCache) {
    return { success: false, error: cacheRes.error || "เกิดข้อผิดพลาดในการโหลดข้อมูล" };
  }

  // ✨ ส่งสินค้า 48 ชิ้นแรกที่จัดลำดับตามสาขาของพนักงาน เพื่อให้เปิดหน้าเว็บได้เร็วเสี้ยววินาที (< 250ms)
  const filtered = filterAndSortPosProducts(posCache.products, {
    selectedLocation: branchId,
    myBranchId: branchId,
  });

  const initialProducts = filtered.slice(0, 48);

  return { 
    success: true, 
    products: initialProducts, 
    totalCount: filtered.length,
    hasMore: filtered.length > 48,
    branches: posCache.branches, 
    categories: posCache.categories, 
    sets: posCache.sets || [],
    branchId,
    fromCache: cacheRes.fromCache,
    colorOptions: getPosColorOptions(posCache.products, 'All'),
    materialOptions: getPosMaterialOptions(posCache.products, 'All'),
    brandOptions: getPosBrandOptions(posCache.products, 'All'),
  };
}

export async function getFurnitureProducts(forceRefresh: boolean = false) {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll() } }
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const now = Date.now();
  if (!forceRefresh && furnitureCache && (now - furnitureCache.timestamp < FURNITURE_CACHE_TTL)) {
    return {
      success: true,
      products: furnitureCache.products,
      subcategories: furnitureCache.subcategories,
      brands: furnitureCache.brands,
      fromCache: true
    }
  }

  const { data: furnitureData, error: furnError } = await supabase
    .from('products')
    .select(`
      id, name, sku, price, image_url, barcode, specs, category_id,
      collection_groups ( product_sup, tag, image_url, cover_image_url ),
      stock ( branch_id, qty )
    `)
    .in('category_id', ['furniture', 'SLABS'])
    .order('name', { ascending: true })

  if (furnError) {
    return { success: false, error: "เกิดข้อผิดพลาดในการโหลดข้อมูลเฟอร์นิเจอร์และแผ่นไม้: " + furnError.message }
  }

  const subcatSet = new Set<string>()
  const brandSet = new Set<string>()

  const formattedFurniture = (furnitureData || []).map(p => {
    const rawCol = Array.isArray(p.collection_groups) ? p.collection_groups[0] : p.collection_groups
    const isSlab = p.category_id === 'SLABS' || (p.sku && (p.sku.startsWith('ZLB-') || p.sku.startsWith('LEG-')))
    const specs = (p.specs && typeof p.specs === 'object') ? p.specs : {}

    let resolvedImage: string | null = null
    if (p.image_url && typeof p.image_url === 'string' && p.image_url.trim() !== '') {
      resolvedImage = p.image_url
    } else if (Array.isArray(specs.images) && specs.images.length > 0 && specs.images[0]?.path) {
      resolvedImage = specs.images[0].path
    } else if (rawCol?.image_url) {
      resolvedImage = rawCol.image_url
    } else if (rawCol?.cover_image_url) {
      resolvedImage = rawCol.cover_image_url
    }

    let subcat = rawCol?.product_sup
    if (!subcat) {
      subcat = isSlab ? (specs.material || 'แผ่นไม้ / Wood Slabs') : 'เฟอร์นิเจอร์ทั่วไป'
    }
    subcatSet.add(subcat)

    const brand = getProductBrand(p)
    if (brand && brand !== 'ทั่วไป') {
      brandSet.add(brand)
    }

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      original_price: Number(p.price) || 0,
      price: Number(p.price) || 0,
      discount_label: '',
      image_url: resolvedImage,
      barcode: p.barcode || null,
      product_sup: subcat,
      category_id: p.category_id || (isSlab ? 'SLABS' : 'furniture'),
      isFurniture: p.category_id === 'furniture' || (!isSlab && p.sku?.startsWith('EMBER-')),
      isSlab,
      stocks: Array.isArray(p.stock) ? p.stock : [],
      specs: specs,
      brand: brand || (isSlab ? 'ZENSLABS' : 'Ember & Ash')
    }
  })

  // รับประกันว่ามีชื่อแบรนด์หลักเสมอ
  if (formattedFurniture.some(p => p.isFurniture || p.sku?.startsWith('EMBER-'))) {
    brandSet.add('Ember & Ash')
  }
  if (formattedFurniture.some(p => p.isSlab || p.sku?.startsWith('ZLB-') || p.sku?.startsWith('LEG-'))) {
    brandSet.add('ZENSLABS')
  }

  const subcategories = Array.from(subcatSet).sort()
  const brands = Array.from(brandSet).sort()

  furnitureCache = {
    timestamp: now,
    products: formattedFurniture,
    subcategories,
    brands
  }

  return {
    success: true,
    products: formattedFurniture,
    subcategories,
    brands
  }
}

export async function getSlabsProducts(forceRefresh: boolean = false) {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll() } }
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const now = Date.now();
  if (!forceRefresh && slabsCache && (now - slabsCache.timestamp < SLABS_CACHE_TTL)) {
    return {
      success: true,
      products: slabsCache.products,
      subcategories: slabsCache.subcategories,
      brands: slabsCache.brands,
      fromCache: true
    }
  }

  // ดึงสินค้าแผ่นไม้สแลปทั้งหมด (category_id = 'SLABS' รวมถึงขาโต๊ะ LEG-) ครอบคลุม 1,032+ ชิ้น
  const { data: slabsData, error: slabsError } = await supabase
    .from('products')
    .select(`
      id, name, sku, price, image_url, barcode, specs, category_id,
      collection_groups ( product_sup, tag, image_url, cover_image_url ),
      stock ( branch_id, qty )
    `)
    .or("category_id.eq.SLABS,sku.ilike.ZLB-%,sku.ilike.LEG-%")
    .order('name', { ascending: true })
    .range(0, 2500)

  if (slabsError) {
    return { success: false, error: "เกิดข้อผิดพลาดในการโหลดข้อมูลแผ่นไม้ ZENSLABS: " + slabsError.message }
  }

  const subcatSet = new Set<string>()

  const formattedSlabs = (slabsData || []).map(p => {
    const rawCol = Array.isArray(p.collection_groups) ? p.collection_groups[0] : p.collection_groups
    const specs = (p.specs && typeof p.specs === 'object') ? p.specs : {}

    // ค้นหารูปภาพความละเอียดสูงจาก specs.images[0].path หรือ image_url หรือ collection
    let resolvedImage: string | null = null
    if (p.image_url && typeof p.image_url === 'string' && p.image_url.trim() !== '') {
      resolvedImage = p.image_url
    } else if (Array.isArray(specs.images) && specs.images.length > 0 && specs.images[0]?.path) {
      resolvedImage = specs.images[0].path
    } else if (rawCol?.image_url) {
      resolvedImage = rawCol.image_url
    } else if (rawCol?.cover_image_url) {
      resolvedImage = rawCol.cover_image_url
    }

    // กำหนดประเภทเนื้อไม้ / หมวดหมู่ย่อย (เช่น Black Walnut, White Oak, Maple, ขาโต๊ะ)
    let materialCategory = specs.material || rawCol?.product_sup
    const lowerName = (p.name || '').toLowerCase()
    const skuLower = (p.sku || '').toLowerCase()
    if (!materialCategory) {
      if (lowerName.includes('walnut')) materialCategory = 'North American Black Walnut'
      else if (lowerName.includes('oak')) materialCategory = 'French White Oak'
      else if (lowerName.includes('maple')) materialCategory = 'European Maple Wood'
      else if (lowerName.includes('olive')) materialCategory = 'Italian Olive Wood'
      else if (lowerName.includes('teak')) materialCategory = 'Burmese Teak'
      else if (lowerName.includes('afromosia')) materialCategory = 'Afromosia'
      else if (lowerName.includes('leg') || lowerName.includes('stand') || skuLower.startsWith('leg')) materialCategory = 'ขาโต๊ะ / ขาตั้ง (Leg & Stand)'
      else materialCategory = 'แผ่นไม้ / Wood Slabs'
    } else if (skuLower.startsWith('leg') || lowerName.includes('leg') || lowerName.includes('ขาโต๊ะ') || lowerName.includes('stand')) {
      materialCategory = 'ขาโต๊ะ / ขาตั้ง (Leg & Stand)'
    }
    subcatSet.add(materialCategory)

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      original_price: Number(p.price) || 0,
      price: Number(p.price) || 0,
      discount_label: '',
      image_url: resolvedImage,
      barcode: p.barcode || null,
      product_sup: materialCategory,
      category_id: 'SLABS',
      isFurniture: false,
      isSlab: true,
      stocks: Array.isArray(p.stock) ? p.stock : [],
      specs: specs,
      brand: 'ZENSLABS'
    }
  })

  const subcategories = Array.from(subcatSet).sort()
  const brands = ['ZENSLABS']

  slabsCache = {
    timestamp: now,
    products: formattedSlabs,
    subcategories,
    brands
  }

  return {
    success: true,
    products: formattedSlabs,
    subcategories,
    brands
  }
}

export async function createOrGetCustomProduct(payload: {
  name: string;
  price: number;
  sku?: string;
  categoryLabel?: string;
  unit?: string;
  note?: string;
  branchId?: number;
}) {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll() } }
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const cleanName = payload.name.trim()
  if (!cleanName) return { success: false, error: "กรุณาระบุชื่อสินค้า" }
  const cleanPrice = Math.max(0, Number(payload.price) || 0)
  const cleanSku = payload.sku?.trim() || `EXT-${Date.now().toString().slice(-6)}`
  const branchId = payload.branchId || 1

  // 1. ตรวจสอบว่ามี SKU นี้อยู่แล้วหรือไม่
  const { data: existing } = await supabase
    .from('products')
    .select('id, name, sku, price, image_url, barcode, specs, category_id')
    .eq('sku', cleanSku)
    .limit(1)

  let product: any = null
  if (existing && existing.length > 0) {
    product = existing[0]
  } else {
    // 2. สร้างสินค้าใหม่ลงในตาราง products
    const { data: created, error: insertError } = await supabase
      .from('products')
      .insert({
        name: cleanName,
        sku: cleanSku,
        price: cleanPrice,
        unit: payload.unit || 'ชิ้น',
        category_id: payload.categoryLabel?.includes('Prop') ? 'prop' : 'furniture',
        status: 'active',
        specs: {
          is_custom: true,
          note: payload.note || '',
          category_label: payload.categoryLabel || 'เฟอร์นิเจอร์'
        }
      })
      .select('id, name, sku, price, image_url, barcode, specs, category_id')
      .single()

    if (insertError) {
      return { success: false, error: "ไม่สามารถสร้างสินค้านอกระบบได้: " + insertError.message }
    }
    product = created
  }

  // 3. ใส่สต็อกเริ่มต้นสำหรับสาขา เพื่อให้ระบบไม่ติดขัด
  try {
    await supabase.from('stock').upsert({
      product_id: product.id,
      branch_id: branchId,
      qty: 999
    }, { onConflict: 'product_id,branch_id' })
  } catch {}

  const formattedProduct = {
    id: product.id,
    name: product.name,
    sku: product.sku,
    original_price: Number(product.price) || cleanPrice,
    price: Number(product.price) || cleanPrice,
    discount_label: '',
    image_url: product.image_url || null,
    barcode: product.barcode || null,
    product_sup: payload.categoryLabel || 'สินค้านอกรายการ',
    category_id: payload.categoryLabel?.includes('Prop') ? 'prop' : 'furniture',
    isExternal: true,
    isFurniture: !payload.categoryLabel?.includes('Prop'),
    stocks: [{ branch_id: branchId, qty: 999 }],
    specs: product.specs || {}
  }

  return { success: true, product: formattedProduct }
}

export async function validatePosCoupon(code: string, currentSubtotal: number, eligibleSubtotal?: number) {
  if (!code || !code.trim()) {
    return { success: false, error: "กรุณากรอกรหัสคูปอง" }
  }
  const cleanCode = code.trim().toUpperCase()
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll() } }
  })
  const now = new Date().toISOString()

  // 1. ตรวจสอบจาก terra_collection_promotions (Global Coupon Code)
  const { data: terraCoupons } = await supabase
    .from('terra_collection_promotions')
    .select('*')
    .ilike('coupon_code', cleanCode)
    .eq('is_active', true)

  if (terraCoupons && terraCoupons.length > 0) {
    const promo = terraCoupons[0]
    if (promo.start_date && promo.start_date > now) {
      return { success: false, error: "คูปองนี้ยังไม่เริ่มใช้งาน" }
    }
    if (promo.end_date && promo.end_date < now) {
      return { success: false, error: "คูปองนี้หมดอายุแล้ว" }
    }
    if (promo.usage_limit && promo.used_count >= promo.usage_limit) {
      return { success: false, error: "คูปองนี้ถูกใช้งานครบจำนวนสิทธิ์แล้ว" }
    }
    let isTopUp = false;
    let isTiered = false;
    let tiers: any[] = [];
    let attribution: {
      leadSales: string;
      partnerCompany: string;
      partnerSales: string;
      note?: string;
      isTiered?: boolean;
      tiers?: any[];
      isTopUp?: boolean;
    } | null = null;

    try {
      if (promo.description && promo.description.trim().startsWith('{')) {
        const parsed = JSON.parse(promo.description);
        isTopUp = Boolean(parsed.is_top_up || parsed.isTopUp);
        if (parsed.is_tiered && Array.isArray(parsed.tiers) && parsed.tiers.length > 0) {
          isTiered = true;
          tiers = parsed.tiers;
        }
        if (parsed.lead_sales || parsed.partner_company || parsed.partner_sales) {
          attribution = {
            leadSales: parsed.lead_sales || '',
            partnerCompany: parsed.partner_company || '',
            partnerSales: parsed.partner_sales || '',
            note: parsed.note || '',
            isTiered,
            tiers,
            isTopUp,
          };
        }
      }
    } catch {}

    if (!isTopUp && (promo.title.toLowerCase().includes('top up') || promo.title.toLowerCase().includes('top-up') || promo.title.includes('ลด On-top') || promo.title.includes('Top up') || promo.title.includes('Top-up'))) {
      isTopUp = true;
    }

    // 🏷️ ฐานคำนวณส่วนลด:
    // หากเป็นคูปองแบบ Top-up (On-top) สามารถลดเพิ่มจากยอดขายปัจจุบัน (currentSubtotal) ได้เลย แม้สินค้าในบิลจะลด 50% แล้วก็ตาม
    // หากไม่ใช่ Top-up จะคิดเฉพาะสินค้าที่ไม่มีส่วนลดรายชิ้น (eligibleSubtotal)
    const calcBase = isTopUp 
      ? currentSubtotal 
      : (eligibleSubtotal !== undefined ? eligibleSubtotal : currentSubtotal);

    if (calcBase <= 0) {
      if (isTopUp) {
        return { success: false, error: "ยอดรวมสินค้าในบิลต้องมากกว่า 0 บาท" }
      }
      return { success: false, error: "สินค้าในบิลมีส่วนลดรายชิ้นอยู่แล้ว จึงไม่สามารถใช้โค้ดลดร่วมได้ครับ (ต้องใช้โค้ดประเภท Top-up เท่านั้น)" }
    }

    let discountAmount = 0;
    let effectiveDiscountType = promo.discount_type;
    let effectiveDiscountValue = Number(promo.discount_value);

    if (isTiered && tiers.length > 0) {
      const sortedTiers = [...tiers].sort((a, b) => Number(b.min_spend) - Number(a.min_spend));
      const lowestMinSpend = Number(sortedTiers[sortedTiers.length - 1].min_spend || 0);

      if (calcBase < lowestMinSpend) {
        return {
          success: false,
          error: `ยอดซื้อสินค้าที่ร่วมรายการต้องครบ ฿${lowestMinSpend.toLocaleString()} ขึ้นไป สำหรับโค้ดขั้นบันไดนี้ (ยอดร่วมรายการปัจจุบัน ฿${calcBase.toLocaleString()})`
        };
      }

      const matchedTier = sortedTiers.find((t) => calcBase >= Number(t.min_spend)) || sortedTiers[sortedTiers.length - 1];
      effectiveDiscountType = matchedTier.discount_type || 'percentage';
      effectiveDiscountValue = Number(matchedTier.discount_value);

      if (effectiveDiscountType === 'percentage') {
        discountAmount = (calcBase * effectiveDiscountValue) / 100;
        if (promo.max_discount_amount && discountAmount > Number(promo.max_discount_amount)) {
          discountAmount = Number(promo.max_discount_amount);
        }
      } else {
        discountAmount = Math.min(calcBase, effectiveDiscountValue);
      }
    } else {
      const minSpend = Number(promo.min_spend || 0);
      if (minSpend > 0 && calcBase < minSpend) {
        return { 
          success: false, 
          error: `ยอดซื้อสินค้าที่ร่วมรายการต้องครบ ฿${minSpend.toLocaleString()} ขึ้นไป (ยอดร่วมรายการปัจจุบัน ฿${calcBase.toLocaleString()})` 
        };
      }

      if (promo.discount_type === 'percentage') {
        discountAmount = (calcBase * Number(promo.discount_value)) / 100;
        if (promo.max_discount_amount && discountAmount > Number(promo.max_discount_amount)) {
          discountAmount = Number(promo.max_discount_amount);
        }
      } else {
        discountAmount = Math.min(calcBase, Number(promo.discount_value));
      }
    }

    return {
      success: true,
      coupon: {
        id: promo.id,
        code: cleanCode,
        title: promo.title,
        discountType: (effectiveDiscountType === 'percentage' ? 'percentage' : 'fixed_amount') as 'percentage' | 'fixed_amount',
        discountValue: effectiveDiscountValue,
        discountAmount: Math.round(discountAmount),
        source: 'terra',
        isTopUp,
        isTiered,
        tiers: isTiered ? tiers : undefined,
        minSpend: Number(promo.min_spend || 0),
        maxDiscountAmount: promo.max_discount_amount ? Number(promo.max_discount_amount) : undefined,
        attribution
      }
    }
  }

  // 2. ตรวจสอบจากตาราง discounts (POS Discount Code)
  const { data: posDiscounts } = await supabase
    .from('discounts')
    .select('*')
    .ilike('code', cleanCode)
    .eq('active', true)

  if (posDiscounts && posDiscounts.length > 0) {
    const disc = posDiscounts[0]
    if (disc.start_date && disc.start_date > now) {
      return { success: false, error: "ส่วนลดนี้ยังไม่เริ่มใช้งาน" }
    }
    if (disc.end_date && disc.end_date < now) {
      return { success: false, error: "ส่วนลดนี้หมดอายุแล้ว" }
    }

    const isTopUp = Boolean(disc.name && (disc.name.toLowerCase().includes('top up') || disc.name.toLowerCase().includes('top-up') || disc.name.includes('on-top') || disc.name.includes('Top up')));
    const calcBase = isTopUp 
      ? currentSubtotal 
      : (eligibleSubtotal !== undefined ? eligibleSubtotal : currentSubtotal);

    if (calcBase <= 0) {
      if (isTopUp) {
        return { success: false, error: "ยอดรวมสินค้าในบิลต้องมากกว่า 0 บาท" }
      }
      return { success: false, error: "สินค้าในบิลมีส่วนลดรายชิ้นอยู่แล้ว จึงไม่สามารถใช้โค้ดลดร่วมได้ครับ (ต้องใช้โค้ดประเภท Top-up เท่านั้น)" }
    }

    let discountAmount = 0
    if (disc.discount_type === 'PERCENT') {
      discountAmount = (calcBase * Number(disc.value)) / 100
    } else {
      discountAmount = Math.min(calcBase, Number(disc.value))
    }

    return {
      success: true,
      coupon: {
        id: disc.id,
        code: cleanCode,
        title: disc.name,
        discountType: (disc.discount_type === 'PERCENT' ? 'percentage' : 'fixed_amount') as 'percentage' | 'fixed_amount',
        discountValue: Number(disc.value),
        discountAmount: Math.round(discountAmount),
        source: 'pos',
        isTopUp,
      }
    }
  }

  return { success: false, error: "ไม่พบรหัสคูปองนี้ หรือคูปองหมดอายุแล้ว" }
}

export interface CheckoutPayload {
  orderId?: number;          // ✨ รองรับการแก้ไขบิลเดิม
  orderCode?: string;        // ✨ รองรับการแก้ไขบิลเดิม
  customOrderCode?: string | null; // ✨ รหัสออเดอร์ที่ผู้ใช้กรอกเอง
  branchId: number; 
  subtotal: number;       
  discountAmount: number; 
  totalAmount: number;    
  shippingCost?: number;          // 🚚 ค่าจัดส่ง / ค่าบริการส่ง
  shippingWaived?: boolean;        // 🚚 สิทธิ์ไม่คิดค่าส่งกับลูกค้า (ยอดถึง 20,000฿) บันทึกเฉพาะต้นทุน
  saleMode: 'TAKE_AWAY' | 'DELIVERY';
  shippingName?: string | null;
  shippingPhone?: string | null;
  shippingAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  companyNameTh?: string | null;     // ✨ ชื่อบริษัท (ไทย)
  companyNameEn?: string | null;     // ✨ ชื่อบริษัท (อังกฤษ)
  companyAddress?: string | null;  // ✨ เพิ่มข้อมูลบริษัท
  taxId?: string | null;           // ✨ เพิ่มข้อมูลบริษัท
  specialDiscountPercent?: number;  // ✨ ส่วนลดพิเศษ %
  specialDiscountBaht?: number;     // ✨ ส่วนลดพิเศษ บาท
  couponId?: number | null;         // 🎟️ ID คูปอง (terra_collection_promotions)
  couponCode?: string | null;       // 🎟️ โค้ดคูปอง
  couponDiscountAmount?: number;    // 🎟️ มูลค่าส่วนลดคูปอง
  couponAttribution?: {             // 🤝 ข้อมูลเซลล์ / คู่ค้าผู้ได้รับสิทธิ์
    leadSales?: string;
    partnerCompany?: string;
    partnerSales?: string;
    note?: string;
  } | null;
  vatAmount?: number;               // ✨ ยอดภาษี VAT (7%)
  setDiscountAmount?: number;       // 📦 มูลค่าส่วนลดเซ็ต
  appliedSetPromos?: any[];         // 📦 ข้อมูลเซ็ตโปรโมชั่นที่ได้รับ
  items: {
    productId: number; 
    qty: number; 
    priceAtSale: number; 
    originalPrice: number;
    fulfillBranchId: number;
    discountId?: number | null;
    discountName?: string | null;
    discountAmountPerPiece: number;
    isExternal?: boolean;
    isFurniture?: boolean;
    isSlab?: boolean;
    category_id?: string | null;
  }[];
}

export interface CheckoutResult {
  success: boolean;
  orderCode?: string;
  error?: string;
  outOfStockProductIds?: string[];
}

export async function processCheckout(payload: CheckoutPayload): Promise<CheckoutResult> {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: { 
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet) {
        try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch (error) {}
      }
    }
  })

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // 🏷️ กฎเหล็ก: บล็อกการสร้างใบเสนอราคาหากมีสินค้าที่ราคาเป็น 0 ฿ หรือยอดรวม <= 0 ฿
    if (!payload.items || payload.items.length === 0) {
      return { success: false, error: "ไม่สามารถสร้างใบเสนอราคาได้: ไม่มีรายการสินค้าในตะกร้า" }
    }

    const zeroPriceItem = payload.items.find(item => !item.priceAtSale || Number(item.priceAtSale) <= 0)
    if (zeroPriceItem) {
      return {
        success: false,
        error: "ไม่สามารถสร้างใบเสนอราคาได้: มีสินค้าที่ยังไม่ได้ระบุราคา (0 ฿) กรุณาตั้งราคาขายให้ครบทุกรายการก่อนออกใบเสนอราคาครับ"
      }
    }

    if (!payload.totalAmount || Number(payload.totalAmount) <= 0) {
      return {
        success: false,
        error: "ไม่สามารถสร้างใบเสนอราคาได้: ยอดสุทธิของใบเสนอราคาต้องมากกว่า 0 บาท"
      }
    }

    // 🏷️ กฎธุรกิจ: สินค้าพรอพ (Prop) ไม่สามารถรวมกับเฟอร์นิเจอร์ (Furniture) หรือแผ่นไม้ (Wood Slabs) ในบิลเดียวกันได้
    // แต่ เฟอร์นิเจอร์ กับ แผ่นไม้ สามารถรวมในบิลเดียวกันได้!
    const hasProp = payload.items.some(i => !i.isFurniture && !i.isSlab && i.category_id !== 'furniture' && i.category_id !== 'SLABS' && !((i as any).sku && ((i as any).sku.startsWith('ZLB-') || (i as any).sku.startsWith('LEG-'))))
    const hasFurnOrWood = payload.items.some(i => i.isFurniture || i.isSlab || i.category_id === 'furniture' || i.category_id === 'SLABS' || ((i as any).sku && ((i as any).sku.startsWith('ZLB-') || (i as any).sku.startsWith('LEG-'))))
    if (hasProp && hasFurnOrWood) {
      return {
        success: false,
        error: "ไม่สามารถรวมสินค้าพรอพ กับเฟอร์นิเจอร์หรือแผ่นไม้ในบิลเดียวกันได้ (กรุณาแยกบิลครับ)"
      }
    }

    const previousOrderCode = payload.orderCode?.trim()
    const requestedOrderCode = payload.customOrderCode?.trim()
    const orderCode = requestedOrderCode || previousOrderCode || `INV${Date.now()}`

    const isSlabOrder = payload.items.some(i => 
      i.isSlab || 
      i.category_id === 'SLABS' || 
      (typeof (i as any).sku === 'string' && ((i as any).sku.startsWith('ZLB-') || (i as any).sku.startsWith('LEG-') || (i as any).sku.startsWith('WOOD-')))
    )

    const usedDiscounts = payload.items
      .filter(item => item.discountId)
      .map(item => ({ id: item.discountId, name: item.discountName, amount_per_piece: item.discountAmountPerPiece }))

    const discountSnapshot: any = {
      item_discounts: usedDiscounts,
      special_discount: {
        percent: payload.specialDiscountPercent || 0,
        baht: payload.specialDiscountBaht || 0
      }
    }
    if (isSlabOrder) {
      discountSnapshot.is_slab_order = true
      discountSnapshot.wood_permit_fee = 5000
      discountSnapshot.deposit_percent = 50
    }
    if (payload.couponCode) {
      discountSnapshot.coupon = {
        id: payload.couponId || null,
        code: payload.couponCode,
        discount_amount: payload.couponDiscountAmount || 0,
        lead_sales: payload.couponAttribution?.leadSales || null,
        partner_company: payload.couponAttribution?.partnerCompany || null,
        partner_sales: payload.couponAttribution?.partnerSales || null,
        note: payload.couponAttribution?.note || null
      }
    }
    if (payload.appliedSetPromos && payload.appliedSetPromos.length > 0) {
      discountSnapshot.set_promotions = payload.appliedSetPromos
      discountSnapshot.set_discount_amount = payload.setDiscountAmount || 0
    }
    if (payload.shippingCost !== undefined && payload.shippingCost !== null) {
      discountSnapshot.shipping_cost = Number(payload.shippingCost) || 0
      discountSnapshot.shipping_waived = Boolean(payload.shippingWaived)
    }
    // ✨ 0. เช็คสต็อก (บันทึกข้อมูลสินค้าที่สต็อกไม่พอลง Snapshot แต่ไม่บล็อกการสร้างใบเสนอราคา)
    const outOfStockItems: string[] = []
    
    // ดึงสต็อกเฉพาะสินค้าที่ต้องตรวจสต็อก (ไม่รวมสินค้านอก, เฟอร์นิเจอร์ หรือแผ่นไม้)
    const stockCheckedItems = payload.items.filter(item => 
      !item.isExternal && 
      !item.isFurniture && 
      !item.isSlab && 
      item.category_id !== 'furniture' && 
      item.category_id !== 'SLABS' &&
      !((item as any).sku && ((item as any).sku.startsWith('ZLB-') || (item as any).sku.startsWith('LEG-')))
    )
    const productIds = stockCheckedItems.map(item => item.productId)
    
    if (productIds.length > 0) {
      const { data: allStocks } = await supabase
        .from('stock')
        .select('product_id, branch_id, qty')
        .in('product_id', productIds)

      for (const item of stockCheckedItems) {
        const stockCheck = allStocks?.find(s => s.product_id === item.productId && s.branch_id === item.fulfillBranchId)
        if (!stockCheck || stockCheck.qty < item.qty) {
          outOfStockItems.push(item.productId.toString())
        }
      }

      if (outOfStockItems.length > 0) {
        discountSnapshot.out_of_stock_products = outOfStockItems
        discountSnapshot.is_preorder = true
      }
    }
    
    // ✨ 1. เช็คหลังบ้านเลยว่า บิลนี้มีการดึงของสาขาอื่นมาด้วยไหม?
    const hasCrossBranchItems = payload.items.some(item => item.fulfillBranchId !== payload.branchId)

    // ✨ 2. บังคับสถานะบิลหลัก: ถ้าเซลล์กดจัดส่ง "หรือ" มีการดึงของข้ามสาขา บังคับบิลนี้เป็น PENDING ทันที
    const orderStatus = 'PENDING'

    // 💰 ปัดเศษทศนิยมให้แม่นยำ 2 ตำแหน่ง ป้องกันปัญหา Floating Point บั๊ก
    const finalSubtotal = Math.round(Number(payload.subtotal) * 100) / 100
    const finalDiscountAmount = Math.round(Number(payload.discountAmount) * 100) / 100
    const finalTotalAmount = Math.round(Number(payload.totalAmount) * 100) / 100
    const finalVatAmount = payload.vatAmount !== undefined && payload.vatAmount !== null
      ? Math.round(Number(payload.vatAmount) * 100) / 100
      : Math.round((finalTotalAmount - (finalTotalAmount / 1.07)) * 100) / 100

    if (isSlabOrder) {
      discountSnapshot.deposit_amount = Math.round(finalTotalAmount * 0.5 * 100) / 100
      discountSnapshot.remaining_balance = Math.round((finalTotalAmount - discountSnapshot.deposit_amount) * 100) / 100
    }

    let order;
    if (payload.orderId) {
      // 🛠️ อัปเดตบิลเก่าที่ยัง PENDING
      const { data: existingOrder } = await supabase.from('orders').select('status').eq('id', payload.orderId).single()
      if (existingOrder?.status !== 'PENDING') throw new Error("บิลนี้ชำระเงินหรือประมวลผลไปแล้ว ไม่สามารถแก้ไขได้")

      // อัปเดตหัวบิลและตรวจเลขซ้ำให้ผ่านก่อน จึงค่อยลบ/สร้างรายการสินค้าใหม่
      const updateRes = await supabase
        .from('orders')
        .update({
          order_code: orderCode,
          subtotal: finalSubtotal, 
          discount_amount: finalDiscountAmount, 
          total_amount: finalTotalAmount, 
          vat_amount: finalVatAmount,
          discount_snapshot: discountSnapshot, 
          shipping_name: payload.shippingName || null,                      
          shipping_phone: payload.shippingPhone || null,
          shipping_address: payload.shippingAddress || null,
          latitude: payload.latitude || null,   
          longitude: payload.longitude || null,
          company_name_th: payload.companyNameTh || null,
          company_name_en: payload.companyNameEn || null,
          company_address: payload.companyAddress || null,
          tax_id: payload.taxId || null,
          special_discount_percent: payload.specialDiscountPercent || 0,
          special_discount_baht: payload.specialDiscountBaht || 0
        })
        .eq('id', payload.orderId)
        .select('id').single()

      if (updateRes.error) {
        if (updateRes.error.code === '23505') {
          throw new Error("เลข Invoice นี้มีอยู่ในระบบแล้ว กรุณาใช้เลขอื่น")
        }
        throw new Error("อัปเดตบิลไม่สำเร็จ: " + updateRes.error.message)
      }
      order = updateRes.data

      const [deleteRes, oldTransfersRes] = await Promise.all([
        supabase.from('order_items').delete().eq('order_id', payload.orderId),
        supabase.from('stock_transfers').select('id').like('note', `%${previousOrderCode || orderCode}%`)
      ])
      if (deleteRes.error) throw new Error("ล้างรายการสินค้าเดิมไม่สำเร็จ: " + deleteRes.error.message)
      
      // ลบ stock_transfers ของเดิมทิ้งก่อน (ถ้ามี)
      const oldTransfers = oldTransfersRes.data
      if (oldTransfers && oldTransfers.length > 0) {
        const tIds = oldTransfers.map(t => t.id)
        // สามารถรอให้ลบเสร็จได้เลย เพราะเป็นขั้นตอนต่อเนื่อง
        await supabase.from('stock_transfer_items').delete().in('transfer_id', tIds)
        await supabase.from('stock_transfers').delete().in('id', tIds)
      }
    } else {
      // 🆕 สร้างบิลใหม่
      const { data, error: insertError } = await supabase
        .from('orders')
        .insert({
          order_code: orderCode, 
          user_id: user.id, 
          branch_id: payload.branchId,
          subtotal: finalSubtotal, 
          discount_amount: finalDiscountAmount, 
          total_amount: finalTotalAmount, 
          vat_amount: finalVatAmount,
          status: orderStatus, 
          device_type: 'WEB_ADMIN',
          discount_snapshot: discountSnapshot, 
          shipping_name: payload.shippingName || null,                      
          shipping_phone: payload.shippingPhone || null,
          shipping_address: payload.shippingAddress || null,
          latitude: payload.latitude || null,   
          longitude: payload.longitude || null,
          company_name_th: payload.companyNameTh || null,
          company_name_en: payload.companyNameEn || null,
          company_address: payload.companyAddress || null,
          tax_id: payload.taxId || null,
          special_discount_percent: payload.specialDiscountPercent || 0,
          special_discount_baht: payload.specialDiscountBaht || 0
        }).select('id').single()

      if (insertError) {
         if (insertError.code === '23505') {
            throw new Error("รหัสออเดอร์นี้มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น")
         }
         throw new Error("สร้างบิลไม่สำเร็จ: " + insertError.message)
      }
      order = data
    }

    // ✨ 3. บังคับสถานะรายชิ้น (หัวใจหลักที่ทำให้บั๊ก!)
    const orderItems = payload.items.map(item => {
      // ถามก่อนว่าชิ้นนี้คือของสาขาเราเองใช่ไหม?
      const isMyBranchItem = item.fulfillBranchId === payload.branchId;
      
     // ❌ ลบหรือคอมเมนต์โค้ดบรรทัดเก่าทิ้งไปเลยครับ
      /*
      const itemStatus = isMyBranchItem 
        ? (payload.saleMode === 'TAKE_AWAY' ? 'DELIVERED' : 'PENDING_SHIPMENT') 
        : 'PENDING_SHIPMENT';
      */
     const itemStatus = 'PENDING_SHIPMENT';
      return {
        order_id: order.id, 
        product_id: item.productId, 
        qty: item.qty,
        price_at_sale: item.priceAtSale, 
        total_item_amount: item.priceAtSale * item.qty,
        fulfill_branch_id: item.fulfillBranchId,
        discount_id: item.discountId || null,
        discount_name: item.discountName || null,
        discount_amount_per_piece: item.discountAmountPerPiece,
        item_status: itemStatus // <--- ใช้สถานะรายชิ้นที่ถูกบังคับแล้ว
      }
    })
    
    const insertOrderItemsPromise = supabase.from('order_items').insert(orderItems)
    const pendingPromises: PromiseLike<any>[] = [insertOrderItemsPromise]

    // 4. แยกกลุ่มตัดสต็อก
    const localItems = payload.items.filter(item => item.fulfillBranchId === payload.branchId)
    const remoteItems = payload.items.filter(item => item.fulfillBranchId !== payload.branchId && !item.isExternal)

    // 4.1 สต็อกในสาขาตัวเอง (ปิดการตัดสต็อกอัตโนมัติชั่วคราว)
    // สำหรับ localItems ยังคอมเมนต์ไว้อยู่ ไม่ต้องทำอะไร

    // 4.2 สต็อกต่างสาขา (Drop Ship) 
    if (remoteItems.length > 0) {
      const groupedByBranch = remoteItems.reduce((acc, item) => {
        if (!acc[item.fulfillBranchId]) acc[item.fulfillBranchId] = []
        acc[item.fulfillBranchId].push(item)
        return acc
      }, {} as Record<number, typeof remoteItems>)

      for (const [remoteBranchId, items] of Object.entries(groupedByBranch)) {
        // ประมวลผลแต่ละสาขาแบบขนานกัน
        const processRemoteBranch = async () => {
          const transferCode = `DP-AUTO-${Date.now()}-${remoteBranchId}`
          const { data: transferOrder, error: tfError } = await supabase
            .from('stock_transfers')
            .insert({
              transfer_code: transferCode,
              from_branch_id: Number(remoteBranchId),
              to_branch_id: payload.branchId, 
              status: 'AWAITING_SHIPMENT', 
              note: `[ใบเบิกแพ็คอัตโนมัติจากใบขาย ${orderCode}] \nผู้รับ: ${payload.shippingName} \nโทร: ${payload.shippingPhone} \nที่อยู่จัดส่ง: ${payload.shippingAddress}`,
              created_by: user.id
            }).select('id').single()

          if (tfError) throw new Error("ระบบสร้างใบแจ้งแพ็คของข้ามสาขาล้มเหลว")

          const transferItems = items.map(item => ({
            transfer_id: transferOrder.id,
            product_id: item.productId,
            qty: item.qty,
            transfer_qty: item.qty,
            item_status: 'AWAITING_SHIPMENT'
          }))
          await supabase.from('stock_transfer_items').insert(transferItems)
        }
        pendingPromises.push(processRemoteBranch())
      }
    }

    // รอให้ทั้ง order_items และ stock_transfers ทำงานเสร็จพร้อมกัน
    const results = await Promise.all(pendingPromises)
    const itemsError = results[0]?.error
    if (itemsError) throw new Error("บันทึกรายการสินค้าล้มเหลว: " + itemsError.message)

    // ✨ เคลียร์แคชเพื่อให้รอบต่อไปดึงข้อมูลสต็อกใหม่ล่าสุด
    posCache = null

    return { success: true, orderCode }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getNearbyStock(productId: number, currentBranchId: number) {
  const cookieStore = await cookies() 
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { cookies: { getAll() { return cookieStore.getAll() } } })
  const { data, error } = await supabase.rpc('get_nearby_stock', { p_current_branch_id: currentBranchId, p_product_id: productId })
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function getOrderForEdit(orderCode: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { 
    cookies: { getAll() { return cookieStore.getAll() } } 
  })

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id, order_code, status, shipping_name, shipping_phone, shipping_address, latitude, longitude, company_name_th, company_name_en, company_address, tax_id, special_discount_percent, special_discount_baht, discount_snapshot,
      order_items (
        id, product_id, qty, price_at_sale, fulfill_branch_id, discount_id, discount_name, discount_amount_per_piece,
        branches!order_items_fulfill_branch_fk ( branch_name )
      )
    `)
    .eq('order_code', orderCode)
    .single()

  if (error || !order) return { success: false, error: error?.message || "ไม่พบบิลนี้ในระบบ" }
  if (order.status !== 'PENDING') return { success: false, error: "บิลนี้ชำระเงินหรือประมวลผลไปแล้ว ไม่สามารถแก้ไขได้" }

  return { success: true, order }
}

export async function updateProductPrice(productId: number, newPrice: number) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { 
      cookies: { getAll() { return cookieStore.getAll() } } 
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" }

    const cleanId = Number(productId)
    const cleanPrice = Math.round(Number(newPrice) * 100) / 100

    if (!cleanId || isNaN(cleanId)) {
      return { success: false, error: "รหัสสินค้าไม่ถูกต้อง" }
    }

    if (isNaN(cleanPrice) || cleanPrice <= 0) {
      return { success: false, error: "กรุณาระบุราคาขายที่มากกว่า 0 บาท" }
    }

    // 💡 ใช้ Supabase Service Role เพื่อบันทึกราคาลงตาราง products ในฐานข้อมูลจริง
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!
    const adminClient = createClient(process.env.SUPABASE_URL!, supabaseKey)

    const { data, error } = await adminClient
      .from('products')
      .update({ price: cleanPrice })
      .eq('id', cleanId)
      .select('id, name, sku, price')
      .single()

    if (error) {
      console.error("updateProductPrice error:", error)
      return { success: false, error: "ไม่สามารถบันทึกราคาลงฐานข้อมูลได้: " + error.message }
    }

    // ล้าง In-memory cache เพื่อให้การโหลดครั้งต่อไปดึงราคาใหม่ทันที
    await clearPosCache()

    return { 
      success: true, 
      product: data, 
      price: cleanPrice,
      message: `บันทึกราคา ฿${cleanPrice.toLocaleString()} ลงฐานข้อมูลเรียบร้อยแล้ว` 
    }
  } catch (err: any) {
    console.error("updateProductPrice unexpected error:", err)
    return { success: false, error: "เกิดข้อผิดพลาด: " + (err.message || String(err)) }
  }
}
