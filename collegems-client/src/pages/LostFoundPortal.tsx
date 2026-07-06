
import React, { useState } from "react";

const LostFoundPortal = () => {
  const [activeTab, setActiveTab] = useState("lost");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [preview, setPreview] = useState("");

  const lostItems = [
    {
      title: "Lost Wallet",
      category: "Accessories",
      location: "Library Block",
      date: "09 June 2026",
      contact: "nikitha@student.com",
      status: "Urgent",
      reward: "₹500 Reward",
      match: "96%",
    },
    {
      title: "Missing ID Card",
      category: "Documents",
      location: "Cafeteria",
      date: "08 June 2026",
      contact: "studenthelp@college.com",
      status: "Pending",
      reward: "No Reward",
      match: "88%",
    },
  ];

  const foundItems = [
    {
      title: "Found Earbuds",
      category: "Electronics",
      location: "Seminar Hall",
      date: "07 June 2026",
      contact: "admin@college.com",
      status: "Found",
      reward: "Ready to Claim",
      match: "91%",
    },
    {
      title: "Water Bottle",
      category: "Accessories",
      location: "Parking Area",
      date: "06 June 2026",
      contact: "support@college.com",
      status: "Collected",
      reward: "Collected",
      match: "83%",
    },
  ];

  const currentItems =
    activeTab === "lost" ? lostItems : foundItems;

  const filteredItems = currentItems.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className={`min-h-screen transition-all duration-500 p-6 ${
        darkMode
          ? "bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white"
          : "bg-gradient-to-br from-slate-100 to-indigo-100"
      }`}
    >
      <div className="max-w-7xl mx-auto">

        {/* HERO */}
        <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 rounded-[40px] p-10 shadow-2xl text-white relative overflow-hidden mb-10">

          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>

          <div className="absolute bottom-0 left-0 w-80 h-80 bg-pink-300/10 rounded-full blur-3xl"></div>

          <h1 className="text-6xl font-black mb-5 animate-pulse">
            Lost & Found Portal
          </h1>

          <p className="text-xl max-w-3xl text-indigo-100 leading-relaxed">
            A next-generation AI-powered smart campus solution helping students
            recover lost belongings through centralized reporting, AI search,
            and instant claim verification.
          </p>

          {/* DARK MODE */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="mt-6 bg-white/20 backdrop-blur-lg px-6 py-3 rounded-2xl border border-white/20 hover:scale-105 transition-all duration-300"
          >
            {darkMode ? "☀ Light Mode" : "🌙 Dark Mode"}
          </button>

          {/* STATS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-12">

            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 hover:scale-105 transition-all duration-300">
              <h2 className="text-5xl font-black">25+</h2>
              <p className="mt-2">Recovered Items</p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 hover:scale-105 transition-all duration-300">
              <h2 className="text-5xl font-black">120+</h2>
              <p className="mt-2">Reports Submitted</p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 hover:scale-105 transition-all duration-300">
              <h2 className="text-5xl font-black">98%</h2>
              <p className="mt-2">Success Rate</p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 hover:scale-105 transition-all duration-300">
              <h2 className="text-5xl font-black">24/7</h2>
              <p className="mt-2">Campus Support</p>
            </div>
          </div>
        </div>

        {/* RECENT ACTIVITY */}
        <div
          className={`rounded-3xl p-6 shadow-xl mb-8 ${
            darkMode ? "bg-gray-900" : "bg-white"
          }`}
        >
          <h2 className="text-3xl font-bold mb-5">
            Recent Campus Activity
          </h2>

          <div className="space-y-4">

            <div className="flex justify-between border-b pb-3">
              <p>🎧 Earbuds successfully recovered</p>
              <span className="text-green-500 font-semibold">
                Completed
              </span>
            </div>

            <div className="flex justify-between border-b pb-3">
              <p>🪪 New ID Card reported missing</p>
              <span className="text-yellow-500 font-semibold">
                Pending
              </span>
            </div>

            <div className="flex justify-between">
              <p>📱 Mobile phone matched with owner</p>
              <span className="text-indigo-500 font-semibold">
                AI Matched
              </span>
            </div>
          </div>
        </div>

        {/* FILTERS */}
        <div className="flex flex-col md:flex-row justify-between gap-5 mb-8">

          <div className="flex gap-4">

            <button
              onClick={() => setActiveTab("lost")}
              className={`px-8 py-4 rounded-2xl font-bold transition-all duration-300 ${
                activeTab === "lost"
                  ? "bg-red-500 text-white shadow-xl scale-105"
                  : "bg-white text-gray-700"
              }`}
            >
              Lost Items
            </button>

            <button
              onClick={() => setActiveTab("found")}
              className={`px-8 py-4 rounded-2xl font-bold transition-all duration-300 ${
                activeTab === "found"
                  ? "bg-green-500 text-white shadow-xl scale-105"
                  : "bg-white text-gray-700"
              }`}
            >
              Found Items
            </button>
          </div>

          <input
            type="text"
            placeholder="🔍 Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-6 py-4 rounded-2xl shadow-xl outline-none w-full md:w-96 text-lg text-black"
          />
        </div>

        {/* REPORT BUTTON */}
        <div className="mb-10">
          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 text-lg font-semibold"
          >
            + Report New Item
          </button>
        </div>

        {/* ITEMS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {filteredItems.map((item, index) => (
            <div
              key={index}
              className={`rounded-[35px] p-8 shadow-2xl hover:-translate-y-2 transition-all duration-300 ${
                darkMode ? "bg-gray-900" : "bg-white"
              }`}
            >

              <div className="flex justify-between items-start">

                <div>
                  <h2 className="text-4xl font-black">
                    {item.title}
                  </h2>

                  <div className="flex gap-3 mt-4 flex-wrap">

                    <span className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-semibold">
                      {item.category}
                    </span>

                    <span className="bg-pink-100 text-pink-700 px-4 py-2 rounded-full text-sm font-semibold">
                      {item.reward}
                    </span>

                    <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold">
                      AI Match: {item.match}
                    </span>
                  </div>
                </div>

                <span
                  className={`px-5 py-2 rounded-full text-sm font-bold ${
                    item.status === "Urgent"
                      ? "bg-red-100 text-red-600"
                      : item.status === "Found"
                      ? "bg-green-100 text-green-600"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {item.status}
                </span>
              </div>

              <div className="mt-8 space-y-4 text-lg">

                <p>📍 Location: {item.location}</p>

                <p>📅 Date: {item.date}</p>

                <p>📧 Contact: {item.contact}</p>
              </div>

              <div className="flex gap-4 mt-8 flex-wrap">

                <button
                  onClick={() => setShowClaimModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105"
                >
                  Claim Item
                </button>

                <button className="bg-gray-100 hover:bg-gray-200 text-black px-6 py-3 rounded-xl transition-all duration-300">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* REPORT MODAL */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">

            <div className="bg-white rounded-[35px] p-8 w-full max-w-2xl shadow-2xl relative">

              <button
                onClick={() => setShowModal(false)}
                className="absolute top-5 right-5 text-3xl"
              >
                ✕
              </button>

              <h2 className="text-5xl font-black text-indigo-700 mb-8">
                Report Item
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                <input
                  type="text"
                  placeholder="Item Name"
                  className="p-4 rounded-2xl border outline-none"
                />

                <select className="p-4 rounded-2xl border outline-none">
                  <option>Select Category</option>
                  <option>Electronics</option>
                  <option>Documents</option>
                  <option>Accessories</option>
                </select>

                <input
                  type="text"
                  placeholder="Location"
                  className="p-4 rounded-2xl border outline-none"
                />

                <input
                  type="date"
                  className="p-4 rounded-2xl border outline-none"
                />

                <textarea
                  rows={4}
                  placeholder="Describe item..."
                  className="p-4 rounded-2xl border outline-none md:col-span-2"
                ></textarea>

                <input
                  type="file"
                  className="md:col-span-2"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPreview(URL.createObjectURL(file));
                    }
                  }}
                />

                {preview && (
                  <img
                    src={preview}
                    alt="preview"
                    className="w-40 h-40 object-cover rounded-2xl shadow-lg"
                  />
                )}
              </div>

              <button className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-all duration-300">
                Submit Report
              </button>
            </div>
          </div>
        )}

        {/* CLAIM MODAL */}
        {showClaimModal && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">

            <div className="bg-white rounded-[35px] p-8 w-full max-w-xl shadow-2xl relative">

              <button
                onClick={() => setShowClaimModal(false)}
                className="absolute top-5 right-5 text-3xl"
              >
                ✕
              </button>

              <h2 className="text-4xl font-black text-indigo-700 mb-8">
                Claim Item
              </h2>

              <div className="space-y-5">

                <input
                  type="text"
                  placeholder="Your Name"
                  className="w-full p-4 rounded-2xl border outline-none"
                />

                <input
                  type="text"
                  placeholder="Phone Number"
                  className="w-full p-4 rounded-2xl border outline-none"
                />

                <textarea
                  rows={4}
                  placeholder="Why do you think this item belongs to you?"
                  className="w-full p-4 rounded-2xl border outline-none"
                ></textarea>
              </div>

              <button className="mt-8 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-all duration-300">
                Submit Claim
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LostFoundPortal;

