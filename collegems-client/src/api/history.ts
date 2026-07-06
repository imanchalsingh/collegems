import axiosInstance from "./axios";

export const getRecentHistory = async () => {
  const response = await axiosInstance.get("/history");
  return response.data;
};

export const addRecentHistory = async (data: { entityType: string; entityId: string; displayName: string; url: string }) => {
  const response = await axiosInstance.post("/history", data);
  return response.data;
};
