import {
  Bell,
  ChevronDown,
  Home as HomeIcon,
  Leaf,
  LogOut,
  MapPin,
  MessageCircle,
  User,
} from "lucide-react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import type { JSX } from "react";

type DashboardProps = {
  userType: string;
  links: { name: string; path: string }[];
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

  const iconMap: Record<string, JSX.Element> = {
    Home: <HomeIcon size={18} strokeWidth={1.8} />,
    "My Crops": <Leaf size={18} strokeWidth={1.8} />,
    "Geo Tagging": <MapPin size={18} strokeWidth={1.8} />,
    Messages: <MessageCircle size={18} strokeWidth={1.8} />,
    Profile: <User size={18} strokeWidth={1.8} />,
  };

  const initials = farmerName
    ? farmerName
        .split(" ")
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

  return (
    <div className="relative h-screen overflow-hidden bg-[#f4f8f3] text-gray-900">

      {/* =====================================================
          SOFT BACKGROUND / ANTI-GRAVITY EFFECT
      ===================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        <div
          className="
            absolute
            -left-24
            -top-24
            h-72
            w-72
            rounded-full
            bg-green-300/20
            blur-3xl
            animate-[pulse_7s_ease-in-out_infinite]
          "
        />

        <div
          className="
            absolute
            right-[-80px]
            top-[18%]
            h-80
            w-80
            rounded-full
            bg-emerald-200/20
            blur-3xl
            animate-[pulse_9s_ease-in-out_infinite]
          "
        />

        <div
          className="
            absolute
            bottom-[-120px]
            left-[35%]
            h-72
            w-72
            rounded-full
            bg-lime-200/15
            blur-3xl
            animate-[pulse_8s_ease-in-out_infinite]
          "
        />

        {/* tiny floating particles */}
        <span className="absolute left-[30%] top-[18%] h-1.5 w-1.5 rounded-full bg-green-400/30 animate-bounce" />
        <span className="absolute left-[72%] top-[32%] h-1 w-1 rounded-full bg-emerald-500/30 animate-pulse" />
        <span className="absolute left-[55%] bottom-[18%] h-1.5 w-1.5 rounded-full bg-green-500/20 animate-bounce" />

      </div>

      {/* =====================================================
          APP SHELL
      ===================================================== */}

      <div className="relative z-10 flex h-full p-3 md:p-4 gap-3 md:gap-4">

        {/* ===================================================
            SIDEBAR
        =================================================== */}

        <aside
          className="
            hidden
            md:flex
            w-[245px]
            shrink-0
            flex-col
            rounded-[26px]
            border
            border-white/70
            bg-white/65
            backdrop-blur-2xl
            shadow-[0_20px_60px_rgba(52,90,55,0.08)]
            overflow-hidden
          "
        >

          {/* Brand */}

          <div className="px-6 pt-7 pb-6">

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-2xl
                  bg-gradient-to-br
                  from-green-600
                  to-emerald-500
                  text-white
                  shadow-lg
                  shadow-green-600/20
                "
              >
                <Leaf size={22} strokeWidth={2} />
              </div>

              <div>
                <h1 className="text-[19px] font-bold tracking-tight text-gray-900">
                  AyurHerb
                </h1>

                <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400">
                  Farmer workspace
                </p>
              </div>

            </div>

          </div>

          {/* Navigation */}

          <div className="px-3">

            <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
              Workspace
            </p>

            <nav className="space-y-1.5">

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
                    className={() =>
                      `
                      group
                      relative
                      flex
                      items-center
                      gap-3
                      rounded-2xl
                      px-3.5
                      py-3
                      text-sm
                      transition-all
                      duration-300
                      ${
                        isCurrent
                          ? `
                            bg-white/90
                            text-green-700
                            shadow-[0_8px_25px_rgba(40,100,50,0.09)]
                            border
                            border-white
                          `
                          : `
                            text-gray-500
                            hover:bg-white/55
                            hover:text-gray-800
                          `
                      }
                    `
                    }
                  >

                    {/* Active indicator */}

                    {isCurrent && (
                      <span
                        className="
                          absolute
                          left-0
                          top-1/2
                          h-6
                          w-1
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
                        items-center
                        justify-center
                        rounded-xl
                        transition
                        ${
                          isCurrent
                            ? "bg-green-50 text-green-600"
                            : "bg-transparent text-gray-400 group-hover:text-gray-700"
                        }
                      `}
                    >
                      {iconMap[link.name]}
                    </span>

                    <span className="flex-1">
                      {link.name}
                    </span>

                    {/* Message notification */}

                    {link.name === "Messages" &&
                      unreadMessages > 0 && (
                        <span
                          className="
                            flex
                            min-w-[20px]
                            h-5
                            items-center
                            justify-center
                            rounded-full
                            bg-red-500
                            px-1.5
                            text-[10px]
                            font-bold
                            text-white
                            shadow-sm
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

          {/* Bottom section */}

          <div className="mt-auto p-3">

            <div
              className="
                rounded-2xl
                border
                border-white/80
                bg-white/55
                p-3
                backdrop-blur-xl
              "
            >

              <div className="flex items-center gap-3">

                <div
                  className="
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-gradient-to-br
                    from-green-100
                    to-emerald-50
                    text-xs
                    font-bold
                    text-green-700
                  "
                >
                  {initials}
                </div>

                <div className="min-w-0 flex-1">

                  <p className="truncate text-xs font-semibold text-gray-800">
                    {farmerName || "Farmer"}
                  </p>

                  <p className="text-[10px] text-gray-400">
                    {userType} account
                  </p>

                </div>

                <ChevronDown
                  size={14}
                  className="text-gray-400"
                />

              </div>

              <button
                onClick={handleLogout}
                className="
                  mt-3
                  flex
                  w-full
                  items-center
                  gap-2
                  rounded-xl
                  px-2
                  py-2
                  text-xs
                  text-gray-400
                  transition
                  hover:bg-red-50
                  hover:text-red-500
                "
              >
                <LogOut size={14} />
                Sign out
              </button>

            </div>

            <p className="mt-4 text-center text-[9px] text-gray-400">
              © 2026 AyurHerb
            </p>

          </div>

        </aside>

        {/* ===================================================
            MAIN AREA
        =================================================== */}

        <main className="flex min-w-0 flex-1 flex-col">

          {/* =================================================
              TOP BAR
          ================================================= */}

          <header
            className="
              mb-3
              flex
              h-[68px]
              shrink-0
              items-center
              justify-between
              rounded-[22px]
              border
              border-white/70
              bg-white/65
              px-4
              md:px-6
              backdrop-blur-2xl
              shadow-[0_15px_40px_rgba(52,90,55,0.06)]
            "
          >

            <div className="flex items-center gap-3">

              {/* Mobile logo */}

              <div
                className="
                  flex
                  h-9
                  w-9
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

              <div>

                <p className="text-[10px] uppercase tracking-[0.15em] text-gray-400">
                  {userType} dashboard
                </p>

                <p className="text-sm font-semibold text-gray-800">
                  {farmerName
                    ? `Welcome back, ${farmerName}`
                    : "Welcome back"}
                </p>

              </div>

            </div>

            <div className="flex items-center gap-2 md:gap-3">

              {/* Notification */}

              <button
                onClick={() =>
                  navigate(
                    "/farmer-dashboard/messages"
                  )
                }
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
                  bg-white/70
                  text-gray-500
                  shadow-sm
                  transition
                  hover:-translate-y-0.5
                  hover:bg-white
                  hover:text-green-600
                "
                aria-label="Messages"
              >

                <Bell size={18} />

                {unreadMessages > 0 && (
                  <>
                    <span
                      className="
                        absolute
                        right-2
                        top-2
                        h-2
                        w-2
                        rounded-full
                        bg-red-500
                        ring-2
                        ring-white
                      "
                    />

                    <span
                      className="
                        absolute
                        -right-1
                        -top-1
                        flex
                        min-w-[18px]
                        h-[18px]
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
                  </>
                )}

              </button>

              {/* User */}

              <div
                className="
                  hidden
                  sm:flex
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-white
                  bg-white/55
                  px-2.5
                  py-1.5
                "
              >

                <div
                  className="
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-lg
                    bg-green-100
                    text-[10px]
                    font-bold
                    text-green-700
                  "
                >
                  {initials}
                </div>

                <div className="max-w-[130px]">

                  <p className="truncate text-xs font-semibold text-gray-800">
                    {farmerName || "Farmer"}
                  </p>

                  <p className="text-[9px] text-gray-400">
                    Farmer
                  </p>

                </div>

              </div>

            </div>

          </header>

          {/* =================================================
              PAGE CONTENT

              IMPORTANT:
              This is the ONLY scrolling container.
              We do NOT call scrollIntoView anywhere here.
          ================================================= */}

          <div
            className="
              min-h-0
              flex-1
              overflow-y-auto
              overscroll-contain
              rounded-[22px]
              pr-0.5
              scrollbar-thin
              scrollbar-thumb-green-200
              scrollbar-track-transparent
            "
          >
            <div className="min-h-full px-1 pb-4 md:px-2">
              <Outlet />
            </div>
          </div>

        </main>

      </div>

    </div>
  );
}

