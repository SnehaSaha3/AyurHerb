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

function LeafIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
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

function Row({ label, value, align = "left" }: { label: string; value: string; align?: "left" | "right" }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-dotted border-stone-300 py-2.5 last:border-b-0">
      <span className="w-20 flex-none font-mono text-[11px] uppercase tracking-widest text-stone-400">
        {label}
      </span>
      <span className="h-px flex-1 border-b border-dotted border-stone-300" />
      <span
        className={`font-sans text-[13px] text-stone-800 ${align === "right" ? "text-right" : ""}`}
      >
        {value}
      </span>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-md rounded border border-dashed border-stone-300 bg-white p-7">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-2.5 w-16 animate-pulse rounded bg-stone-100" />
          <div className="h-3.5 w-24 animate-pulse rounded bg-stone-100" />
        </div>
        <div className="h-[52px] w-[52px] animate-pulse rounded-full bg-stone-100" />
      </div>
      <div className="mt-6 space-y-2 border-b-2 border-stone-100 pb-4">
        <div className="h-6 w-40 animate-pulse rounded bg-stone-100" />
        <div className="h-3 w-32 animate-pulse rounded bg-stone-100" />
      </div>
      <div className="mt-4 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-4 w-full animate-pulse rounded bg-stone-100" />
        ))}
      </div>
    </div>
  )
}

function ProfileError() {
  return (
    <div className="mx-auto max-w-md rounded border border-dashed border-stone-300 bg-white p-10 text-center">
      <p className="font-serif text-lg text-stone-800">Profile not found</p>
      <p className="mt-1 font-sans text-xs text-stone-400">
        We couldn't load this record. Try refreshing the page.
      </p>
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
    <div className="mx-auto max-w-md rounded border border-dashed border-stone-300 bg-white px-7 py-7">
      <div className="flex items-start justify-between font-mono">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400">Reg no.</p>
          <p className="mt-0.5 text-[13px] tracking-wide text-emerald-900">{regNo}</p>
        </div>
        <div className="flex h-[52px] w-[52px] rotate-[-8deg] items-center justify-center rounded-full border border-amber-700 text-amber-700">
          <LeafIcon />
        </div>
      </div>

      <div className="mt-5 border-b-2 border-emerald-900 pb-4">
        <h2 className="font-serif text-[26px] font-normal text-emerald-900">
          {farmer.name}
        </h2>
        <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-amber-700">
          Cultivar &mdash; {farmer.herb}
        </p>
      </div>

      <div className="mt-4">
        <Row label="Email" value={farmer.email} />
        <Row label="Contact" value={farmer.contact || "Not provided"} />
        <Row label="Address" value={farmer.address || "Not provided"} align="right" />
      </div>

      <div className="mt-5 flex items-center gap-1.5 text-emerald-700">
        <CheckBadgeIcon />
        <span className="font-sans text-[11px] tracking-wide">KYC verified farmer</span>
      </div>
    </div>
  )
}

export default Profile