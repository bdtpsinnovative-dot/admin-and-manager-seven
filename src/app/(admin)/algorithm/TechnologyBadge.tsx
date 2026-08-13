import type { ComponentType, SVGProps } from "react"
import Android from "@thesvg/react/android"
import Brave from "@thesvg/react/brave"
import FirefoxBrowser from "@thesvg/react/firefox-browser"
import GoogleChrome from "@thesvg/react/google-chrome"
import Linux from "@thesvg/react/linux"
import Macos from "@thesvg/react/macos"
import MicrosoftEdge from "@thesvg/react/microsoft-edge"
import Opera from "@thesvg/react/opera"
import Safari from "@thesvg/react/safari"
import Windows11 from "@thesvg/react/windows11"
import { CircleHelp, Globe2, Monitor, Smartphone, Tablet, Tv, Watch } from "lucide-react"

export type TechnologyKind = "device" | "os" | "browser"

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

type TechnologyStyle = {
  icon?: IconComponent
  iconClass: string
  logoClass?: string
}

const brandIconClass = "text-[var(--algorithm-ink-soft)]"
const deviceIconClass = "text-[var(--algorithm-blue)]"

function normalize(value: string | null) {
  return value?.trim().toLowerCase() || ""
}

function deviceStyle(value: string): TechnologyStyle {
  if (/tablet|ipad/.test(value)) return { icon: Tablet, iconClass: deviceIconClass }
  if (/mobile|phone|iphone|smartphone/.test(value)) return { icon: Smartphone, iconClass: deviceIconClass }
  if (/tv|television/.test(value)) return { icon: Tv, iconClass: deviceIconClass }
  if (/watch|wearable/.test(value)) return { icon: Watch, iconClass: deviceIconClass }
  if (/desktop|computer|pc|laptop/.test(value)) return { icon: Monitor, iconClass: deviceIconClass }
  return { icon: CircleHelp, iconClass: "text-[var(--algorithm-muted)]" }
}

function osStyle(value: string): TechnologyStyle {
  if (/android/.test(value)) return { icon: Android, iconClass: brandIconClass, logoClass: "h-4 w-4" }
  if (/ios|iphone os|ipad os/.test(value)) return { iconClass: "" }
  if (/mac|os x/.test(value)) return { icon: Macos, iconClass: brandIconClass, logoClass: "h-4 w-4" }
  if (/windows/.test(value)) return { icon: Windows11, iconClass: brandIconClass, logoClass: "h-4 w-4" }
  if (/linux|ubuntu|debian|fedora/.test(value)) return { icon: Linux, iconClass: brandIconClass, logoClass: "h-4 w-4" }
  return { icon: CircleHelp, iconClass: "text-[var(--algorithm-muted)]" }
}

function browserStyle(value: string): TechnologyStyle {
  if (/edge|edg\//.test(value)) return { icon: MicrosoftEdge, iconClass: brandIconClass, logoClass: "h-4 w-4" }
  if (/firefox|fxios/.test(value)) return { icon: FirefoxBrowser, iconClass: brandIconClass, logoClass: "h-4 w-4" }
  if (/brave/.test(value)) return { icon: Brave, iconClass: brandIconClass, logoClass: "h-4 w-4" }
  if (/opera|opr\//.test(value)) return { icon: Opera, iconClass: brandIconClass, logoClass: "h-4 w-4" }
  if (/chrome|chromium|crios/.test(value)) return { icon: GoogleChrome, iconClass: brandIconClass, logoClass: "h-4 w-4" }
  if (/safari/.test(value)) return { icon: Safari, iconClass: brandIconClass, logoClass: "h-4 w-4" }
  return { icon: Globe2, iconClass: "text-[var(--algorithm-muted)]" }
}

function technologyStyle(kind: TechnologyKind, value: string): TechnologyStyle {
  if (kind === "device") return deviceStyle(value)
  if (kind === "os") return osStyle(value)
  return browserStyle(value)
}

const fallbackLabels: Record<TechnologyKind, string> = {
  device: "ไม่ระบุอุปกรณ์",
  os: "ไม่ระบุระบบ",
  browser: "ไม่ระบุ Browser",
}

export default function TechnologyBadge({ value, kind, note }: { value: string | null; kind: TechnologyKind; note?: string }) {
  const label = value?.trim() || fallbackLabels[kind]
  const style = technologyStyle(kind, normalize(value))
  const Icon = style.icon

  return <span className="inline-flex min-w-0 items-center gap-2" title={note ? `${label} · ${note}` : label}>
    {Icon ? <span className={`grid h-7 w-7 shrink-0 place-items-center ${style.iconClass}`} aria-hidden="true"><Icon className={style.logoClass || "h-3.5 w-3.5"} /></span> : null}
    <span className="min-w-0">
      <span className="block truncate font-semibold text-[var(--algorithm-ink-soft)]">{label}</span>
      {note ? <span className="mt-0.5 block truncate text-[10px] font-normal text-[var(--algorithm-muted)]">{note}</span> : null}
    </span>
  </span>
}
