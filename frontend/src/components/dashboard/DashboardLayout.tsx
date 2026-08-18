import {
  BarChart3,
  Bell,
  Home as HomeIcon,
  Leaf,
  LogOut,
  MapPin,
  MessageCircle,
  User,
  Sparkles,
} from "lucide-react";

import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import type { ReactNode } from "react";

type DashboardLink = {
  name: string;
  path: string;
};

type DashboardProps = {
  userType: string;
  links: DashboardLink[];
  farmerName?: string;
  unreadMessages?: number;
};

export default function DashboardLayout({
  userType,
  links,
  farmerName,
  unreadMessages = 0,
}: DashboardProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const iconMap: Record<string, ReactNode> = {
    Home: <HomeIcon size={18} strokeWidth={1.8} />,
    "My Crops": <Leaf size={18} strokeWidth={1.8} />,
    Analytics: <BarChart3 size={18} strokeWidth={1.8} />,
    Recommendations: <Sparkles size={18} strokeWidth={1.8} />,
    "Geo Tagging": <MapPin size={18} strokeWidth={1.8} />,
    Messages: <MessageCircle size={18} strokeWidth={1.8} />,
    Profile: <User size={18} strokeWidth={1.8} />,
  };

  const initials = farmerName
    ? farmerName
        .trim()
        .split(/\s+/)
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "F";

  const handleLogout = () => {
    localStorage.removeItem("farmerToken");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="min-h-screen bg-[#f5f8f4] text-gray-900">

      {/* =====================================================
          BACKGROUND ATMOSPHERE
      ===================================================== */}

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div
          className="
            absolute
            -left-32
            -top-32
            h-[420px]
            w-[420px]
            rounded-full
            bg-emerald-300/15
            blur-[110px]
          "
        />

        <div
          className="
            absolute
            right-[-180px]
            top-[12%]
            h-[500px]
            w-[500px]
            rounded-full
            bg-green-200/20
            blur-[120px]
          "
        />

        <div
          className="
            absolute
            bottom-[-220px]
            left-[30%]
            h-[500px]
            w-[500px]
            rounded-full
            bg-lime-200/15
            blur-[120px]
          "
        />
      </div>


      {/* =====================================================
          DESKTOP APP SHELL
      ===================================================== */}

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1800px] gap-4 p-3 md:p-4">


        {/* ===================================================
            SIDEBAR
        =================================================== */}

        <aside
          className="
            sticky
            top-4
            hidden
            h-[calc(100vh-2rem)]
            w-[235px]
            shrink-0
            flex-col
            overflow-hidden
            rounded-[30px]
            border
            border-white/80
            bg-white/55
            shadow-[0_25px_80px_rgba(30,70,35,0.08)]
            backdrop-blur-[35px]
            md:flex
          "
        >

          {/* BRAND */}

          <div className="px-6 pb-7 pt-7">

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-[14px]
                  bg-gradient-to-br
                  from-green-600
                  to-emerald-400
                  text-white
                  shadow-[0_8px_25px_rgba(34,197,94,0.25)]
                "
              >
                <Leaf size={21} strokeWidth={2} />
              </div>

              <div>
                <p className="text-[17px] font-bold tracking-tight">
                  AyurHerb
                </p>

                <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-gray-400">
                  Farmer workspace
                </p>
              </div>

            </div>

          </div>


          {/* NAVIGATION */}

          <div className="flex-1 px-3">

            <p className="mb-3 px-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-gray-400">
              Workspace
            </p>

            <nav className="space-y-1">

              {links.map((link) => {

                const isCurrent =
                  location.pathname === link.path ||
                  (
                    link.name !== "Home" &&
                    location.pathname.startsWith(
                      `${link.path}/`
                    )
                  );

                return (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    end={link.name === "Home"}
                    className={`
                      group
                      relative
                      flex
                      items-center
                      gap-3
                      rounded-[17px]
                      px-3
                      py-2.5
                      text-sm
                      transition-all
                      duration-200

                      ${
                        isCurrent
                          ? "bg-white/85 text-green-700 shadow-[0_8px_30px_rgba(30,80,35,0.07)]"
                          : "text-gray-500 hover:bg-white/50 hover:text-gray-800"
                      }
                    `}
                  >

                    {isCurrent && (
                      <span
                        className="
                          absolute
                          left-0
                          top-1/2
                          h-5
                          w-[3px]
                          -translate-y-1/2
                          rounded-r-full
                          bg-green-500
                        "
                      />
                    )}

                    <span
                      className={`
                        flex
                        h-8
                        w-8
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        ${
                          isCurrent
                            ? "bg-green-50 text-green-600"
                            : "text-gray-400 group-hover:text-gray-700"
                        }
                      `}
                    >
                      {iconMap[link.name]}
                    </span>

                    <span className="min-w-0 flex-1 truncate">
                      {link.name}
                    </span>

                    {link.name === "Messages" &&
                      unreadMessages > 0 && (
                        <span
                          className="
                            flex
                            h-5
                            min-w-5
                            shrink-0
                            items-center
                            justify-center
                            rounded-full
                            bg-red-500
                            px-1
                            text-[9px]
                            font-bold
                            text-white
                          "
                        >
                          {unreadMessages > 9
                            ? "9+"
                            : unreadMessages}
                        </span>
                      )}

                  </NavLink>
                );
              })}

            </nav>

          </div>


          {/* LOGOUT */}

          <div className="p-3">

            <button
              onClick={handleLogout}
              className="
                flex
                w-full
                items-center
                gap-3
                rounded-2xl
                px-3
                py-3
                text-xs
                text-gray-400
                transition
                hover:bg-red-50
                hover:text-red-500
              "
            >
              <LogOut size={15} />

              Sign out
            </button>

            <p className="pt-2 text-center text-[9px] text-gray-400">
              © 2026 AyurHerb
            </p>

          </div>

        </aside>


        {/* ===================================================
            MAIN CONTENT
        =================================================== */}

        <main className="min-w-0 flex-1">

          {/* =================================================
              TOP BAR
          ================================================= */}

          <header
            className="
              sticky
              top-3
              z-30
              mb-4
              flex
              min-h-[68px]
              items-center
              justify-between
              gap-3
              rounded-[24px]
              border
              border-white/80
              bg-white/65
              px-4
              py-3
              shadow-[0_20px_60px_rgba(30,70,35,0.06)]
              backdrop-blur-[35px]
              md:top-4
              md:px-6
            "
          >

            {/* LEFT */}

            <div className="flex min-w-0 items-center gap-3">

              {/* Mobile logo */}

              <div
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-green-600
                  text-white
                  md:hidden
                "
              >
                <Leaf size={18} />
              </div>

              <div className="min-w-0">

                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                  {userType} workspace
                </p>

                <p className="truncate text-sm font-semibold text-gray-800">
                  {pageTitle}
                </p>

              </div>

            </div>


            {/* RIGHT */}

            <div className="flex shrink-0 items-center gap-2">

              {/* MESSAGE BUTTON */}

              <button
                onClick={() =>
                  navigate(
                    "/farmer-dashboard/messages"
                  )
                }
                aria-label="Messages"
                className="
                  relative
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-white
                  bg-white/65
                  text-gray-500
                  transition
                  hover:bg-white
                  hover:text-green-600
                "
              >
                <Bell size={18} />

                {unreadMessages > 0 && (
                  <span
                    className="
                      absolute
                      right-1
                      top-1
                      h-2
                      w-2
                      rounded-full
                      bg-red-500
                      ring-2
                      ring-white
                    "
                  />
                )}
              </button>


              {/* SINGLE IDENTITY */}

              <button
                onClick={() =>
                  navigate(
                    "/farmer-dashboard/profile"
                  )
                }
                aria-label="Open profile"
                className="
                  flex
                  items-center
                  gap-2
                  rounded-2xl
                  border
                  border-white
                  bg-white/65
                  px-2
                  py-1.5
                  transition
                  hover:bg-white
                "
              >

                <div
                  className="
                    flex
                    h-8
                    w-8
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-gradient-to-br
                    from-green-100
                    to-emerald-50
                    text-[10px]
                    font-bold
                    text-green-700
                  "
                >
                  {initials}
                </div>

                <div className="hidden max-w-[120px] text-left sm:block">

                  <p className="truncate text-xs font-semibold text-gray-800">
                    {farmerName || "Farmer"}
                  </p>

                  <p className="text-[9px] text-gray-400">
                    {userType}
                  </p>

                </div>

              </button>

            </div>

          </header>


          {/* =================================================
              PAGE CONTENT

              IMPORTANT:
              NO overflow-y-auto HERE.

              Browser owns the page scroll.
          ================================================= */}

          <div className="w-full pb-10">

            <div className="w-full px-0.5 md:px-1">

              <Outlet />

            </div>

          </div>

        </main>

      </div>

    </div>
  );
}


/* =============================================================
   PAGE TITLE
============================================================= */

function getPageTitle(pathname: string) {

  if (
    pathname === "/farmer-dashboard" ||
    pathname === "/farmer-dashboard/"
  ) {
    return "Overview";
  }

  if (pathname.startsWith("/farmer-dashboard/crops")) {
    return "My Crops";
  }

  if (pathname.startsWith("/farmer-dashboard/analytics")) {
    return "Analytics";
  }

  if (
    pathname.startsWith(
      "/farmer-dashboard/recommendations"
    )
  ) {
    return "Recommendations";
  }

  if (
    pathname.startsWith(
      "/farmer-dashboard/geotagged"
    )
  ) {
    return "Geo Tagging";
  }

  if (
    pathname.startsWith(
      "/farmer-dashboard/messages"
    )
  ) {
    return "Messages";
  }

  if (
    pathname.startsWith(
      "/farmer-dashboard/profile"
    )
  ) {
    return "Profile";
  }

  return "AyurHerb";
}