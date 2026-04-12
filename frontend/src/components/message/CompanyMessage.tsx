import { useState } from "react";
import { Send, Search } from "lucide-react";

export default function CompanyMessages() {
  const [selected, setSelected] = useState("Ravi Kumar");

  const farmers = ["Ravi Kumar", "Anita Das", "Suresh Yadav"];

  return (
    <div className="flex h-[calc(100vh-80px)] bg-white rounded-2xl overflow-hidden border">

      {/* LEFT: Conversations */}
      <div className="w-1/4 border-r bg-gray-50 flex flex-col">

        {/* Search */}
        <div className="p-3 border-b">
          <div className="flex items-center bg-white px-2 py-2 rounded-lg border">
            <Search size={16} className="text-gray-400" />
            <input
              placeholder="Search farmers..."
              className="ml-2 text-sm outline-none w-full"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {farmers.map((f, i) => (
            <div
              key={i}
              onClick={() => setSelected(f)}
              className={`p-3 cursor-pointer border-b hover:bg-gray-100 ${
                selected === f ? "bg-green-100" : ""
              }`}
            >
              <p className="font-medium text-sm">{f}</p>
              <p className="text-xs text-gray-500 truncate">
                Last message preview...
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CENTER: Chat */}
      <div className="flex-1 flex flex-col">

        {/* Header */}
        <div className="p-4 border-b font-medium">
          {selected}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">

          {/* Incoming */}
          <div className="flex">
            <div className="bg-white px-3 py-2 rounded-xl text-sm shadow">
              Hello, I have Tulsi available 🌱
            </div>
          </div>

          {/* Outgoing */}
          <div className="flex justify-end">
            <div className="bg-green-500 text-white px-3 py-2 rounded-xl text-sm">
              Great, I need 50 units
            </div>
          </div>

        </div>

        {/* Input */}
        <div className="p-3 border-t flex items-center gap-2">
          <input
            placeholder="Type a message..."
            className="flex-1 border rounded-xl px-3 py-2 text-sm outline-none"
          />
          <button className="bg-green-600 text-white p-2 rounded-xl">
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* RIGHT: Farmer Info */}
      <div className="w-1/4 border-l bg-gray-50 p-4 hidden lg:block">

        <h3 className="font-semibold mb-4">Farmer Details</h3>

        <div className="space-y-3 text-sm">
          <p><span className="text-gray-500">Name:</span> {selected}</p>
          <p><span className="text-gray-500">Location:</span> Assam</p>
          <p><span className="text-gray-500">Crops:</span> Tulsi, Aloe Vera</p>
          <p><span className="text-gray-500">Wallet:</span> 0xA...23</p>
        </div>

        <button className="mt-6 w-full bg-green-600 text-white py-2 rounded-xl">
          Place Order
        </button>
      </div>
    </div>
  );
}