
import { useEffect, useState } from "react";
import { Users, Search } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import api from "../api/axios";

interface Visitor {
  _id: string;
  visitorName: string;
  phoneNumber: string;
  homeaddress: string;
  purpose: string;
  personToMeet: string;
  entryTime: string;
  exitTime?: string;
}

const Visitors: React.FC = () => {
  useTheme();

  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [filteredVisitors, setFilteredVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    visitorName: "",
    phoneNumber: "",
    homeaddress: "",
    purpose: "",
    personToMeet: "",
  });

  const fetchVisitors = async () => {
    try {

      setLoading(true);
      setError("");

      const response = await api.get("/visitors");

      setVisitors(response.data.visitors);
      setFilteredVisitors(response.data.visitors);



    } catch (err) {



      console.error(err);
      setError("Failed to load visitors"); //show error on page
    } finally { //runs wheather API succeeds or fails 
      setLoading(false);
    }
  };

  useEffect(() => { //runs after component renders 
    fetchVisitors(); //calls API
  }, []);

  useEffect(() => {
    const filtered = visitors.filter(
      (visitor) =>
        visitor.visitorName
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        visitor.phoneNumber.toString().includes(searchTerm) ||
        visitor.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visitor.homeaddress.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredVisitors(filtered);
  }, [searchTerm, visitors]);

  const stats = {
    total: visitors.length,
    inside: visitors.filter((v) => !v.exitTime).length,
    exited: visitors.filter((v) => v.exitTime).length,
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const registerVisitor = async () => {
    try {
      await api.post("/visitors", formData);

      alert("Visitor Registered Successfully");

      setShowForm(false);

      setFormData({
        visitorName: "",
        phoneNumber: "",
        homeaddress: "",
        purpose: "",
        personToMeet: "",
      });

      fetchVisitors();
    } catch (error) {
      console.error(error);
      alert("Registration Failed");
    }
  };

  const handleExit = async (id: string) => {
  try {
    await api.put(`/visitors/exit/${id}`);

    fetchVisitors();
  } catch (error) {
    console.error(error);
  }
};


  return (
    <div className="p-8 space-y-6">

      <div className="flex items-center gap-3">
        <Users className="text-blue-600" />
        <h1 className="text-3xl font-bold">Visitor Management</h1>

        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          + Register Visitor
        </button>



      </div>

      {/* Search Bar */}
      <div className="relative">





        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search visitor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg"
        />



      </div>
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">


          <h2 className="text-xl font-semibold mb-4">
            Register Visitor
          </h2>

          <div className="grid grid-cols-2 gap-4">

            <input
              name="visitorName"
              placeholder="Visitor Name"
              value={formData.visitorName}
              onChange={handleChange}
              className="border p-2 rounded"
            />

            <input
              name="phoneNumber"
              placeholder="Phone Number"
              value={formData.phoneNumber}
              onChange={handleChange}
              className="border p-2 rounded"
            />

            <input
              name="homeaddress"
              placeholder="Home Address"
              value={formData.homeaddress}
              onChange={handleChange}
              className="border p-2 rounded"
            />

            <input
              name="purpose"
              placeholder="Purpose"
              value={formData.purpose}
              onChange={handleChange}
              className="border p-2 rounded"
            />

          </div>

          <div className="mt-5 flex gap-3">

            <button
              onClick={registerVisitor}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              Register
            </button>

            <button
              onClick={() => setShowForm(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>

          </div>

        </div>
      )}




      {/* Error */}
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">

            <div className="bg-white shadow rounded-lg p-4">
              <h2 className="font-semibold">Total Visitors</h2>
              <p className="text-2xl">{stats.total}</p>
            </div>

            <div className="bg-white shadow rounded-lg p-4">
              <h2 className="font-semibold">Inside</h2>
              <p className="text-2xl">{stats.inside}</p>
            </div>

            <div className="bg-white shadow rounded-lg p-4">
              <h2 className="font-semibold">Exited</h2>
              <p className="text-2xl">{stats.exited}</p>
            </div>

          </div>

          {/* Visitor Table */}
          <div className="overflow-x-auto bg-white rounded-lg shadow">

            <table className="min-w-full border">

              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 border">Name</th>
                  <th className="p-3 border">Phone</th>
                  <th className="p-3 border">Purpose</th>
                  <th className="p-3 border">Home Address</th>
                  <th className="p-3 border">Status</th>
                  <th className="p-3 border">Action</th>
                </tr>
              </thead>

              <tbody>

                {filteredVisitors.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center p-4"
                    >
                      No visitors found
                    </td>
                  </tr>
                ) : (
                  filteredVisitors.map((visitor) => (
                    <tr key={visitor._id}>

                      <td className="border p-3">
                        {visitor.visitorName}
                      </td>

                      <td className="border p-3">
                        {visitor.phoneNumber}
                      </td>

                      <td className="border p-3">
                        {visitor.purpose}
                      </td>

                      <td className="border p-3">
                        {visitor.homeaddress}
                      </td>
                      
                        <td className="border p-3">
                                {visitor.exitTime ? (
                       <span className="text-red-600">Exited</span>
                            ) : (
                               <span className="text-green-600">Inside</span>
                               )}
                           </td>

                       <td className="border p-3">
  {!visitor.exitTime ? (
    <button
      onClick={() => handleExit(visitor._id)}
      className="bg-red-500 text-white px-3 py-1 rounded"
    >
      Mark Exit
    </button>
  ) : (
    <span className="text-gray-500">Completed</span>
  )}
</td>                        
                    </tr>
                  ))
                )}

              </tbody>

            </table>

          </div>
        </>
      )}

    </div>
  );
};

export default Visitors;