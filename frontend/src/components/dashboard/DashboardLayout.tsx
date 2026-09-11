import React from "react";
import type { ReactNode } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import {
  Bell,
  ChevronDown,
  Home,
  Leaf,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Package,
  User,
  X,
  BarChart3,
  Sparkles,
} from "lucide-react";

import AyurHerbAtmosphere from "./AyurHerbAtmosphere";
import "../../styles/ayurherb-atmosphere.css";

interface DashboardLayoutProps {
  sidePanel?: ReactNode;
}

const navigation = [
  {
    label: "COMMAND",
    items: [
      {
        label: "Home",
        path: "/farmer-dashboard",
        icon: Home,
      },
    ],
  },

  {
    label: "FARM",
    items: [
      {
        label: "My Crops",
        path: "/farmer-dashboard/crops",
        icon: Leaf,
      },
      {
        label: "Geo Tagging",
        path: "/farmer-dashboard/geo-tagging",
        icon: MapPin,
      },
    ],
  },

  {
    label: "BUSINESS",
    items: [
      {
        label: "Shipments",
        path: "/farmer-dashboard/shipments",
        icon: Package,
      },
      {
        label: "Recommendations",
        path: "/farmer-dashboard/recommendations",
        icon: Sparkles,
      },
      {
        label: "Messages",
        path: "/farmer-dashboard/messages",
        icon: MessageCircle,
      },
    ],
  },

  {
    label: "INTELLIGENCE",
    items: [
      {
        label: "Analytics",
        path: "/farmer-dashboard/analytics",
        icon: BarChart3,
      },
    ],
  },
];

export default function DashboardLayout({
  sidePanel,
}: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = React.useState(false);

  const isActive = (path: string) => {
    if (path === "/farmer-dashboard") {
      return location.pathname === path;
    }

    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="ayurherb-dashboard h-screen overflow-hidden">
      {/* BACKGROUND */}
      <AyurHerbAtmosphere />

      {/* APP SHELL */}
      <div className="relative z-10 h-full">
        {/* =========================
            MOBILE MENU
        ========================== */}
        {mobileOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden">
            <div
              className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
              onClick={() => setMobileOpen(false)}
            />

            <aside className="relative z-10 h-full w-[280px] overflow-hidden border-r border-white/70 bg-white/90 shadow-2xl backdrop-blur-xl">
              <Sidebar
                isActive={isActive}
                navigate={navigate}
                handleLogout={handleLogout}
                onClose={() => setMobileOpen(false)}
              />
            </aside>
          </div>
        )}

        {/* =========================
            THREE COLUMN LAYOUT
        ========================== */}
        <div className="flex h-full min-h-0 gap-4 p-4 lg:p-5">

          {/* =========================
              LEFT SIDEBAR
          ========================== */}
          <aside className="hidden h-full w-[245px] shrink-0 lg:block">
            <div className="h-full overflow-hidden rounded-[28px] border border-white/70 bg-white/80 shadow-[0_20px_60px_rgba(54,91,63,0.10)] backdrop-blur-xl">
              <Sidebar
                isActive={isActive}
                navigate={navigate}
                handleLogout={handleLogout}
              />
            </div>
          </aside>

          {/* =========================
              MIDDLE COLUMN
          ========================== */}
          <main className="flex min-w-0 min-h-0 flex-1 flex-col">

            {/* TOP HEADER */}
            <header className="mb-4 flex h-[72px] shrink-0 items-center justify-between rounded-[26px] border border-white/70 bg-white/75 px-5 shadow-[0_15px_45px_rgba(54,91,63,0.08)] backdrop-blur-xl">

              <div className="flex items-center gap-3">

                {/* MOBILE MENU BUTTON */}
                <button
                  onClick={() => setMobileOpen(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-[#315a40] hover:bg-white/70 lg:hidden"
                  aria-label="Open menu"
                >
                  <Menu size={21} />
                </button>

                {/* PAGE TITLE */}
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.22em] text-[#829887]">
                    AYURHERB
                  </p>

                  <h1 className="text-[16px] font-semibold text-[#173b27]">
                    Farmer Dashboard
                  </h1>
                </div>

              </div>

              {/* PROFILE */}
              <div className="flex items-center gap-2">

                <button
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#dfeade] bg-white/70 text-[#59705d]"
                  aria-label="Notifications"
                >
                  <Bell size={19} />
                </button>

                <button className="flex items-center gap-3 rounded-2xl border border-[#dfeade] bg-white/70 px-3 py-2">

                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e3f3e4] text-xs font-bold text-[#1d8b4a]">
                    SS
                  </div>

                  <div className="hidden text-left sm:block">
                    <p className="text-xs font-semibold text-[#173b27]">
                      Sneha Saha
                    </p>

                    <p className="text-[10px] text-[#849685]">
                      Farmer
                    </p>
                  </div>

                  <ChevronDown
                    size={15}
                    className="text-[#708271]"
                  />

                </button>

              </div>
            </header>

            {/* =========================
                ONLY THIS AREA SCROLLS
            ========================== */}
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin">
              <Outlet />
            </div>

          </main>

          {/* =========================
    RIGHT AYURMATE PANEL
    HOME PAGE ONLY
========================== */}
{sidePanel && location.pathname === "/farmer-dashboard" && (
  <aside className="hidden h-full w-[360px] shrink-0 xl:block">
    <div className="h-full overflow-hidden rounded-[28px] border border-white/70 bg-white/80 shadow-[0_20px_60px_rgba(54,91,63,0.10)] backdrop-blur-xl">
      {sidePanel}
    </div>
  </aside>
)}

        </div>
      </div>
    </div>
  );
}


/* =========================================================
   SIDEBAR
========================================================= */

function Sidebar({
  isActive,
  navigate,
  handleLogout,
  onClose,
}: {
  isActive: (path: string) => boolean;
  navigate: (path: string) => void;
  handleLogout: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="relative flex h-full min-h-0 flex-col px-4 py-5">

      {/* BRAND */}
      <div className="flex shrink-0 items-center gap-3 px-2">

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#168443] text-white shadow-[0_8px_20px_rgba(22,132,67,0.20)]">
          <Leaf size={23} strokeWidth={2} />
        </div>

        <div>
          <h2 className="text-[17px] font-bold text-[#173b27]">
            AyurHerb
          </h2>

          <p className="text-[9px] font-semibold tracking-[0.2em] text-[#829887]">
            FARMER WORKSPACE
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto rounded-xl p-2 text-[#617665]"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}

      </div>


      {/* NAVIGATION */}
      <div className="mt-7 min-h-0 flex-1 overflow-y-auto">

        {navigation.map((group) => (
          <div
            key={group.label}
            className="mb-7"
          >

            <p className="mb-3 px-2 text-[10px] font-bold tracking-[0.2em] text-[#91a293]">
              {group.label}
            </p>

            <div className="space-y-1">

              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);

                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      onClose?.();
                    }}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-none ${
                      active
                        ? "bg-[#e8f4e7] font-semibold text-[#148344]"
                        : "text-[#607363] hover:bg-white/70"
                    }`}
                  >
                    <Icon
                      size={19}
                      strokeWidth={1.7}
                      className={
                        active
                          ? "text-[#148344]"
                          : "text-[#78917d]"
                      }
                    />

                    <span>
                      {item.label}
                    </span>

                  </button>
                );
              })}

            </div>

          </div>
        ))}


        <div className="mb-5 border-t border-[#dce8dc]" />


        {/* PROFILE */}
        <button
          onClick={() =>
            navigate("/farmer-dashboard/profile")
          }
          className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
            isActive("/farmer-dashboard/profile")
              ? "bg-[#e8f4e7] font-semibold text-[#148344]"
              : "text-[#607363]"
          }`}
        >
          <User
            size={19}
            strokeWidth={1.7}
          />

          Profile
        </button>


        {/* SIGN OUT */}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#607363]"
        >
          <LogOut
            size={19}
            strokeWidth={1.7}
          />

          Sign out
        </button>

      </div>


      {/* FOOTER */}
      <p className="shrink-0 pt-4 text-center text-[10px] text-[#9aaa9b]">
        © 2026 AyurHerb
      </p>


      {/* BOTANICAL CORNER */}
      <div className="sidebar-botanical" />

    </div>
  );
}