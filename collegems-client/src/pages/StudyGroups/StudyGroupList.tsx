import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { getStudyGroups, createStudyGroup, joinStudyGroup } from "../../api/studyGroup.api";
import { Users, Plus, Loader2 } from "lucide-react";

export default function StudyGroupList() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const navigate = useNavigate();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const data = await getStudyGroups();
      setGroups(data);
    } catch (error) {
      console.error("Error fetching study groups", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newGroup = await createStudyGroup(formData);
      setGroups([newGroup, ...groups]);
      setShowCreateForm(false);
      setFormData({ name: "", description: "" });
    } catch (error) {
      console.error("Error creating group", error);
    }
  };

  const handleJoin = async (groupId: string) => {
    try {
      await joinStudyGroup(groupId);
      navigate(`/study-groups/${groupId}`);
    } catch (error) {
      console.error("Error joining group", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="text-blue-500" /> Study Groups
          </h1>
          <p className="text-gray-500 mt-1">Collaborate in real-time with your peers.</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
        >
          <Plus size={20} /> Create Group
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreate} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Create New Study Group</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Group Name</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Save Group
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <div key={group._id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-bold text-gray-800 mb-2">{group.name}</h3>
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {group.description || "No description provided."}
            </p>
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-50">
              <span className="text-xs text-gray-500">
                {group.members?.length || 1} Member(s)
              </span>
              <button
                onClick={() => handleJoin(group._id)}
                className="text-blue-600 font-medium hover:text-blue-800"
              >
                Join Room &rarr;
              </button>
            </div>
          </div>
        ))}
        {groups.length === 0 && !showCreateForm && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No study groups found. Be the first to create one!
          </div>
        )}
      </div>
    </div>
  );
}
