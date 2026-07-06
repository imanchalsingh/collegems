import api from "./axios";

export const getStudyGroups = async () => {
  const response = await api.get("/study-groups");
  return response.data;
};

export const createStudyGroup = async (data: { name: string; description: string }) => {
  const response = await api.post("/study-groups", data);
  return response.data;
};

export const joinStudyGroup = async (groupId: string) => {
  const response = await api.post(`/study-groups/${groupId}/join`);
  return response.data;
};

export const getChatHistory = async (groupId: string) => {
  const response = await api.get(`/study-groups/${groupId}/messages`);
  return response.data;
};
