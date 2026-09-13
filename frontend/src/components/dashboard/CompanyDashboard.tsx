import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  LayoutDashboard,
  MapPinned,
  Menu,
  MessageSquare,
  Package,
  Truck,
  User,
  X,
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

        setCompanyName(
          response.data?.company?.name || ""
        );
      } catch (error) {
        console.error("Error fetching company:", error);
      }
    };

    fetchCompany();
  }, []);

  const menu: MenuItem[] = [
    {
      name: "Overview",
      icon: (
        <LayoutDashboard
          size={17}
          strokeWidth={1.8}
        />
      ),
      path: "/company-dashboard",
    },
    {
      name: "Farm Network",
      icon: (
        <MapPinned
          size={17}
          strokeWidth={1.8}
        />
      ),
      path: "/company-dashboard/explore",
    },
    {
      name: "Orders",
      icon: (
        <Package
          size={17}
          strokeWidth={1.8}
        />
      ),
      path: "/company-dashboard/orders",
    },
    {
      name: "Shipments",
      icon: (
        <Truck
          size={17}
          strokeWidth={1.8}
        />
      ),
      path: "/company-dashboard/shipments",
    },
    {
      name: "Analytics",
      icon: (
        <BarChart3
          size={17}
          strokeWidth={1.8}
        />
      ),
      path: "/company-dashboard/analytics",
    },
    {
      name: "Messages",
      icon: (
        <MessageSquare
          size={17}
          strokeWidth={1.8}
        />
      ),
      path: "/company-dashboard/messages",
      badge: totalUnread,
    },
    {
      name: "Profile",
      icon: (
        <User
          size={17}
          strokeWidth={1.8}
        />
      ),
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

  const handleNavigate = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f7f8f6] text-[#1f2421]">

      {sidebarOpen && (
        <button
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
        />
      )}

      {/* SIDEBAR */}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex w-[232px] flex-col
          border-r border-[#e6e8e5]
          bg-white
          transition-transform duration-300 ease-out
          lg:translate-x-0
          ${
            sidebarOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >

        {/* LOGO */}

        <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-[#eef0ed] px-5">

          <button
            onClick={() =>
              handleNavigate("/company-dashboard")
            }
            className="flex items-center"
          >
            <img
              src={logo}
              alt="AyurHerb"
              className="h-9 w-auto object-contain"
            />
          </button>

          <button
            onClick={() =>
              setSidebarOpen(false)
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8d958f] hover:bg-[#f5f6f4] lg:hidden"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>

        </div>

        {/* NAVIGATION */}

        <nav className="flex-1 overflow-y-auto px-3 py-5">

          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a0a6a1]">
            Workspace
          </p>

          <div className="space-y-0.5">

            {menu.map((item) => {
              const isActive =
                item.name === activeItem?.name;

              return (
                <button
                  key={item.path}
                  onClick={() =>
                    handleNavigate(item.path)
                  }
                  className={`
                    group flex w-full items-center justify-between
                    rounded-[9px]
                    px-3 py-[10px]
                    text-left text-[13px]
                    transition-all duration-150
                    ${
                      isActive
                        ? "bg-[#eef1ed] text-[#202521]"
                        : "text-[#69716b] hover:bg-[#f7f8f6] hover:text-[#252a26]"
                    }
                  `}
                >

                  <span className="flex min-w-0 items-center gap-3">

                    <span
                      className={`
                        shrink-0 transition-colors
                        ${
                          isActive
                            ? "text-[#303730]"
                            : "text-[#929992] group-hover:text-[#687168]"
                        }
                      `}
                    >
                      {item.icon}
                    </span>

                    <span
                      className={`
                        truncate
                        ${
                          isActive
                            ? "font-medium"
                            : "font-normal"
                        }
                      `}
                    >
                      {item.name}
                    </span>

                  </span>

                  {item.badge &&
                  item.badge > 0 ? (
                    <span className="ml-2 flex h-[19px] min-w-[19px] shrink-0 items-center justify-center rounded-full bg-[#252a26] px-1.5 text-[9px] font-semibold text-white">
                      {item.badge > 9
                        ? "9+"
                        : item.badge}
                    </span>
                  ) : null}

                </button>
              );
            })}

          </div>

        </nav>

        {/* FOOTER */}

        <div className="shrink-0 border-t border-[#eef0ed] px-5 py-4">

          <p className="text-[10px] font-medium text-[#8c948e]">
            AyurHerb © {new Date().getFullYear()}
          </p>
        </div>

      </aside>

      {/* MAIN */}

      <div className="min-h-screen lg:ml-[232px]">

        {/* TOP BAR */}

        <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-[#e6e8e5] bg-white px-4 sm:px-6 lg:px-8">

          <div className="flex min-w-0 items-center gap-3">

            <button
              onClick={() =>
                setSidebarOpen(true)
              }
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#69716b] hover:bg-[#f4f6f3] lg:hidden"
              aria-label="Open navigation"
            >
              <Menu size={19} />
            </button>

            <div className="min-w-0">

              <p className="truncate text-[9px] font-medium uppercase tracking-[0.14em] text-[#a0a6a1] sm:text-[10px]">
                Company workspace
              </p>

              {activeItem &&
              activeItem.name !== "Overview" ? (
                <p className="mt-0.5 truncate text-[12px] font-medium text-[#303630] sm:text-[13px]">
                  {activeItem.name}
                </p>
              ) : null}

            </div>

          </div>

          {/* RIGHT */}

          <div className="flex shrink-0 items-center gap-3 sm:gap-5">

            <button
              className="
                relative flex h-9 w-9
                items-center justify-center
                rounded-full
                text-[#8c948e]
                transition-colors
                hover:bg-[#f5f6f4]
                hover:text-[#343a35]
              "
              aria-label="Notifications"
            >
              <Bell
                size={17}
                strokeWidth={1.8}
              />

              <span className="absolute right-[8px] top-[7px] h-1.5 w-1.5 rounded-full bg-[#6f8273]" />
            </button>

            <div className="hidden h-6 w-px bg-[#e7e9e6] sm:block" />

            <div className="flex items-center gap-2.5 sm:gap-3">

              <div className="hidden text-right md:block">

                <p className="max-w-[180px] truncate text-[12px] font-medium text-[#303630]">
                  {companyName || "Company"}
                </p>

                <p className="mt-0.5 text-[10px] text-[#9ba19c]">
                  Company account
                </p>

              </div>

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#dfe3df] bg-[#f5f6f4] text-[12px] font-semibold text-[#495149]">
                {initial}
              </div>

            </div>

          </div>

        </header>

        {/* CONTENT */}

        <main className="min-w-0 px-3 py-5 sm:px-5 sm:py-6 lg:px-7 lg:py-7 xl:px-8">

          <Outlet />

        </main>

      </div>

    </div>
  );
}