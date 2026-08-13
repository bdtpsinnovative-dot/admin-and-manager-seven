import type { ComponentType, SVGProps } from "react"
import Facebook from "@thesvg/react/facebook"
import Google from "@thesvg/react/google"
import Instagram from "@thesvg/react/instagram"
import Line from "@thesvg/react/line"
import Microsoft from "@thesvg/react/microsoft"
import Pinterest from "@thesvg/react/pinterest"
import Tiktok from "@thesvg/react/tiktok"
import X from "@thesvg/react/x"
import Youtube from "@thesvg/react/youtube"
import {
  CircleHelp,
  Link2,
  Navigation,
} from "lucide-react"

type SourceStyle = {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  iconClass: string
  logoClass?: string
}

const sourceStyles: Record<string, SourceStyle> = {
  instagram: { icon: Instagram, iconClass: "bg-white ring-1 ring-pink-100", logoClass: "h-4 w-4" },
  facebook: { icon: Facebook, iconClass: "bg-white ring-1 ring-blue-100", logoClass: "h-4 w-4" },
  "meta ads": { icon: Facebook, iconClass: "bg-white ring-1 ring-blue-100", logoClass: "h-4 w-4" },
  line: { icon: Line, iconClass: "bg-white ring-1 ring-emerald-100", logoClass: "h-4 w-4" },
  tiktok: { icon: Tiktok, iconClass: "bg-white ring-1 ring-slate-200", logoClass: "h-4 w-4" },
  youtube: { icon: Youtube, iconClass: "bg-white ring-1 ring-red-100", logoClass: "h-4 w-4" },
  pinterest: { icon: Pinterest, iconClass: "bg-white ring-1 ring-red-100", logoClass: "h-4 w-4" },
  google: { icon: Google, iconClass: "bg-white ring-1 ring-sky-100", logoClass: "h-4 w-4" },
  "microsoft ads": { icon: Microsoft, iconClass: "bg-white ring-1 ring-cyan-100", logoClass: "h-4 w-4" },
  x: { icon: X, iconClass: "bg-white ring-1 ring-slate-200", logoClass: "h-3.5 w-3.5" },
  twitter: { icon: X, iconClass: "bg-white ring-1 ring-slate-200", logoClass: "h-3.5 w-3.5" },
  direct: { icon: Navigation, iconClass: "bg-[var(--algorithm-accent-soft)] text-[var(--algorithm-accent-strong)]" },
  referral: { icon: Link2, iconClass: "bg-[var(--algorithm-blue-soft)] text-[var(--algorithm-blue)]" },
}

function sourceParts(value: string | null) {
  const displayValue = value?.trim() || "ไม่ระบุช่องทาง"
  const [name, ...detailParts] = displayValue.split(" · ")
  return { name, detail: detailParts.join(" · ") || null }
}

export default function SourceBadge({ value, note }: { value: string | null; note?: string }) {
  const { name, detail } = sourceParts(value)
  const style = sourceStyles[name.toLowerCase()] || { icon: CircleHelp, iconClass: "bg-[var(--algorithm-surface-soft)] text-[var(--algorithm-muted)]" }
  const Icon = style.icon

  return <span className="inline-flex min-w-0 items-center gap-2" title={detail ? `${name} · ${detail}` : name}>
    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${style.iconClass}`} aria-hidden="true"><Icon className={style.logoClass || "h-3.5 w-3.5"} /></span>
    <span className="min-w-0">
      <span className="block truncate font-semibold text-[var(--algorithm-ink-soft)]">{name}</span>
      {(detail || note) && <span className="mt-0.5 block max-w-[180px] truncate text-[10px] font-normal text-[var(--algorithm-muted)]">{detail || note}</span>}
    </span>
  </span>
}
