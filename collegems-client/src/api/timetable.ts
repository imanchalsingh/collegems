import axiosInstance from "./axios";

export const getRooms = async () => {
  const response = await axiosInstance.get("/timetable/rooms");
  return response.data;
};

export const getTimeSlots = async () => {
  const response = await axiosInstance.get("/timetable/timeslots");
  return response.data;
};

export const getRules = async () => {
  const response = await axiosInstance.get("/timetable/rules");
  return response.data;
};

export const generateTimetable = async (data: { name: string; department?: string; semester?: number }) => {
  const response = await axiosInstance.post("/timetable/generate", data);
  return response.data;
};

export const getTimetables = async () => {
  const response = await axiosInstance.get("/timetable");
  return response.data;
};

export const getTimetableStatus = async (id: string) => {
  const response = await axiosInstance.get(`/timetable/${id}`);
  return response.data;
};

export const getTimetableEntries = async (id: string) => {
  const response = await axiosInstance.get(`/timetable/${id}/entries`);
  return response.data;
};

export const updateTimetableEntry = async (entryId: string, data: { room?: string; timeSlot?: string; faculty?: string; course?: string }) => {
  try {
    const response = await axiosInstance.put(`/timetable/entries/${entryId}`, data);
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 409) {
      // Return the specific conflict payload so the UI can display it
      return error.response.data;
    }
    throw error;
  }
};

export const getTimetableSuggestions = async (params?: { department?: string; semester?: number; timetableId?: string }) => {
  const response = await axiosInstance.get("/timetable/suggestions", { params });
  return response.data;
};
