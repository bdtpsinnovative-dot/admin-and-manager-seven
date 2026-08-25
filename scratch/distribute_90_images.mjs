import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://zexflchjcycxrpjkuews.supabase.co"
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleGZsY2hqY3ljeHJwamt1ZXdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTE3MzI1MSwiZXhwIjoyMDgwNzQ5MjUxfQ.pido18JCSsVYcEriGWqHwOPWImBM8v6-5GP5bPb7e3M"

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const urls = [
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651276691-480.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651275432-604.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651274180-741.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651272709-261.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651271413-160.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651264967-978.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651266140-373.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651267467-36.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651268641-386.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651270090-178.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651263652-68.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651262236-297.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651260712-642.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651259394-921.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651258173-251.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651251701-74.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651255613-996.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651256919-358.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651254296-252.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651253074-120.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651244737-978.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651246300-621.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651247573-978.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651248991-764.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651250336-390.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651243265-152.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651241969-938.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651240602-528.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651238952-671.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651237413-153.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651230144-737.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651232832-780.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651234112-682.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651231400-549.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651235520-177.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651228809-828.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651226211-873.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651224878-673.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651223388-120.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651227396-735.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651221971-222.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651220712-574.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651219416-289.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651218151-626.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651216739-212.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651210209-316.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651211602-958.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651212853-553.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651214163-548.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651215447-742.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651208975-705.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651207627-993.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651206332-816.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651205080-382.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651203898-670.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651196786-711.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651198041-28.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651200666-978.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651202364-412.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651195565-949.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651194340-676.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651192698-307.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651189957-396.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651191417-218.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651185665-190.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651184363-28.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651187066-133.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651188273-412.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651181669-705.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651180271-642.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651178746-299.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651177511-631.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651176134-177.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651168949-89.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651170259-825.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651171560-76.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651173080-394.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651174601-360.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651167630-685.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651157036-899.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651166095-776.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651164649-653.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651155741-211.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651163108-116.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651154340-78.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651160381-421.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651152853-138.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651158789-691.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651199413-878.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787651183008-92.webp"
]

const categoriesData = [
  {
    sort_order: 1,
    title_en: "VASE & VESSELS",
    title_th: "แจกันและภาชนะ",
    slug: "vase-and-vessels",
    category_query: "Vase",
    description_en: "Vases and vessels with organic silhouettes and tactile finishes designed to hold botanicals or stand alone as sculpture.",
    description_th: "แจกันและภาชนะดีไซน์มินิมอล ช่วยเติมความสดชื่นและเอกลักษณ์ให้กับทุกมุมของบ้าน",
  },
  {
    sort_order: 2,
    title_en: "FIGURE",
    title_th: "ตุ๊กตาตกแต่ง",
    slug: "figure",
    category_query: "FIGURE",
    description_en: "Artful figures and charming collectibles that bring warmth and character to shelves and mantels.",
    description_th: "ตุ๊กตาและรูปปั้นตกแต่งชิ้นเล็ก สะท้อนความน่ารักและอบอุ่น",
  },
  {
    sort_order: 3,
    title_en: "SCULPTURE",
    title_th: "ประติมากรรมตกแต่ง",
    slug: "sculpture",
    category_query: "Sculpture",
    description_en: "Sculptural forms that celebrate texture, light, and understated elegance in modern living.",
    description_th: "งานประติมากรรมที่เติมเสน่ห์อันเรียบสงบและมีมิติให้กับพื้นที่",
  },
  {
    sort_order: 4,
    title_en: "BOOKED",
    title_th: "ตกแต่งชั้นหนังสือ",
    slug: "booked",
    category_query: "BOOKED",
    description_en: "Bookends and shelf decor designed to bring structure and sophistication to your book collection.",
    description_th: "ของตกแต่งชั้นหนังสือและที่คั่นหนังสือสะท้อนรสนิยมอันสง่างาม",
  },
  {
    sort_order: 5,
    title_en: "CANDLE HOLDERS",
    title_th: "เชิงเทียน",
    slug: "candle-holders",
    category_query: "CANDLE HOLDERS",
    description_en: "Candle holders with sculptural forms that cast a warm, intimate glow over living spaces.",
    description_th: "เชิงเทียนช่วยเติมบรรยากาศอบอุ่นและความโรแมนติกในทุกช่วงเวลา",
  },
  {
    sort_order: 6,
    title_en: "ACCESSORIES",
    title_th: "ของตกแต่งอื่น ๆ",
    slug: "accessories",
    category_query: "Accessories",
    description_en: "Curated home accessories that add subtle depth and finishing touches to every interior.",
    description_th: "ของตกแต่งและพร็อพคัดสรรพิเศษเพื่อสร้างบรรยากาศที่สมบูรณ์แบบ",
  },
  {
    sort_order: 7,
    title_en: "DINING & TABLEWARE",
    title_th: "เครื่องใช้บนโต๊ะอาหาร",
    slug: "dining-and-tableware",
    category_query: "Dining",
    description_en: "Refined tableware and dining accents that make everyday dining feel like a special occasion.",
    description_th: "เครื่องใช้บนโต๊ะอาหารดีไซน์ประณีต ยกระดับทุกมื้ออาหาร",
  },
  {
    sort_order: 8,
    title_en: "DRESSING & BATH",
    title_th: "ของใช้ในห้องน้ำและห้องแต่งตัว",
    slug: "dressing-and-bath",
    category_query: "Bath",
    description_en: "Thoughtfully crafted accents for the bath and vanity that promote calm, orderly routines.",
    description_th: "ของใช้และของตกแต่งห้องแต่งตัวและห้องน้ำเพื่อความผ่อนคลาย",
  },
  {
    sort_order: 9,
    title_en: "ART & WALL DECOR",
    title_th: "งานศิลปะและของตกแต่งผนัง",
    slug: "art-and-wall-decor",
    category_query: "Wall Decor",
    description_en: "Wall art and decorative hanging pieces that transform empty walls into inspired galleries.",
    description_th: "งานศิลปะและของตกแต่งผนังเพิ่มมิติและเรื่องราวให้กับพื้นที่",
  }
]

async function run() {
  console.log("Cleaning up old journal tables...")
  await supabase.from("journal_images").delete().neq("id", -1)
  await supabase.from("journal_categories").delete().neq("slug", "never-match")

  console.log("Creating 9 categories and distributing 90 images (10 images per category)...")

  for (let catIdx = 0; catIdx < categoriesData.length; catIdx++) {
    const cat = categoriesData[catIdx]
    const catImages = urls.slice(catIdx * 10, (catIdx + 1) * 10)
    const coverUrl = catImages[0] || null

    const { data: newCat, error: catErr } = await supabase
      .from("journal_categories")
      .insert({
        sort_order: cat.sort_order,
        title_en: cat.title_en,
        title_th: cat.title_th,
        slug: cat.slug,
        category_query: cat.category_query,
        description_en: cat.description_en,
        description_th: cat.description_th,
        cover_image_url: coverUrl,
        is_active: true
      })
      .select("id")
      .single()

    if (catErr) {
      console.error(`Error creating category ${cat.title_en}:`, catErr)
      continue
    }

    const imageItems = catImages.map((url, imgIdx) => ({
      category_id: newCat.id,
      image_url: url,
      sort_order: imgIdx + 1,
      is_active: true
    }))

    const { error: imgErr } = await supabase
      .from("journal_images")
      .insert(imageItems)

    if (imgErr) {
      console.error(`Error inserting images for ${cat.title_en}:`, imgErr)
    } else {
      console.log(`✓ [${cat.sort_order}/9] Created "${cat.title_en}" with ${imageItems.length} images!`)
    }
  }

  console.log("All 9 categories created and 90 images distributed successfully!")
}

run()
