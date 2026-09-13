import React from "react";
import type { ReactNode } from "react";
import {
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  ChevronDown,
  ChevronRight,
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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import AyurHerbAtmosphere from "./AyurHerbAtmosphere";
import "../../styles/ayurherb-atmosphere.css";

import { useUnread } from "../../context/UnreadContext";
import logo from "../../assets/logo-transparent.png";

interface NavLink {
  name: string;
  path: string;
}

interface DashboardLayoutProps {
  sidePanel?: ReactNode;
  userType?: string;
  links?: NavLink[];
  farmerName?: string;
  unreadMessages?: number;
}

const ICON_BY_PATH: Record<string, typeof Home> = {
  "/farmer-dashboard": Home,
  "/farmer-dashboard/crops": Leaf,
  "/farmer-dashboard/geotagged": MapPin,
  "/farmer-dashboard/shipments": Package,
  "/farmer-dashboard/recommendations": Sparkles,
  "/farmer-dashboard/messages": MessageCircle,
  "/farmer-dashboard/analytics": BarChart3,
  "/farmer-dashboard/profile": User,
};

const defaultNavigation = [
  {
    label: "COMMAND",
    items: [{ label: "Home", path: "/farmer-dashboard", icon: Home }],
  },
  {
    label: "FARM",
    items: [
      { label: "My Crops", path: "/farmer-dashboard/crops", icon: Leaf },
      { label: "Geo Tagging", path: "/farmer-dashboard/geotagged", icon: MapPin },
    ],
  },
  {
    label: "BUSINESS",
    items: [
      { label: "Shipments", path: "/farmer-dashboard/shipments", icon: Package },
      { label: "Recommendations", path: "/farmer-dashboard/recommendations", icon: Sparkles },
      { label: "Messages", path: "/farmer-dashboard/messages", icon: MessageCircle },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [{ label: "Analytics", path: "/farmer-dashboard/analytics", icon: BarChart3 }],
  },
];

export default function DashboardLayout({
  sidePanel,
  userType = "Farmer",
  links,
  farmerName,
  unreadMessages = 0,
}: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const { totalUnread } = useUnread();

  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({
    COMMAND: true,
    FARM: true,
    BUSINESS: true,
    INTELLIGENCE: true,
  });

  const isActive = (path: string) => {
    if (path === "/farmer-dashboard") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("farmerToken");
    navigate("/login");
  };

  const navigation = links
    ? [
        {
          label: userType.toUpperCase(),
          items: links
            .filter((link) => link.path !== "/farmer-dashboard/profile")
            .map((link) => ({
              label: link.name,
              path: link.path,
              icon: ICON_BY_PATH[link.path] || Home,
            })),
        },
      ]
    : defaultNavigation;

  const showAyurMate =
    Boolean(sidePanel) && location.pathname === "/farmer-dashboard";

  return (
    <div className="ayurherb-dashboard h-screen overflow-hidden">
      <AyurHerbAtmosphere />

      <div className="relative z-10 h-full">
        {/* =====================================================
            MOBILE SIDEBAR
           ===================================================== */}
        {mobileOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden">
            <div
              className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
              onClick={() => setMobileOpen(false)}
            />

            <aside className="relative z-10 h-full w-[280px] overflow-hidden border-r border-white/70 bg-white/85 shadow-2xl backdrop-blur-xl">
              <Sidebar
                collapsed={false}
                setCollapsed={setCollapsed}
                isActive={isActive}
                navigate={navigate}
                handleLogout={handleLogout}
                openGroups={openGroups}
                toggleGroup={toggleGroup}
                onClose={() => setMobileOpen(false)}
                navigation={navigation}
                userType={userType}
                farmerName={farmerName}
                unreadMessages={totalUnread}
                mobile
              />
            </aside>
          </div>
        )}

        {/* =====================================================
            MAIN LAYOUT
           ===================================================== */}
        <div className="flex h-full min-h-0 gap-4 p-3 sm:p-4 lg:gap-5 lg:p-5">
          {/* SIDEBAR */}
          <aside
            className={`
              hidden h-full shrink-0 lg:block
              transition-[width] duration-300 ease-out
              ${collapsed ? "w-[82px]" : "w-[250px]"}
            `}
          >
            <div
              className="
                h-full overflow-hidden rounded-[28px]
                border border-white/70 bg-white/70
                shadow-[0_20px_60px_rgba(23,54,32,0.10)]
                backdrop-blur-2xl
              "
            >
              <Sidebar
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                isActive={isActive}
                navigate={navigate}
                handleLogout={handleLogout}
                openGroups={openGroups}
                toggleGroup={toggleGroup}
                navigation={navigation}
                userType={userType}
                farmerName={farmerName}
                unreadMessages={totalUnread}
              />
            </div>
          </aside>

          {/* CENTER */}
          <main className="relative flex min-w-0 min-h-0 flex-1 flex-col">
            {/* Mobile-only sidebar toggle — floats over content, no header bar */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="
                absolute left-0 top-0 z-20 flex h-10 w-10
                items-center justify-center rounded-xl
                border border-white/70 bg-white/85
                text-[#2a4a32] shadow-[0_8px_20px_rgba(23,54,32,0.08)]
                backdrop-blur-xl transition hover:bg-white
                lg:hidden
              "
              aria-label="Open navigation"
            >
              <Menu size={19} />
            </button>

            {/* CONTENT */}
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin">
              <Outlet />
            </div>
          </main>

          {/* AYURMATE */}
          {showAyurMate && (
            <aside className="hidden h-full w-[350px] shrink-0 xl:block">
              <div
                className="
                  h-full overflow-hidden rounded-[28px]
                  border border-white/70 bg-white/70
                  shadow-[0_20px_60px_rgba(23,54,32,0.10)]
                  backdrop-blur-2xl
                "
              >
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

interface NavItem {
  label: string;
  path: string;
  icon: typeof Home;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

function Sidebar({
  collapsed,
  setCollapsed,
  isActive,
  navigate,
  handleLogout,
  openGroups,
  toggleGroup,
  navigation,
  userType,
  farmerName,
  unreadMessages,
  onClose,
  mobile = false,
}: {
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isActive: (path: string) => boolean;
  navigate: (path: string) => void;
  handleLogout: () => void;
  openGroups: Record<string, boolean>;
  toggleGroup: (label: string) => void;
  navigation: NavGroup[];
  userType: string;
  farmerName?: string;
  unreadMessages: number;
  onClose?: () => void;
  mobile?: boolean;
}) {
  return (
    <div className="relative flex h-full min-h-0 flex-col px-3 py-4">
      {/* BRAND */}
      <div className={`flex shrink-0 items-center ${collapsed ? "justify-center" : "px-2"}`}>
        {!collapsed ? (
          <button
            onClick={() => navigate("/farmer-dashboard")}
            className="flex min-w-0 items-center outline-none"
            aria-label="AyurHerb home"
          >
            <img
              src={logo}
              alt="AyurHerb"
              className="h-[54px] w-auto max-w-[175px] object-contain object-left"
            />
          </button>
        ) : (
          <button
            onClick={() => navigate("/farmer-dashboard")}
            className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/80 bg-white/70 shadow-sm"
            aria-label="AyurHerb home"
          >
            <img src={logo} alt="AyurHerb" className="h-10 w-auto max-w-none object-contain" />
          </button>
        )}

        {mobile && (
          <button
            onClick={onClose}
            className="ml-auto rounded-xl p-2 text-[#617665] transition hover:bg-white/70"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}

        {!mobile && !collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#708271] transition hover:bg-white/70"
            aria-label="Collapse navigation"
            title="Collapse navigation"
          >
            <PanelLeftClose size={18} />
          </button>
        )}

        {!mobile && collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="absolute right-2 top-4 flex h-9 w-9 items-center justify-center rounded-xl text-[#708271] transition hover:bg-white/70"
            aria-label="Expand navigation"
            title="Expand navigation"
          >
            <PanelLeftOpen size={18} />
          </button>
        )}
      </div>

      {/* NAVIGATION */}
      <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
        {navigation.map((group) => {
          const groupOpen = openGroups[group.label] ?? true;

          return (
            <div key={group.label} className="mb-4">
              {!collapsed ? (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="mb-2 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition hover:bg-white/40"
                >
                  <span className="text-[9px] font-bold tracking-[0.2em] text-[#91a293]">
                    {group.label}
                  </span>
                  <ChevronDown
                    size={13}
                    className={`text-[#91a293] transition-transform ${groupOpen ? "" : "-rotate-90"}`}
                  />
                </button>
              ) : (
                <div className="mb-2 flex justify-center">
                  <div className="h-px w-7 bg-[#dce8dc]" />
                </div>
              )}

              {groupOpen && (
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    const isMessages = item.path.endsWith("/messages");
                    const showBadge = isMessages && unreadMessages > 0;

                    return (
                      <button
                        key={item.path}
                        onClick={() => {
                          navigate(item.path);
                          onClose?.();
                        }}
                        title={collapsed ? item.label : undefined}
                        className={`
                          group relative flex w-full items-center rounded-xl py-2.5 text-sm
                          transition-all duration-150
                          ${collapsed ? "justify-center px-2" : "gap-3 px-3"}
                          ${
                            active
                              ? "bg-[#e3f3e5] font-semibold text-[#14803d] shadow-[0_4px_15px_rgba(20,128,61,0.06)]"
                              : "text-[#607363] hover:bg-white/65"
                          }
                        `}
                      >
                        <span className="relative shrink-0">
                          <Icon
                            size={19}
                            strokeWidth={1.7}
                            className={active ? "text-[#14803d]" : "text-[#78917d]"}
                          />
                          {showBadge && collapsed && (
                            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#e5484d] px-1 text-[9px] font-bold text-white">
                              {unreadMessages > 9 ? "9+" : unreadMessages}
                            </span>
                          )}
                        </span>

                        {!collapsed && (
                          <>
                            <span className="truncate">{item.label}</span>

                            {showBadge && (
                              <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#e5484d] px-1.5 text-[10px] font-bold text-white">
                                {unreadMessages > 99 ? "99+" : unreadMessages}
                              </span>
                            )}

                            {!showBadge && active && (
                              <ChevronRight size={13} className="ml-auto text-[#8aae91]" />
                            )}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ACCOUNT */}
      <div className="shrink-0 border-t border-[#dce8dc] pt-3">
        <button
          onClick={() => {
            navigate("/farmer-dashboard/profile");
            onClose?.();
          }}
          title={collapsed ? "Profile" : undefined}
          className={`
            mb-1 flex w-full items-center rounded-xl py-2.5 text-sm transition
            ${collapsed ? "justify-center px-2" : "gap-3 px-3"}
            ${
              isActive("/farmer-dashboard/profile")
                ? "bg-[#e3f3e5] font-semibold text-[#14803d]"
                : "text-[#607363] hover:bg-white/65"
            }
          `}
        >
          <User size={19} strokeWidth={1.7} className="shrink-0" />
          {!collapsed && <span>Profile</span>}
        </button>

        <button
          onClick={handleLogout}
          title={collapsed ? "Sign out" : undefined}
          className={`
            flex w-full items-center rounded-xl py-2.5 text-sm text-[#607363] transition hover:bg-white/65
            ${collapsed ? "justify-center px-2" : "gap-3 px-3"}
          `}
        >
          <LogOut size={19} strokeWidth={1.7} className="shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>

      {!collapsed && (
        <div className="shrink-0 px-2 pt-4">
          <div className="border-t border-[#dce8dc] pt-3">
            <p className="text-center text-[10px] text-[#9aaa9b]">
              AyurHerb © {new Date().getFullYear()}
            </p>
          </div>
        </div>
      )}

      <div className="sidebar-botanical" />
    </div>
  );
}