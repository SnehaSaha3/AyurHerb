import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function RegistrationForm() {
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    address: "",
    herb: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [registeredFarmer, setRegisteredFarmer] = useState<any>(null);
  const navigate = useNavigate();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/farmers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Something went wrong");
      }

      const data = await res.json(); // ✅ contains { message, farmer, token }

      // ✅ Save farmer & token separately
      localStorage.setItem("token", data.token);
      localStorage.setItem("farmer", JSON.stringify(data.farmer));

      setMessage("✅ Registration successful!");
      setRegisteredFarmer(data.farmer); // ✅ correct object
      setFormData({ name: "", contact: "", address: "", herb: "" });

      setTimeout(() => navigate("/farmer-dashboard"), 1500);
    } catch (err: any) {
      setMessage("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white shadow-md rounded">
      <h2 className="text-xl font-bold mb-4">Farmer Registration</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          name="name"
          placeholder="Farmer Name"
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
          name="address"
          placeholder="Address"
          value={formData.address}
          onChange={handleChange}
          className="border p-2 w-full rounded"
          required
        />

        <select
          name="herb"
          value={formData.herb}
          onChange={handleChange}
          className="border p-2 w-full rounded"
          required
        >
          <option value="">-- Select Herb --</option>
          <option value="Tulsi">Tulsi</option>
          <option value="Ashwagandha">Ashwagandha</option>
          <option value="Neem">Neem</option>
          <option value="Brahmi">Brahmi</option>
          <option value="Aloe Vera">Aloe Vera</option>
        </select>

        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded w-full"
          disabled={loading}
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </form>

      {message && <p className="mt-3 text-red-600">{message}</p>}

      {registeredFarmer && (
        <div className="mt-4 p-3 border rounded bg-gray-100">
          <h3 className="font-semibold">👩‍🌾 Registered Farmer Details:</h3>
          <p><strong>Name:</strong> {registeredFarmer.name}</p>
          <p><strong>Contact:</strong> {registeredFarmer.contact}</p>
          <p><strong>Address:</strong> {registeredFarmer.address}</p>
          <p><strong>Herb:</strong> {registeredFarmer.herb}</p>
        </div>
      )}
    </div>
  );
}
