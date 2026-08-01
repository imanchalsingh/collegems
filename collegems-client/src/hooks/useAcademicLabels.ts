import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { DEFAULT_ACADEMIC_LABELS } from "../constants/academicLabels";

const fetchAcademicLabels = async () => {
    const token = localStorage.getItem("token");

    const { data } = await axios.get("/api/settings", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    return {
        ...DEFAULT_ACADEMIC_LABELS,
        ...(data.data?.academicLabels || {}),
    };
};

export const useAcademicLabels = () => {
    return useQuery({
        queryKey: ["academic-labels"],
        queryFn: fetchAcademicLabels,
        staleTime: Infinity,
    });
};