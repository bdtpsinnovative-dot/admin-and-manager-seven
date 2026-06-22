"use client";

const PROP_BOXES = [
  { id: "S", label: "S", size: "15 x 15 x 15", length: 15, width: 15, height: 15, tone: "green" },
  { id: "M", label: "M", size: "25 x 20 x 25", length: 25, width: 20, height: 25, tone: "blue" },
  { id: "L", label: "L", size: "35 x 25 x 35", length: 35, width: 25, height: 35, tone: "orange" },
  { id: "XL", label: "XL / Tall", size: "50 x 40 x 80", length: 50, width: 40, height: 80, tone: "purple" },
  { id: "FLAT_S", label: "FLAT S", size: "25 x 20 x 5", length: 25, width: 20, height: 5, flat: true, tone: "slate" },
  { id: "FLAT_M", label: "FLAT M", size: "35 x 25 x 5", length: 35, width: 25, height: 5, flat: true, tone: "slate" },
  { id: "FLAT_L", label: "FLAT L", size: "45 x 30 x 5", length: 45, width: 30, height: 5, flat: true, tone: "slate" },
  { id: "FLAT_XL", label: "FLAT XL", size: "60 x 40 x 5", length: 60, width: 40, height: 5, flat: true, tone: "slate" },
].sort((a, b) => (a.length * a.width * a.height) - (b.length * b.width * b.height));

type PropProductForBox = {
  length_cm?: number | string | null;
  width_cm?: number | string | null;
  thickness_cm?: number | string | null;
  specs?: {
    length_cm?: number | string | null;
    width_cm?: number | string | null;
    thickness_cm?: number | string | null;
  } | null;
};

interface PropBoxCalculatorProps {
  products: PropProductForBox[];
  filteredProducts: PropProductForBox[];
  selectedProducts: PropProductForBox[];
}

function toPositiveNumber(value: unknown) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
}

function getProductDimensions(product: PropProductForBox) {
  const specs = product.specs || {};
  const length = toPositiveNumber(product.length_cm ?? specs.length_cm);
  const width = toPositiveNumber(product.width_cm ?? specs.width_cm);
  const thickness = toPositiveNumber(product.thickness_cm ?? specs.thickness_cm);
  return length && width && thickness ? { length, width, thickness } : null;
}

function canFitBox(product: { length: number; width: number; thickness: number }, box: typeof PROP_BOXES[number]) {
  if (box.flat) {
    const productBase = [product.length, product.width].sort((a, b) => a - b);
    const boxBase = [box.length, box.width].sort((a, b) => a - b);
    return product.thickness <= box.height && productBase[0] <= boxBase[0] && productBase[1] <= boxBase[1];
  }

  const productDims = [product.length, product.width, product.thickness].sort((a, b) => a - b);
  const boxDims = [box.length, box.width, box.height].sort((a, b) => a - b);
  return productDims.every((dimension, index) => dimension <= boxDims[index]);
}

function getBestBoxForProduct(product: PropProductForBox) {
  const dimensions = getProductDimensions(product);
  if (!dimensions) return "NO_SIZE";
  return PROP_BOXES.find(box => canFitBox(dimensions, box))?.id || "OVER_SIZE";
}

function buildBoxSummary(items: PropProductForBox[]) {
  const counts = Object.fromEntries(PROP_BOXES.map(box => [box.id, 0])) as Record<string, number>;
  let noSize = 0;
  let overSize = 0;

  items.forEach(item => {
    const boxId = getBestBoxForProduct(item);
    if (boxId === "NO_SIZE") noSize += 1;
    else if (boxId === "OVER_SIZE") overSize += 1;
    else counts[boxId] += 1;
  });

  return { counts, noSize, overSize, total: items.length };
}

function getToneClass(tone: string) {
  if (tone === "green") return "text-green-700";
  if (tone === "blue") return "text-blue-700";
  if (tone === "orange") return "text-orange-600";
  if (tone === "purple") return "text-purple-700";
  return "text-slate-600";
}

export default function PropBoxCalculator({ products, filteredProducts, selectedProducts }: PropBoxCalculatorProps) {
  const totalBoxSummary = buildBoxSummary(products);
  const filteredBoxSummary = buildBoxSummary(filteredProducts);
  const selectedBoxSummary = buildBoxSummary(selectedProducts);
  const activeBoxSummary = selectedProducts.length > 0 ? selectedBoxSummary : filteredBoxSummary;
  const activeBoxScope = selectedProducts.length > 0 ? "รายการที่เลือก" : "รายการที่แสดงอยู่";

  return (
    <div className="mb-4 bg-white border border-gray-100 shadow-sm rounded-2xl p-4">
      <div className="flex flex-col lg:flex-row lg:items-start gap-4 mb-4">
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-900">คำนวณกล่องมาตรฐาน Props</p>
          <p className="text-xs text-gray-500 mt-0.5">
            เทียบขนาดสินค้า L x W x T กับกล่องมาตรฐาน และเลือกกล่องเล็กสุดที่ใส่ได้
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 w-full lg:w-auto">
          <div className="rounded-xl bg-gray-50 px-3 py-2 border border-gray-100">
            <p className="text-[10px] font-bold uppercase text-gray-400">ทั้งหมด</p>
            <p className="text-lg font-black text-gray-900">{totalBoxSummary.total}</p>
            <p className="text-[10px] text-gray-400">prop</p>
          </div>
          <div className="rounded-xl bg-blue-50 px-3 py-2 border border-blue-100">
            <p className="text-[10px] font-bold uppercase text-blue-400">ที่แสดง</p>
            <p className="text-lg font-black text-blue-700">{filteredBoxSummary.total}</p>
            <p className="text-[10px] text-blue-400">รายการ</p>
          </div>
          <div className="rounded-xl bg-green-50 px-3 py-2 border border-green-100">
            <p className="text-[10px] font-bold uppercase text-green-500">ที่เลือก</p>
            <p className="text-lg font-black text-green-700">{selectedBoxSummary.total}</p>
            <p className="text-[10px] text-green-500">รายการ</p>
          </div>
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-gray-500">สรุปกล่องสำหรับ {activeBoxScope}</p>
        {(activeBoxSummary.noSize > 0 || activeBoxSummary.overSize > 0) && (
          <p className="text-xs font-semibold text-red-500">
            ไม่มีขนาด {activeBoxSummary.noSize} | เกินไซซ์ {activeBoxSummary.overSize}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {PROP_BOXES.map(box => (
          <div key={box.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={`text-xs font-black ${getToneClass(box.tone)}`}>{box.label}</p>
                <p className="text-[10px] text-gray-400 whitespace-nowrap">{box.size} cm</p>
              </div>
              <p className="text-xl font-black text-gray-900">{activeBoxSummary.counts[box.id]}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
