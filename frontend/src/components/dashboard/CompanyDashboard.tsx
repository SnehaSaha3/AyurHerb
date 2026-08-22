import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  LayoutDashboard,
  MapPinned,
  MessageSquare,
  Package,
  Truck,
  User,
} from "lucide-react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useUnread } from "../../context/UnreadContext";
import logo from "../../assets/logo.png";

interface MenuItem {
  name: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
}

export default function CompanyDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { totalUnread } = useUnread();

  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const token = localStorage.getItem("companyToken");

        if (!token) return;

        const response = await axios.get(
          "http://localhost:8000/api/companies/me",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data?.company?.name) {
          setCompanyName(response.data.company.name);
        }
      } catch (error) {
        console.error("Error fetching company:", error);
      }
    };

    fetchCompany();
  }, []);

  const menu: MenuItem[] = [
    {
      name: "Dashboard",
      icon: <LayoutDashboard size={17} strokeWidth={1.8} />,
      path: "/company-dashboard",
    },
    {
      name: "Explore Farmers",
      icon: <MapPinned size={17} strokeWidth={1.8} />,
      path: "/company-dashboard/explore",
    },
    {
      name: "Orders",
      icon: <Package size={17} strokeWidth={1.8} />,
      path: "/company-dashboard/orders",
    },
    {
      name: "Shipments",
      icon: <Truck size={17} strokeWidth={1.8} />,
      path: "/company-dashboard/shipments",
    },
    {
      name: "Analytics",
      icon: <BarChart3 size={17} strokeWidth={1.8} />,
      path: "/company-dashboard/analytics",
    },
    {
      name: "Messages",
      icon: <MessageSquare size={17} strokeWidth={1.8} />,
      path: "/company-dashboard/messages",
      badge: totalUnread,
    },
    {
      name: "Profile",
      icon: <User size={17} strokeWidth={1.8} />,
      path: "/company-dashboard/profile",
    },
  ];

  const activeItem = menu.find((item) =>
    item.path === "/company-dashboard"
      ? location.pathname === item.path
      : location.pathname.startsWith(item.path)
  );

  const initial = companyName
    ? companyName.charAt(0).toUpperCase()
    : "C";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f4f7f4] text-gray-900">

      {/* =====================================================
          AMBIENT BACKGROUND
      ===================================================== */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">

        {/* Large ambient orb */}
        <div
          className="
            absolute
            -left-32
            -top-32
            h-[420px]
            w-[420px]
            rounded-full
            bg-violet-300/20
            blur-[110px]
          "
        />

        <div
          className="
            absolute
            right-[-120px]
            top-[18%]
            h-[420px]
            w-[420px]
            rounded-full
            bg-emerald-300/20
            blur-[120px]
          "
        />

        <div
          className="
            absolute
            bottom-[-180px]
            left-[35%]
            h-[450px]
            w-[450px]
            rounded-full
            bg-indigo-200/15
            blur-[120px]
          "
        />

        {/* subtle grid */}
        <div
          className="
            absolute
            inset-0
            opacity-[0.025]
            [background-image:linear-gradient(#111_1px,transparent_1px),linear-gradient(90deg,#111_1px,transparent_1px)]
            [background-size:40px_40px]
          "
        />
      </div>

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className="
          fixed
          inset-y-4
          left-4
          z-50
          flex
          w-[245px]
          flex-col
          overflow-hidden
          rounded-[28px]
          border
          border-white/70
          bg-white/55
          shadow-[0_25px_80px_rgba(40,50,40,0.10)]
          backdrop-blur-2xl
          backdrop-saturate-150
        "
      >

        {/* soft inner glow */}
        <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/70" />

        {/* =================================================
            LOGO
        ================================================= */}

        <div className="relative px-5 pb-5 pt-6">

          <div className="flex items-center gap-3">

            <div
              className="
                flex
                h-[48px]
                w-[48px]
                shrink-0
                items-center
                justify-center
                rounded-2xl
                border
                border-white/80
                bg-white/70
                shadow-[0_8px_25px_rgba(70,80,70,0.08)]
              "
            >
              <img
                src={logo}
                alt="AyurHerb"
                className="h-[38px] w-[38px] object-contain"
              />
            </div>

            <div className="min-w-0">
              <p className="text-[15px] font-bold tracking-[-0.02em] text-gray-900">
                AyurHerb
              </p>

              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />

                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                  Company workspace
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* divider */}
        <div className="mx-5 h-px bg-black/[0.04]" />

        {/* =================================================
            NAVIGATION
        ================================================= */}

        <div className="relative flex-1 overflow-y-auto px-3 py-5">

          <p className="mb-3 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-gray-400">
            Workspace
          </p>

          <nav className="space-y-1">

            {menu.map((item) => {

              const isActive = item.name === activeItem?.name;

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`
                    group
                    relative
                    flex
                    w-full
                    items-center
                    justify-between
                    rounded-2xl
                    px-3
                    py-2.5
                    text-left
                    text-[13px]
                    transition-all
                    duration-300
                    ease-out

                    ${
                      isActive
                        ? `
                          border
                          border-white/80
                          bg-white/75
                          text-violet-700
                          shadow-[0_8px_25px_rgba(80,70,120,0.08)]
                          backdrop-blur-xl
                        `
                        : `
                          border
                          border-transparent
                          text-gray-500
                          hover:border-white/60
                          hover:bg-white/45
                          hover:text-gray-900
                        `
                    }
                  `}
                >

                  {/* active glow */}
                  {isActive && (
                    <span
                      className="
                        absolute
                        -left-[1px]
                        top-1/2
                        h-6
                        w-[3px]
                        -translate-y-1/2
                        rounded-full
                        bg-violet-500
                        shadow-[0_0_12px_rgba(139,92,246,0.6)]
                      "
                    />
                  )}

                  <span className="flex items-center gap-3">

                    <span
                      className={`
                        flex
                        h-8
                        w-8
                        items-center
                        justify-center
                        rounded-xl
                        transition-all
                        duration-300

                        ${
                          isActive
                            ? "bg-violet-50 text-violet-600"
                            : "bg-white/30 text-gray-400 group-hover:bg-white/70 group-hover:text-gray-600"
                        }
                      `}
                    >
                      {item.icon}
                    </span>

                    <span
                      className={
                        isActive
                          ? "font-semibold"
                          : "font-medium"
                      }
                    >
                      {item.name}
                    </span>

                  </span>

                  {!!item.badge && (
                    <span
                      className="
                        flex
                        h-5
                        min-w-[20px]
                        items-center
                        justify-center
                        rounded-full
                        bg-violet-600
                        px-1.5
                        text-[9px]
                        font-bold
                        text-white
                        shadow-[0_3px_10px_rgba(124,58,237,0.3)]
                      "
                    >
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}

                </button>
              );
            })}

          </nav>
        </div>

        {/* =================================================
            BOTTOM CARD
        ================================================= */}

        <div className="relative p-3">

          <div
            className="
              overflow-hidden
              rounded-2xl
              border
              border-white/70
              bg-white/45
              p-3.5
              backdrop-blur-xl
            "
          >

            <div className="flex items-center gap-2.5">

              <div
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-xl
                  bg-emerald-50
                  text-emerald-600
                "
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              </div>

              <div>
                <p className="text-[10px] font-semibold text-gray-700">
                  Network active
                </p>

                <p className="text-[9px] text-gray-400">
                  AyurHerb supply system
                </p>
              </div>

            </div>

          </div>

          <p className="mt-3 text-center text-[9px] text-gray-400">
            © 2026 AyurHerb
          </p>

        </div>

      </aside>

      {/* =====================================================
          MAIN AREA
      ===================================================== */}

      <div className="relative ml-[277px] min-h-screen">

        {/* =================================================
            TOP BAR
        ================================================= */}

        <header
          className="
            sticky
            top-0
            z-40
            flex
            h-[78px]
            items-center
            justify-between
            border-b
            border-white/50
            bg-white/35
            px-8
            backdrop-blur-2xl
            backdrop-saturate-150
          "
        >

          <div>

            <div className="flex items-center gap-2">

              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">
                Company
              </span>

              <span className="text-gray-300">
                /
              </span>

              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400">
                {activeItem?.name || "Dashboard"}
              </span>

            </div>

            <p className="mt-1 text-xs text-gray-400">
              Manage your AyurHerb operations
            </p>

          </div>

          <div className="flex items-center gap-3">

            {/* notification */}

            <button
              className="
                relative
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                border
                border-white/70
                bg-white/50
                text-gray-400
                shadow-sm
                backdrop-blur-xl
                transition-all
                duration-300
                hover:-translate-y-0.5
                hover:bg-white/80
                hover:text-gray-700
                hover:shadow-md
              "
            >
              <Bell size={17} strokeWidth={1.8} />

              {totalUnread > 0 && (
                <span
                  className="
                    absolute
                    right-2
                    top-2
                    h-1.5
                    w-1.5
                    rounded-full
                    bg-violet-500
                    shadow-[0_0_8px_rgba(139,92,246,0.8)]
                  "
                />
              )}
            </button>

            {/* divider */}

            <div className="mx-1 h-7 w-px bg-black/[0.06]" />

            {/* company identity */}

            <div
              className="
                flex
                items-center
                gap-2.5
                rounded-2xl
                border
                border-white/70
                bg-white/45
                py-1.5
                pl-1.5
                pr-3
                shadow-sm
                backdrop-blur-xl
              "
            >

              <div
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-xl
                  bg-gradient-to-br
                  from-violet-500
                  to-indigo-500
                  text-xs
                  font-bold
                  text-white
                  shadow-[0_5px_15px_rgba(124,58,237,0.25)]
                "
              >
                {initial}
              </div>

              <div className="hidden sm:block">

                <p className="max-w-[150px] truncate text-[11px] font-semibold text-gray-800">
                  {companyName || "Company"}
                </p>

                <p className="text-[9px] text-gray-400">
                  Company account
                </p>

              </div>

            </div>

          </div>

        </header>

        {/* =================================================
            CONTENT
        ================================================= */}

        <main className="relative px-6 py-7 lg:px-8">

          <div className="mx-auto max-w-[1500px]">
            <Outlet />
          </div>

        </main>

      </div>

    </div>
  );
}