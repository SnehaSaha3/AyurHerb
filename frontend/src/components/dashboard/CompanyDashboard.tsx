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
import {
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import axios from "axios";
import { useUnread } from "../../context/UnreadContext";
import logo from "../../assets/logo-transparent.png";

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

        setCompanyName(response.data?.company?.name || "");
      } catch (error) {
        console.error("Error fetching company:", error);
      }
    };

    fetchCompany();
  }, []);

  const menu: MenuItem[] = [
    {
      name: "Overview",
      icon: <LayoutDashboard size={17} strokeWidth={1.8} />,
      path: "/company-dashboard",
    },
    {
      name: "Farm Network",
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

  const initial =
    companyName.trim().charAt(0).toUpperCase() || "C";

  return (
    <div className="min-h-screen bg-[#f7f8f6] text-[#1f2421]">

      {/* =========================
          SIDEBAR
      ========================== */}

      <aside className="fixed inset-y-0 left-0 z-30 flex w-[240px] flex-col border-r border-[#e6e8e5] bg-white">

        {/* Logo */}

        <div className="flex h-[72px] items-center border-b border-[#eef0ed] px-6">

          <button
            onClick={() => navigate("/company-dashboard")}
            className="flex items-center"
          >
            <img
              src={logo}
              alt="AyurHerb"
              className="h-9 w-auto object-contain"
            />
          </button>

        </div>


        {/* Navigation */}

        <nav className="flex-1 px-3 py-6">

          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a0a6a1]">
            Workspace
          </p>

          <div className="space-y-1">

            {menu.map((item) => {
              const isActive =
                item.name === activeItem?.name;

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`
                    flex
                    w-full
                    items-center
                    justify-between
                    rounded-[9px]
                    px-3
                    py-[10px]
                    text-left
                    text-[13px]
                    transition-colors
                    ${
                      isActive
                        ? "bg-[#f0f2ef] text-[#202521]"
                        : "text-[#69716b] hover:bg-[#f7f8f6] hover:text-[#252a26]"
                    }
                  `}
                >
                  <span className="flex items-center gap-3">

                    <span
                      className={
                        isActive
                          ? "text-[#303730]"
                          : "text-[#929992]"
                      }
                    >
                      {item.icon}
                    </span>

                    <span
                      className={
                        isActive
                          ? "font-medium"
                          : "font-normal"
                      }
                    >
                      {item.name}
                    </span>

                  </span>

                  {item.badge && item.badge > 0 ? (
                    <span className="flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-[#252a26] px-1.5 text-[9px] font-semibold text-white">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  ) : null}

                </button>
              );
            })}

          </div>

        </nav>


        {/* Sidebar footer */}

        <div className="border-t border-[#eef0ed] px-5 py-4">

          <p className="text-[10px] font-medium text-[#8c948e]">
            AyurHerb
          </p>

          <p className="mt-1 text-[10px] text-[#b0b6b1]">
            Agricultural supply network
          </p>

        </div>

      </aside>


      {/* =========================
          MAIN
      ========================== */}

      <div className="ml-[240px] min-h-screen">

        {/* Top navigation */}

        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[#e6e8e5] bg-white/95 px-8 backdrop-blur">

          {/* Current section */}

          <div>

            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#a0a6a1]">
              Company workspace
            </p>

            <p className="mt-1 text-[13px] font-medium text-[#303630]">
              {activeItem?.name || "Overview"}
            </p>

          </div>


          {/* Company */}

          <div className="flex items-center gap-5">

            {/* Notifications */}

            <button
              className="
                relative
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-full
                text-[#8c948e]
                transition-colors
                hover:bg-[#f5f6f4]
                hover:text-[#343a35]
              "
              aria-label="Notifications"
            >
              <Bell size={17} strokeWidth={1.8} />

              {/* Notification indicator */}

              <span className="absolute right-[8px] top-[7px] h-1.5 w-1.5 rounded-full bg-[#6f8273]" />
            </button>


            <div className="h-6 w-px bg-[#e7e9e6]" />


            {/* Company identity */}

            <div className="flex items-center gap-3">

              <div className="hidden text-right sm:block">

                <p className="text-[12px] font-medium text-[#303630]">
                  {companyName || "Company"}
                </p>

                <p className="mt-0.5 text-[10px] text-[#9ba19c]">
                  Company account
                </p>

              </div>


              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#dfe3df] bg-[#f5f6f4] text-[12px] font-semibold text-[#495149]">
                {initial}
              </div>

            </div>

          </div>

        </header>


        {/* Page content */}

        <main className="px-8 py-7">

          <Outlet />

        </main>

      </div>

    </div>
  );
}