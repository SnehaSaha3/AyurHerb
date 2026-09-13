import { ArrowLeft, Bell, Sparkles, Sprout, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Recommendations() {
  const navigate = useNavigate();

  return (
    <div className="min-h-full pb-8">
      <div
        className="
          relative
          min-h-[calc(100vh-110px)]
          overflow-hidden
          rounded-[30px]
          border border-white/80
          bg-white/[0.91]
          shadow-[0_18px_55px_rgba(31,69,39,0.08)]
          backdrop-blur-md
        "
      >
        {/* subtle background decoration */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#dcefd9]/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-[#edf5e9]/60 blur-3xl" />

        <div className="relative flex min-h-[calc(100vh-110px)] flex-col">
          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-[#e8eee6] px-6 py-5 sm:px-8 lg:px-10">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9aa897]">
                Intelligence
              </p>

              <h1 className="mt-1 text-lg font-semibold tracking-tight text-[#193522]">
                Recommendations
              </h1>
            </div>

            <div className="hidden items-center gap-2 rounded-full bg-[#f1f7ef] px-3 py-1.5 text-[10px] font-semibold text-[#4d8957] sm:flex">
              <Sparkles size={13} />
              Coming soon
            </div>
          </div>

          {/* MAIN */}
          <main className="flex flex-1 items-center justify-center px-6 py-16 sm:px-8 lg:px-10">
            <div className="mx-auto w-full max-w-2xl text-center">
              {/* ICON */}
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] border border-[#dcebd9] bg-[#f1f7ef] text-[#4d8957] shadow-[0_10px_30px_rgba(60,120,70,0.08)]">
                <Sparkles
                  size={34}
                  strokeWidth={1.5}
                />
              </div>

              {/* TITLE */}
              <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.25em] text-[#9aa897]">
                AyurHerb Intelligence
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#193522] sm:text-4xl">
                We're teaching AyurHerb
                <br />
                to read your farm.
              </h2>

              <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#718071]">
                Recommendations are being built from the data you already
                generate — soil moisture readings, crop stage, and buyer
                demand on the marketplace — so what shows up here reflects
                your farm, not a generic playbook.
              </p>

              {/* UPCOMING FEATURES */}
              <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 divide-y divide-[#e8eee6] border-y border-[#e8eee6] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="px-5 py-5">
                  <Sprout
                    size={18}
                    className="mx-auto text-[#5a8c62]"
                    strokeWidth={1.7}
                  />

                  <p className="mt-3 text-xs font-semibold text-[#314b36]">
                    Crop guidance
                  </p>

                  <p className="mt-1 text-[10px] leading-5 text-[#8b9888]">
                    Advice tied to what you've actually planted — season,
                    stage, and moisture trends.
                  </p>
                </div>

                <div className="px-5 py-5">
                  <TrendingUp
                    size={18}
                    className="mx-auto text-[#5a8c62]"
                    strokeWidth={1.7}
                  />

                  <p className="mt-3 text-xs font-semibold text-[#314b36]">
                    Market signals
                  </p>

                  <p className="mt-1 text-[10px] leading-5 text-[#8b9888]">
                    See which herbs buyers are asking for before you decide
                    what to grow next.
                  </p>
                </div>

                <div className="px-5 py-5">
                  <Bell
                    size={18}
                    className="mx-auto text-[#5a8c62]"
                    strokeWidth={1.7}
                  />

                  <p className="mt-3 text-xs font-semibold text-[#314b36]">
                    Timely alerts
                  </p>

                  <p className="mt-1 text-[10px] leading-5 text-[#8b9888]">
                    A nudge when moisture drifts out of range or a shipment
                    stalls.
                  </p>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate("/farmer-dashboard")}
                  className="
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-[#28733d]
                    px-5
                    py-2.5
                    text-xs
                    font-semibold
                    text-white
                    shadow-[0_8px_20px_rgba(40,115,61,0.16)]
                    transition
                    hover:bg-[#216534]
                  "
                >
                  <ArrowLeft size={14} />
                  Back to dashboard
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/farmer-dashboard/crops")}
                  className="
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    border
                    border-[#dce7d9]
                    bg-white/70
                    px-5
                    py-2.5
                    text-xs
                    font-semibold
                    text-[#3f6045]
                    transition
                    hover:bg-[#f7faf6]
                  "
                >
                  View my crops
                </button>
              </div>

              <p className="mt-7 text-[10px] text-[#a0aaa0]">
                We'll turn this on as soon as there's enough farm data to
                make it worth trusting.
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}