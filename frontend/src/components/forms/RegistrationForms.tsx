import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  describeError,
  ProgressLog,
  REGISTER_BANTER,
  useProgressLog,
} from "./Authprogresslog"

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

const API_BASE = "https://ayurherb-backend-7yw4.onrender.com";

export default function RegistrationForms({ role, cropOptions }: RegistrationFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    email: "",
    password: "",
    address: "",
    herb: "",
    soilType: "",
    season: "",
    quantity: "",
  });

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [registeredData, setRegisteredData] = useState<Farmer | Company | null>(null);
  const navigate = useNavigate();
  const { lines, running, start, push, stop } = useProgressLog(REGISTER_BANTER[role]);

  useEffect(() => {
    if (role !== "farmer") return;

    if (!navigator.geolocation) {
      setLocStatus("Geolocation not supported on this device — you can add crop location later.");
      return;
    }

    setLocStatus("Fetching your location...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocStatus(`📍 Location captured: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      },
      (err) => {
        console.warn("Location permission denied or unavailable:", err.message);
        setLocStatus("Couldn't get your location — you can add it later from 'My Crops'.");
      }
    );
  }, [role]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
    setFormData((prev) => ({ ...prev, contact: digitsOnly }));
  };

  const isContactValid = (contact: string) => /^[6-9]\d{9}$/.test(contact);

  const isQuantityValid = (quantity: string) =>
    quantity !== "" && !isNaN(Number(quantity)) && Number(quantity) >= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (!isContactValid(formData.contact)) {
      setMessage("❌ Enter a valid 10-digit Indian mobile number");
      return;
    }

    if (role === "farmer" && !isQuantityValid(formData.quantity)) {
      setMessage("❌ Enter a valid crop quantity (0 or more)");
      return;
    }

    setLoading(true);
    start("Sending your details to the AyurHerb server…");

    if (role === "farmer") {
      push(
        "info",
        coords
          ? "Farm location attached to your registration."
          : "No farm location attached. You can add it later from My Crops."
      );
    }

    try {
      const url =
        role === "farmer"
          ? `${API_BASE}/api/farmers/register`
          : `${API_BASE}/api/companies/register`;

      const payload =
        role === "farmer"
          ? {
              name: formData.name,
              contact: formData.contact,
              email: formData.email,
              password: formData.password,
              address: formData.address,
              herb: formData.herb,
              soilType: formData.soilType,
              season: formData.season,
              quantity: Number(formData.quantity),
              lat: coords?.lat,
              lng: coords?.lng,
            }
          : {
              name: formData.name,
              contact: formData.contact,
              email: formData.email,
              password: formData.password,
              address: formData.address,
            };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      stop();
      push("success", "Server answered.");

      if (!res.ok) {
        const error = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(error.error || "Something went wrong");
      }

      const data = await res.json();
      push("success", "Account created.");

      localStorage.setItem("token", data.token);

      if (role === "farmer") {
        localStorage.setItem("farmerToken", data.token);
        localStorage.setItem("farmer", JSON.stringify(data.farmer));
      } else {
        localStorage.setItem("companyToken", data.token);
        localStorage.setItem("company", JSON.stringify(data.company));
      }

      push("success", "Session saved on this device.");
      push("info", "Opening your dashboard…");

      setRegisteredData(data[role]);
      setFormData({
        name: "",
        contact: "",
        email: "",
        password: "",
        address: "",
        herb: "",
        soilType: "",
        season: "",
        quantity: "",
      });

      setTimeout(() => navigate(`/${role}-dashboard`), 1500);
    } catch (err: unknown) {
      stop();
      push("error", describeError(err, "Something went wrong"));
    } finally {
      setLoading(false);
    }
  };

  const contactHasError = formData.contact.length === 10 && !isContactValid(formData.contact);

  return (
    <div className="p-6 max-w-md mx-auto bg-white shadow-md rounded">
      <h2 className="text-xl font-bold mb-4">
        {role === "farmer" ? "Farmer Registration" : "Company Registration"}
      </h2>

      {role === "farmer" && locStatus && (
        <p className="text-xs text-gray-500 mb-3">{locStatus}</p>
      )}

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
          type="tel"
          name="contact"
          placeholder="Contact Number"
          value={formData.contact}
          onChange={handleContactChange}
          className={`border p-2 w-full rounded ${contactHasError ? "border-red-500" : ""}`}
          required
          inputMode="numeric"
          maxLength={10}
        />
        {contactHasError && (
          <p className="text-xs text-red-600 -mt-2">This doesn't look like a valid mobile number</p>
        )}

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
          minLength={6}
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
          <>
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

            <input
              type="text"
              name="soilType"
              placeholder="Soil Type"
              value={formData.soilType}
              onChange={handleChange}
              className="border p-2 w-full rounded"
              required
            />

            <input
              type="text"
              name="season"
              placeholder="Season"
              value={formData.season}
              onChange={handleChange}
              className="border p-2 w-full rounded"
              required
            />

            <input
              type="number"
              name="quantity"
              min="0"
              placeholder="Quantity (kg)"
              value={formData.quantity}
              onChange={handleChange}
              className="border p-2 w-full rounded"
              required
            />
          </>
        )}

        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded w-full disabled:opacity-70"
          disabled={loading}
        >
          {loading ? "Registering…" : "Register"}
        </button>
      </form>

      {message && <p className="mt-3 text-red-600">{message}</p>}

      <ProgressLog lines={lines} running={running} />

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