"use client"

import { useState } from "react"
import { updateMyProfile } from "@/actions/profiles"
import { Loader2, Save, User, Camera, Shield, QrCode, Mail, Phone, Building, Hash } from "lucide-react"
import { QRCodeCanvas } from "qrcode.react" 

const convertToWebP = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement("img");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
              type: "image/webp",
              lastModified: Date.now(),
            });
            resolve(newFile);
          } else {
            resolve(file);
          }
        }, "image/webp", 0.8);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export default function ProfileForm({ profile, supabaseUrl }: { profile: any, supabaseUrl: string }) {
  const [loading, setLoading] = useState(false)
  
  const getInitialAvatarUrl = (path: string | null) => {
    if (!path) return null
    if (path.startsWith('http') || path.startsWith('blob:')) return path
    return `${supabaseUrl}/storage/v1/object/public/${path}`
  }

  const [preview, setPreview] = useState<string | null>(
    getInitialAvatarUrl(profile.avatar_url)
  )

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    const file = formData.get('avatar') as File;
    if (file && file.size > 0) {
      try {
        const webpFile = await convertToWebP(file);
        formData.set('avatar', webpFile);
      } catch (err) {
        console.error("Conversion failed", err);
      }
    }
    if (profile.avatar_url) {
        formData.append('old_avatar_path', profile.avatar_url)
    }
    const res = await updateMyProfile(formData)
    setLoading(false)
    if (res?.error) {
      alert("Error: " + res.error)
    } else {
      alert("บันทึกข้อมูลเรียบร้อย!")
      window.location.reload()
    }
  }

  // Styles
  const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
  const readOnlyClass = "w-full bg-slate-50 border border-slate-200 text-slate-500 rounded-lg px-4 py-2.5 text-sm font-mono cursor-not-allowed focus:outline-none flex items-center gap-2"
  const editableClass = "w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"

return (
    <div className="max-w-5xl mx-auto">
      <form action={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* --- LEFT COLUMN: ID CARD STYLE --- */}
        <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* 1. Digital ID Card */}
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100 relative">
                {/* Header Gradient */}
                <div className="h-32 bg-gradient-to-r from-slate-800 to-slate-900 relative">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <div className="absolute top-4 right-4">
                        <span className="px-2 py-1 bg-white/10 backdrop-blur-md text-white/80 text-[10px] font-bold rounded border border-white/20 uppercase tracking-widest">
                            Official ID
                        </span>
                    </div>
                </div>

                {/* Avatar & Info */}
                <div className="px-6 pb-6 relative">
                    {/* Avatar Circle */}
                    <div className="-mt-16 mb-4 flex justify-center">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full border-[4px] border-white shadow-lg bg-slate-100 overflow-hidden relative z-10">
                                {preview ? (
                                    <img 
                                        src={preview} 
                                        alt="Avatar" 
                                        className="w-full h-full object-cover" 
                                        onError={(e) => { e.currentTarget.src = "https://ui-avatars.com/api/?name=User&background=cbd5e1&color=64748b" }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <User className="w-12 h-12" />
                                    </div>
                                )}
                            </div>
                            {/* Upload Button */}
                            <label className="absolute bottom-0 right-0 z-20 bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-full cursor-pointer shadow-lg transition-all border-[3px] border-white active:scale-95 group-hover:scale-110">
                                <Camera className="w-4 h-4" />
                                <input type="file" name="avatar" accept="image/*" className="hidden" onChange={handleImageChange} />
                            </label>
                        </div>
                    </div>

                    {/* Text Info */}
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">{profile.full_name || "Unidentified User"}</h2>
                        <div className="flex items-center justify-center gap-2 mt-2">
                             <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100 uppercase tracking-wide">
                                <Shield className="w-3 h-3" /> {profile.role}
                             </span>
                        </div>
                    </div>

                    {/* QR Code Section */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-dashed border-slate-200 flex flex-col items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                             {/* ใช้ branch_id หรือ branch_code ในการเจน QR */}
                             <QRCodeCanvas 
                                value={String(profile.branch_id || "NO-BRANCH")} 
                                size={120} 
                                level={"M"}
                                bgColor="#ffffff"
                                fgColor="#0f172a"
                             />
                        </div>
                        <div className="w-full text-center">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                                <Building className="w-3 h-3" /> Branch ID
                            </div>
                            <code className="block w-full text-[10px] font-mono text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 truncate select-all cursor-pointer hover:border-blue-300 transition-colors">
                                {/* แสดงรหัสสาขาให้ดูด้วย */}
                                {profile.branch_id} ({profile.branch_code})
                            </code>
                        </div>
                    </div>

                </div>
            </div>
        </div>

        {/* --- RIGHT COLUMN: FORM --- */}
        <div className="lg:col-span-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-600" /> 
                            ข้อมูลส่วนตัว
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">จัดการข้อมูลบัญชีและการติดต่อของคุณ</p>
                    </div>
                </div>

                <div className="p-6 space-y-8">
                    {/* Section 1: Contact */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
                            ข้อมูลการติดต่อ
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className={labelClass}><User className="w-3.5 h-3.5"/> ชื่อ-นามสกุล</label>
                                <input name="full_name" defaultValue={profile.full_name || ""} required className={editableClass} placeholder="ระบุชื่อจริงและนามสกุล" />
                            </div>

                            <div>
                                <label className={labelClass}><Mail className="w-3.5 h-3.5"/> อีเมล</label>
                                <div className={readOnlyClass}>{profile.email || "-"}</div>
                            </div>

                            <div>
                                <label className={labelClass}><Phone className="w-3.5 h-3.5"/> เบอร์โทรศัพท์</label>
                                <input name="phone" defaultValue={profile.phone || ""} placeholder="0xx-xxx-xxxx" className={editableClass} />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Organization */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
                            ข้อมูลองค์กร
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelClass}><Building className="w-3.5 h-3.5"/> สาขาประจำ</label>
                                <div className={readOnlyClass}>{profile.branch_name || "Main Office"}</div>
                            </div>
                            
                            <div>
                                <label className={labelClass}><Shield className="w-3.5 h-3.5"/> ระดับสิทธิ์ (Role)</label>
                                <div className={readOnlyClass}>
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                                    {profile.role.toUpperCase()}
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className={labelClass}><Hash className="w-3.5 h-3.5"/> System User ID</label>
                                <div className={readOnlyClass}>{profile.user_id}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button type="submit" disabled={loading} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg shadow-lg shadow-slate-200 transition-all flex items-center gap-2 font-bold text-sm disabled:opacity-70 active:scale-95">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
                        บันทึกการเปลี่ยนแปลง
                    </button>
                </div>
            </div>
        </div>

      </form>
    </div>
  )
}