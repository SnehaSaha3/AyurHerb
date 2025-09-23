import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface Farmer {
  name: string;
  contact: string;
  email: string;
  address: string;
  herb: string;
}

interface Company {
  name: string;
  contact: string;
  email: string;
  address: string;
}

interface RegistrationFormProps {
  role: "farmer" | "company";
  cropOptions?: string[];
}

export default function RegistrationForms({ role, cropOptions }: RegistrationFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    email: "",
    address: "",
    herb: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [registeredData, setRegisteredData] = useState<Farmer | Company | null>(null);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url =
        role === "farmer"
          ? "http://localhost:5000/api/farmers/register"
          : "http://localhost:5000/api/companies/register";

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Something went wrong");
      }

      const data = await res.json();

      localStorage.setItem("token", data.token);
      localStorage.setItem(role, JSON.stringify(data[role])); // save as farmer or company

      setMessage("✅ Registration successful!");
      setRegisteredData(data[role]);
      setFormData({ name: "", contact: "", email: "", address: "", herb: "" });

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
  }
  return (
    <div className="p-6 max-w-md mx-auto bg-white shadow-md rounded">
      <h2 className="text-xl font-bold mb-4">
        {role === "farmer" ? "Farmer Registration" : "Company Registration"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          name="name"
          placeholder={role === "farmer" ? "Farmer Name" : "Company Name"}
          value={formData.name}
          onChange={handleChange}
          className="border p-2 w-full rounded"
          required
        />

        <input
          type="text"
          name="contact"
          placeholder="Contact Number"
          value={formData.contact}
          onChange={handleChange}
          className="border p-2 w-full rounded"
          required
        />

        <input
          type="text"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          className="border p-2 w-full rounded"
          required
        />

        <input
          type="text"
          name="address"
          placeholder="Address"
          value={formData.address}
          onChange={handleChange}
          className="border p-2 w-full rounded"
          required
        />

        {role === "farmer" && (
          <select
            name="herb"
            value={formData.herb}
            onChange={handleChange}
            className="border p-2 w-full rounded"
            required
          >
            <option value="">-- Select Herb --</option>
            {cropOptions?.map((crop) => (
              <option key={crop} value={crop}>
                {crop}
              </option>
            ))}
          </select>
        )}

        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded w-full"
          disabled={loading}
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </form>

      {message && <p className="mt-3 text-red-600">{message}</p>}

      {registeredData && (
        <div className="mt-4 p-3 border rounded bg-gray-100">
          <h3 className="font-semibold">
            {role === "farmer" ? "👩‍🌾 Registered Farmer Details:" : "🏢 Registered Company Details:"}
          </h3>
          <p><strong>Name:</strong> {registeredData.name}</p>
          <p><strong>Contact:</strong> {registeredData.contact}</p>
          <p><strong>Email:</strong> {registeredData.email}</p>
          <p><strong>Address:</strong> {registeredData.address}</p>
          {role === "farmer" && "herb" in registeredData && <p><strong>Herb:</strong> {registeredData.herb}</p>}
        </div>
      )}
    </div>
  );
}
