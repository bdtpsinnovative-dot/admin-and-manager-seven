/**
 * กฎเกณฑ์และขั้นบันไดส่วนลดพิเศษท้ายบิล (Special Discount Tiers)
 * - ซื้อไม่เกิน 25,000 ฿ -> สูงสุด 5%
 * - ซื้อ 25,000 ฿ ขึ้นไป -> สูงสุด 10%
 * - ซื้อ 50,000 ฿ ขึ้นไป -> สูงสุด 15%
 * - ซื้อ 75,000 ฿ ขึ้นไป -> สูงสุด 20%
 * - ซื้อ 100,000 ฿ ขึ้นไป -> สูงสุด 25%
 * - ซื้อ 150,000 ฿ ขึ้นไป -> สูงสุด 30%
 */

export interface SpecialDiscountTier {
  minSpend: number
  maxPercent: number
  label: string
}

export const SPECIAL_DISCOUNT_TIERS: SpecialDiscountTier[] = [
  { minSpend: 150000, maxPercent: 30, label: '30%' },
  { minSpend: 100000, maxPercent: 25, label: '25%' },
  { minSpend: 75000, maxPercent: 20, label: '20%' },
  { minSpend: 50000, maxPercent: 15, label: '15%' },
  { minSpend: 25000, maxPercent: 10, label: '10%' },
  { minSpend: 0, maxPercent: 5, label: '5%' }
]

export const QUICK_PERCENT_OPTIONS = [5, 10, 15, 20, 25, 30]

export function getMaxSpecialDiscountPercent(spendAmount: number): number {
  const safeSpend = Math.max(0, Number(spendAmount) || 0)
  for (const tier of SPECIAL_DISCOUNT_TIERS) {
    if (safeSpend >= tier.minSpend) {
      return tier.maxPercent
    }
  }
  return 5
}

export function getMaxSpecialDiscountBaht(spendAmount: number): number {
  const safeSpend = Math.max(0, Number(spendAmount) || 0)
  const maxPercent = getMaxSpecialDiscountPercent(safeSpend)
  return Math.floor(safeSpend * (maxPercent / 100))
}

export function getNextSpecialDiscountTier(spendAmount: number): {
  nextMinSpend: number
  nextMaxPercent: number
  diff: number
} | null {
  const safeSpend = Math.max(0, Number(spendAmount) || 0)
  // เรียงลำดับจากน้อยไปมาก
  const ascending = [...SPECIAL_DISCOUNT_TIERS].sort((a, b) => a.minSpend - b.minSpend)
  for (const tier of ascending) {
    if (tier.minSpend > safeSpend) {
      return {
        nextMinSpend: tier.minSpend,
        nextMaxPercent: tier.maxPercent,
        diff: tier.minSpend - safeSpend
      }
    }
  }
  return null
}
