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
  const navigate = useNavigate();

  // ✅ handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      const data = await res.json();

      // ✅ Save farmer data so Dashboard can access it
      localStorage.setItem("farmer", JSON.stringify(data));

      setMessage("✅ Registration successful!");
      setFormData({ name: "", contact: "", address: "", herb: "" });

      // ✅ redirect after 1 sec so user sees success message
      setTimeout(() => navigate("/farmer-dashboard"), 1000);
    } catch (err: any) {
      setMessage("❌ " + err.message);
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

        {/* ✅ Dropdown for herbs */}
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
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Register
        </button>
      </form>
      {message && <p className="mt-3 text-red-600">{message}</p>}
    </div>
  );
}
