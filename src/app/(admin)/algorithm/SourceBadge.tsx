import type { ComponentType, SVGProps } from "react"
import {
  CircleHelp,
  Link2,
  Navigation,
} from "lucide-react"

type IconProps = SVGProps<SVGSVGElement>

function FacebookIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}

function GoogleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
    </svg>
  )
}

function InstagramIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  )
}

function LineIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
    </svg>
  )
}

function MicrosoftIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path fill="#f25022" d="M1 1h10v10H1z"/>
      <path fill="#00a4ef" d="M1 13h10v10H1z"/>
      <path fill="#7fba00" d="M13 1h10v10H13z"/>
      <path fill="#ffb900" d="M13 13h10v10H13z"/>
    </svg>
  )
}

function PinterestIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 0a12 12 0 0 0-4.37 23.17c-.07-.94-.13-2.39.03-3.42l1.13-4.8s-.29-.58-.29-1.44c0-1.35.78-2.36 1.76-2.36.83 0 1.23.62 1.23 1.37 0 .84-.53 2.09-.81 3.25-.23.97.49 1.76 1.44 1.76 1.73 0 3.06-1.83 3.06-4.46 0-2.33-1.68-3.96-4.07-3.96-2.77 0-4.4 2.08-4.4 4.23 0 .84.32 1.73.73 2.22.08.1.09.19.07.29l-.27 1.13c-.04.18-.15.22-.34.13-1.28-.59-2.07-2.46-2.07-3.96 0-3.23 2.35-6.19 6.77-6.19 3.55 0 6.31 2.53 6.31 5.92 0 3.53-2.23 6.37-5.32 6.37-1.04 0-2.02-.54-2.35-1.18l-.64 2.44c-.23.9-.86 2.02-1.28 2.71A12 12 0 1 0 12 0z"/>
    </svg>
  )
}

function TiktokIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
    </svg>
  )
}

function XIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
}

function YoutubeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  )
}

type SourceStyle = {
  icon: ComponentType<IconProps>
  iconClass: string
  logoClass?: string
}

const sourceStyles: Record<string, SourceStyle> = {
  instagram: { icon: InstagramIcon, iconClass: "bg-white ring-1 ring-pink-100", logoClass: "h-4 w-4" },
  facebook: { icon: FacebookIcon, iconClass: "bg-white ring-1 ring-blue-100", logoClass: "h-4 w-4" },
  "meta ads": { icon: FacebookIcon, iconClass: "bg-white ring-1 ring-blue-100", logoClass: "h-4 w-4" },
  line: { icon: LineIcon, iconClass: "bg-white ring-1 ring-emerald-100", logoClass: "h-4 w-4" },
  tiktok: { icon: TiktokIcon, iconClass: "bg-white ring-1 ring-slate-200", logoClass: "h-4 w-4" },
  youtube: { icon: YoutubeIcon, iconClass: "bg-white ring-1 ring-red-100", logoClass: "h-4 w-4" },
  pinterest: { icon: PinterestIcon, iconClass: "bg-white ring-1 ring-red-100", logoClass: "h-4 w-4" },
  google: { icon: GoogleIcon, iconClass: "bg-white ring-1 ring-sky-100", logoClass: "h-4 w-4" },
  "microsoft ads": { icon: MicrosoftIcon, iconClass: "bg-white ring-1 ring-cyan-100", logoClass: "h-4 w-4" },
  x: { icon: XIcon, iconClass: "bg-white ring-1 ring-slate-200", logoClass: "h-3.5 w-3.5" },
  twitter: { icon: XIcon, iconClass: "bg-white ring-1 ring-slate-200", logoClass: "h-3.5 w-3.5" },
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
