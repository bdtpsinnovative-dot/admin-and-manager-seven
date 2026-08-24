import type { ComponentType, SVGProps } from "react"
import { CircleHelp, Globe2, Monitor, Smartphone, Tablet, Tv, Watch } from "lucide-react"

export type TechnologyKind = "device" | "os" | "browser"

type IconProps = SVGProps<SVGSVGElement>
type IconComponent = ComponentType<IconProps>

function AndroidIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path fill="#3DDC84" d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.996-3.4572c.1556-.269.0634-.6133-.2056-.7689-.269-.1556-.6133-.0634-.7689.2056l-2.0232 3.5042c-1.4654-.6682-3.1118-1.042-4.8804-1.042s-3.415.3738-4.8804 1.042L5.0998 5.3011c-.1556-.269-.5-.3612-.7689-.2056-.269.1556-.3612.5-.2056.7689l1.996 3.4572C2.688 11.2386.3435 15.0106 0 19.5h24c-.3435-4.4894-2.688-8.2614-6.1185-10.1786"/>
    </svg>
  )
}

function AppleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 1.01-2.87-.96.04-2.1.64-2.77 1.42-.58.68-1.09 1.76-.98 2.82 1.08.08 2.12-.57 2.74-1.37z"/>
    </svg>
  )
}

function WindowsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path fill="#0078d4" d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
    </svg>
  )
}

function LinuxIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12.001 0C8.384 0 5.445 2.94 5.445 6.556c0 1.272.366 2.458 1.002 3.461C5.69 11.238 5 12.923 5 14.778c0 4.542 3.134 8.222 7.001 8.222s7.001-3.68 7.001-8.222c0-1.855-.69-3.54-1.448-4.761.636-1.003 1.002-2.189 1.002-3.461C18.557 2.94 15.618 0 12.001 0zm-2.07 5.767c.642 0 1.162.52 1.162 1.162 0 .643-.52 1.163-1.162 1.163-.643 0-1.163-.52-1.163-1.163 0-.642.52-1.162 1.163-1.162zm4.14 0c.643 0 1.163.52 1.163 1.162 0 .643-.52 1.163-1.163 1.163-.642 0-1.162-.52-1.162-1.163 0-.642.52-1.162 1.162-1.162z"/>
    </svg>
  )
}

function ChromeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="12" cy="12" r="10" fill="#4285F4"/>
      <circle cx="12" cy="12" r="4.5" fill="#ffffff"/>
      <circle cx="12" cy="12" r="3.5" fill="#4285F4"/>
    </svg>
  )
}

function FirefoxIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="12" cy="12" r="10" fill="#FF7139"/>
      <path d="M12 4a8 8 0 1 0 8 8 8 8 0 0 0-8-8z" fill="#FF9400"/>
    </svg>
  )
}

function EdgeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="12" cy="12" r="10" fill="#0078D7"/>
    </svg>
  )
}

function SafariIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="12" cy="12" r="10" fill="#006CFF"/>
      <polygon points="16.5,7.5 13.5,13.5 7.5,16.5 10.5,10.5" fill="#FFFFFF"/>
    </svg>
  )
}

function OperaIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="12" cy="12" r="10" fill="#FF1B2D"/>
      <ellipse cx="12" cy="12" rx="4.5" ry="7" fill="#FFFFFF"/>
      <ellipse cx="12" cy="12" rx="3" ry="5.5" fill="#FF1B2D"/>
    </svg>
  )
}

function BraveIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="12" cy="12" r="10" fill="#FB542B"/>
    </svg>
  )
}

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
  if (/android/.test(value)) return { icon: AndroidIcon, iconClass: brandIconClass, logoClass: "h-4 w-4" }
  if (/ios|iphone os|ipad os/.test(value)) return { icon: AppleIcon, iconClass: brandIconClass, logoClass: "h-4 w-4" }
  if (/mac|os x/.test(value)) return { icon: AppleIcon, iconClass: brandIconClass, logoClass: "h-4 w-4" }
  if (/windows/.test(value)) return { icon: WindowsIcon, iconClass: brandIconClass, logoClass: "h-4 w-4" }
  if (/linux|ubuntu|debian|fedora/.test(value)) return { icon: LinuxIcon, iconClass: brandIconClass, logoClass: "h-4 w-4" }
  return { icon: CircleHelp, iconClass: "text-[var(--algorithm-muted)]" }
}

function browserStyle(value: string): TechnologyStyle {
  if (/edge|edg\//.test(value)) return { icon: EdgeIcon, iconClass: brandIconClass, logoClass: "h-4 w-4" }
  if (/firefox|fxios/.test(value)) return { icon: FirefoxIcon, iconClass: brandIconClass, logoClass: "h-4 w-4" }
  if (/brave/.test(value)) return { icon: BraveIcon, iconClass: brandIconClass, logoClass: "h-4 w-4" }
  if (/opera|opr\//.test(value)) return { icon: OperaIcon, iconClass: brandIconClass, logoClass: "h-4 w-4" }
  if (/chrome|chromium|crios/.test(value)) return { icon: ChromeIcon, iconClass: brandIconClass, logoClass: "h-4 w-4" }
  if (/safari/.test(value)) return { icon: SafariIcon, iconClass: brandIconClass, logoClass: "h-4 w-4" }
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
