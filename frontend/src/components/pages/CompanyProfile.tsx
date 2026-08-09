import { useEffect, useState } from "react";
import axios from "axios";

interface Company {
  _id: string;
  name: string;
  email: string;
  contact?: string;
  address?: string;
  walletAddress?: string;
}

export default function CompanyProfile() {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("companyToken");
      if (!token) {
        setStatus("Please log in first.");
        return;
      }

      const res = await axios.get("http://localhost:8000/api/companies/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCompany(res.data.company);
    } catch (err) {
      console.error("Error fetching company profile:", err);
      setStatus("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      setStatus("Please install MetaMask to connect a wallet.");
      return;
    }

    setConnecting(true);
    setStatus("");

    try {
      const accounts: string[] = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const address = accounts[0];

      const token = localStorage.getItem("token");
      if (!token) {
        setStatus("Please log in first.");
        return;
      }

      const res = await axios.post(
        "http://localhost:8000/api/companies/connect-wallet",
        { walletAddress: address },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCompany(res.data.company);
      localStorage.setItem("company", JSON.stringify(res.data.company));
      setStatus("✅ Wallet connected successfully.");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setStatus("❌ " + (err.response?.data?.error || "Failed to connect wallet"));
      } else {
        setStatus("❌ Unexpected error connecting wallet");
      }
      console.error(err);
    } finally {
      setConnecting(false);
    }
  };

  if (loading) return <p className="p-6">Loading profile...</p>;
  if (!company) return <p className="p-6 text-red-500">{status || "Profile not found"}</p>;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-800">Company Profile</h2>
        <p className="text-sm text-gray-500">Manage your account and wallet</p>
      </div>

      <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-3 text-sm">
        <p><span className="text-gray-500">Name:</span> <span className="font-medium">{company.name}</span></p>
        <p><span className="text-gray-500">Email:</span> {company.email}</p>
        <p><span className="text-gray-500">Contact:</span> {company.contact || "—"}</p>
        <p><span className="text-gray-500">Address:</span> {company.address || "—"}</p>
      </div>

      <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-3">
        <h3 className="font-medium text-gray-700">Wallet</h3>

        {company.walletAddress ? (
          <p className="text-sm text-green-700 break-all">
            ✅ Connected: {company.walletAddress}
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-500">
              Connect a wallet to place orders and fund escrow.
            </p>
            <button
              onClick={connectWallet}
              disabled={connecting}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition disabled:opacity-50"
            >
              {connecting ? "Connecting..." : "Connect MetaMask"}
            </button>
          </>
        )}

        {status && <p className="text-xs text-gray-500">{status}</p>}
      </div>
    </div>
  );
}