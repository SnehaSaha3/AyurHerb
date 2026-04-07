import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface LoginFormProps {
  role: "farmer" | "company";
}

export default function LoginForm({ role }: LoginFormProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url =
        role === "farmer"
          ? "http://localhost:8000/api/farmers/login"
          : "http://localhost:8000/api/companies/login";

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || "Login failed");
      }

      const data: { token: string; [key: string]: unknown } = await res.json();

      localStorage.setItem("token", data.token);
      localStorage.setItem(role, JSON.stringify(data[role]));

      setMessage("✅ Login successful!");

      setTimeout(() => navigate(`/${role}-dashboard`), 1500);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage("❌ " + err.message);
      } else {
        setMessage("❌ An unknown error occurred");
      }
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
          className="bg-green-600 text-white px-4 py-2 rounded w-full"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {message && <p className="mt-3 text-red-600">{message}</p>}
    </div>
  );
}
