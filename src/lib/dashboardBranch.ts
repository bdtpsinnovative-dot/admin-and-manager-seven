/**
 * Parse a `branch` query parameter (string, array, or comma-separated IDs)
 * into unique positive integer branch IDs. Returns `[]` for "ALL" or empty input.
 */
export function parseDashboardBranchIds(rawBranch?: string | string[] | null): number[] {
  if (!rawBranch) return []
  const tokens = Array.isArray(rawBranch)
    ? rawBranch.flatMap((entry) => entry.split(","))
    : rawBranch.split(",")

  const seen = new Set<number>()
  for (const token of tokens) {
    const trimmed = token.trim()
    if (!trimmed || trimmed.toUpperCase() === "ALL") continue
    const parsed = Number(trimmed)
    if (Number.isInteger(parsed) && parsed > 0) {
      seen.add(parsed)
    }
  }
  return Array.from(seen)
}

/**
 * Serialize selected branch IDs into the canonical `branch` query param value,
 * returning `"ALL"` when no subset filter is active (none selected, or every available branch is selected).
 */
export function formatDashboardBranchParam(
  selectedIds: number[],
  availableBranchIds?: number[]
): string {
  const uniqueIds = Array.from(
    new Set(selectedIds.filter((id) => Number.isInteger(id) && id > 0))
  )
  if (uniqueIds.length === 0) return "ALL"

  if (availableBranchIds && availableBranchIds.length > 0) {
    const availableSet = new Set(availableBranchIds)
    const validIds = uniqueIds.filter((id) => availableSet.has(id))
    if (validIds.length === 0 || validIds.length >= availableSet.size) {
      return "ALL"
    }
    return validIds.join(",")
  }

  return uniqueIds.join(",")
}

