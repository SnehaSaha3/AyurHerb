import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  describeError,
  LOGIN_BANTER,
  ProgressLog,
  useProgressLog,
} from "./Authprogresslog"

interface LoginFormProps {
  role: "farmer" | "company";
}

const API_BASE = "https://ayurherb-backend-7yw4.onrender.com";

export default function LoginForm({ role }: LoginFormProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { lines, running, start, push, stop } = useProgressLog(LOGIN_BANTER[role]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    start("Contacting the AyurHerb server…");

    try {
      const url =
        role === "farmer"
          ? `${API_BASE}/api/farmers/login`
          : `${API_BASE}/api/companies/login`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      stop();
      push("success", "Server answered.");

      if (!res.ok) {
        const error = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(error.error || "Login failed");
      }

      const data: { token: string; [key: string]: unknown } = await res.json();
      push("success", "Credentials accepted.");

      if (role === "farmer") {
        localStorage.setItem("farmerToken", data.token);
        localStorage.setItem("farmer", JSON.stringify(data.farmer));
      } else {
        localStorage.setItem("companyToken", data.token);
        localStorage.setItem("company", JSON.stringify(data.company));
      }

      push("success", "Session saved on this device.");
      push("info", "Opening your dashboard…");

      setTimeout(() => navigate(`/${role}-dashboard`), 1500);
    } catch (err: unknown) {
      stop();
      push("error", describeError(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white shadow-md rounded">
      <h2 className="text-xl font-bold mb-4">
        {role === "farmer" ? "Farmer Login" : "Company Login"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          className="border p-2 w-full rounded"
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          className="border p-2 w-full rounded"
          required
        />

        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded w-full disabled:opacity-70"
          disabled={loading}
        >
          {loading ? "Logging in…" : "Login"}
        </button>
      </form>

      <ProgressLog lines={lines} running={running} />
    </div>
  );
}