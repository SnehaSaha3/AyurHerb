import { useEffect, useState } from "react"
import axios from "axios"

interface Farmer {
  _id: string
  name: string
  herb: string
  email: string
  contact?: string
  address?: string
}

function LeafIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M12 2c-4 3-8 7-8 12a6 6 0 0 0 6 6c5 0 9-4 12-8-4 0-7-1-10-4" />
      <path d="M4 20c4-6 8-10 14-14" />
    </svg>
  )
}

function CheckBadgeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.2 2.2 4.8-4.8" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M22 16.9v2a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 1h2a2 2 0 0 1 2 1.7c.1 1.1.4 2.2.7 3.2a2 2 0 0 1-.5 2.1L7 9.4a16 16 0 0 0 6 6l1.4-1.4a2 2 0 0 1 2.1-.5c1 .4 2.1.6 3.2.7a2 2 0 0 1 1.7 2.1Z" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 22s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ""
  return (first + last).toUpperCase()
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 py-3 sm:py-3.5">
      <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-700">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-400">
          {label}
        </p>
        <p className="mt-0.5 break-words font-sans text-sm text-stone-800">
          {value}
        </p>
      </div>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-dashed border-stone-300 bg-white shadow-sm">
        <div className="h-24 animate-pulse rounded-t-2xl bg-stone-100 sm:h-28" />
        <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:gap-8 sm:p-8">
          <div className="-mt-16 h-24 w-24 flex-none animate-pulse rounded-full border-4 border-white bg-stone-200 sm:-mt-20 sm:h-28 sm:w-28" />
          <div className="space-y-3">
            <div className="h-3 w-24 animate-pulse rounded bg-stone-100" />
            <div className="h-6 w-48 animate-pulse rounded bg-stone-100" />
            <div className="h-3 w-32 animate-pulse rounded bg-stone-100" />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-stone-100" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProfileError() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-8 sm:px-6">
      <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center sm:p-10">
        <p className="font-serif text-lg text-stone-800">Profile not found</p>
        <p className="mt-1 font-sans text-xs text-stone-400">
          We couldn't load this record. Try refreshing the page.
        </p>
      </div>
    </div>
  )
}

function Profile() {
  const [farmer, setFarmer] = useState<Farmer | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("farmerToken")

        if (!token) {
          console.error("No token found.")
          setLoading(false)
          return
        }

        const res = await axios.get("http://localhost:8000/api/farmers/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        setFarmer(res.data.farmer)
      } catch (err) {
        console.error("Error fetching profile:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  if (loading) return <ProfileSkeleton />
  if (!farmer) return <ProfileError />

  const regNo = `FM-${new Date().getFullYear()}-${farmer._id.slice(-4).toUpperCase()}`

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-stone-200 bg-white shadow-[0_20px_55px_rgba(20,83,45,0.08)]">
        <div className="relative h-24 overflow-hidden rounded-t-2xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-600 sm:h-28">
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_30%,white,transparent_35%),radial-gradient(circle_at_80%_70%,white,transparent_30%)]" />

          <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white backdrop-blur-sm sm:right-6 sm:top-5">
            <LeafIcon size={12} />
            <span className="hidden sm:inline">Reg no.</span>
            {regNo}
          </div>
        </div>

        <div className="px-5 pb-6 sm:px-8 sm:pb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
            <div className="relative z-10 -mt-12 flex h-24 w-24 flex-none items-center justify-center rounded-full border-4 border-white bg-emerald-100 font-serif text-2xl text-emerald-800 shadow-md sm:-mt-14 sm:h-28 sm:w-28 sm:text-3xl">
              {initials(farmer.name)}
            </div>

            <div className="min-w-0 flex-1 pt-1 sm:pt-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className="font-serif text-2xl font-normal text-emerald-900 sm:text-[28px]">
                  {farmer.name}
                </h2>
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
                  <CheckBadgeIcon />
                  KYC verified
                </span>
              </div>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-amber-700">
                Cultivar &mdash; {farmer.herb}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-x-8 gap-y-1 border-t border-stone-100 pt-4 sm:mt-8 sm:grid-cols-2 sm:pt-6">
            <DetailRow icon={<MailIcon />} label="Email" value={farmer.email} />
            <DetailRow
              icon={<PhoneIcon />}
              label="Contact"
              value={farmer.contact || "Not provided"}
            />
            <div className="sm:col-span-2">
              <DetailRow
                icon={<PinIcon />}
                label="Address"
                value={farmer.address || "Not provided"}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile