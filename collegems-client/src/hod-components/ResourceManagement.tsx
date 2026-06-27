import React, { useState, useEffect } from "react";
import axios from "axios";
import { PlusCircle, Trash2 } from "lucide-react";

interface Resource {
  _id: string;
  name: string;
  type: string;
  capacity: number;
  location: string;
  features: string[];
  status: string;
}

const ResourceManagement: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState("classroom");
  const [capacity, setCapacity] = useState("");
  const [location, setLocation] = useState("");
  const [features, setFeatures] = useState("");
  const [status, setStatus] = useState("active");

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const { data } = await axios.get("http://localhost:5000/api/resources", {
        withCredentials: true,
      });
      setResources(data);
    } catch (error) {
      console.error("Error fetching resources:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(
        "http://localhost:5000/api/resources",
        {
          name,
          type,
          capacity: Number(capacity),
          location,
          features: features.split(",").map(f => f.trim()).filter(Boolean),
          status,
        },
        { withCredentials: true }
      );
      setShowModal(false);
      resetForm();
      fetchResources();
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to create resource");
    }
  };

  const deleteResource = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this resource?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/resources/${id}`, { withCredentials: true });
      fetchResources();
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to delete resource");
    }
  };

  const resetForm = () => {
    setName("");
    setType("classroom");
    setCapacity("");
    setLocation("");
    setFeatures("");
    setStatus("active");
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Resource Management</h1>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" /> Add Resource
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((res) => (
            <div key={res._id} className="bg-white rounded-lg shadow border border-gray-100 p-5 relative group">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => deleteResource(res._id)} className="text-red-500 hover:text-red-700 p-1 bg-red-50 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-bold text-gray-900">{res.name}</h2>
                <span className={`px-2 py-0.5 text-xs rounded-full ${res.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {res.status}
                </span>
              </div>
              <div className="text-sm text-gray-500 uppercase tracking-wider mb-4 font-semibold">
                {res.type.replace('_', ' ')}
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-gray-500">Capacity:</span>
                  <span>{res.capacity > 0 ? res.capacity : 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-gray-500">Location:</span>
                  <span>{res.location || 'N/A'}</span>
                </div>
                {res.features?.length > 0 && (
                  <div className="pt-2">
                    <span className="text-gray-500 block mb-1">Features:</span>
                    <div className="flex flex-wrap gap-1">
                      {res.features.map((f, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded border">{f}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {resources.length === 0 && (
            <div className="col-span-full text-center py-10 text-gray-500">
              No resources found. Click "Add Resource" to create one.
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Add New Resource</h2>
            <form onSubmit={handleCreateResource} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 rounded focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. Lab 1, Projector A" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={type} onChange={e => setType(e.target.value)} className="w-full border p-2 rounded focus:ring-blue-500 focus:border-blue-500">
                  <option value="classroom">Classroom</option>
                  <option value="lab">Lab</option>
                  <option value="seminar_hall">Seminar Hall</option>
                  <option value="projector">Projector</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                  <input type="number" min="0" value={capacity} onChange={e => setCapacity(e.target.value)} className="w-full border p-2 rounded focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. 60" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="w-full border p-2 rounded focus:ring-blue-500 focus:border-blue-500">
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location / Room Number</label>
                <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full border p-2 rounded focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. Building A, Floor 2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Features (comma separated)</label>
                <input type="text" value={features} onChange={e => setFeatures(e.target.value)} className="w-full border p-2 rounded focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. AC, Whiteboard, Smart TV" />
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Resource</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceManagement;
