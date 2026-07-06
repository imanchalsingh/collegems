import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import api from '../../api/axios';
import { extractArray } from '../../utils/apiHelpers';

interface AssignmentState {
  teacherAssignments: any[];
  studentAssignments: any[];
  loadingTeacher: boolean;
  loadingStudent: boolean;
  loadingAction: boolean; // For create, submit, evaluate actions
  error: string | null;
}

const initialState: AssignmentState = {
  teacherAssignments: [],
  studentAssignments: [],
  loadingTeacher: false,
  loadingStudent: false,
  loadingAction: false,
  error: null,
};

export const fetchTeacherAssignments = createAsyncThunk(
  'assignments/fetchTeacher',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/assignment/teacher');
      return Array.isArray(response.data) ? response.data : extractArray(response.data);
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || 'Failed to fetch teacher assignments');
    }
  }
);

export const fetchStudentAssignments = createAsyncThunk(
  'assignments/fetchStudent',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/assignment/student');
      return extractArray(response.data);
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || 'Failed to fetch student assignments');
    }
  }
);

export const createAssignment = createAsyncThunk(
  'assignments/create',
  async (assignmentData: any, { rejectWithValue }) => {
    try {
      const response = await api.post('/assignment/create', assignmentData);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || 'Failed to create assignment');
    }
  }
);

export const submitAssignment = createAsyncThunk(
  'assignments/submit',
  async ({ assignmentId, formData }: { assignmentId: string; formData: FormData }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/assignment/submit/${assignmentId}`, formData);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || 'Failed to submit assignment');
    }
  }
);

export const evaluateAssignment = createAsyncThunk(
  'assignments/evaluate',
  async ({ assignmentId, studentId, marks }: { assignmentId: string; studentId: string; marks: number }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/assignment/evaluate/${assignmentId}`, { studentId, marks });
      return { assignmentId, studentId, marks, data: response.data };
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || 'Failed to evaluate assignment');
    }
  }
);

const assignmentSlice = createSlice({
  name: 'assignments',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Teacher Assignments
      .addCase(fetchTeacherAssignments.pending, (state) => {
        state.loadingTeacher = true;
        state.error = null;
      })
      .addCase(fetchTeacherAssignments.fulfilled, (state, action) => {
        state.loadingTeacher = false;
        state.teacherAssignments = action.payload;
      })
      .addCase(fetchTeacherAssignments.rejected, (state, action) => {
        state.loadingTeacher = false;
        state.error = action.payload as string;
      })
      
      // Fetch Student Assignments
      .addCase(fetchStudentAssignments.pending, (state) => {
        state.loadingStudent = true;
        state.error = null;
      })
      .addCase(fetchStudentAssignments.fulfilled, (state, action) => {
        state.loadingStudent = false;
        state.studentAssignments = action.payload;
      })
      .addCase(fetchStudentAssignments.rejected, (state, action) => {
        state.loadingStudent = false;
        state.error = action.payload as string;
      })

      // Create Assignment
      .addCase(createAssignment.pending, (state) => {
        state.loadingAction = true;
        state.error = null;
      })
      .addCase(createAssignment.fulfilled, (state, action) => {
        state.loadingAction = false;
        state.teacherAssignments.unshift(action.payload); // Add new assignment at the beginning
      })
      .addCase(createAssignment.rejected, (state, action) => {
        state.loadingAction = false;
        state.error = action.payload as string;
      })

      // Submit Assignment (Student)
      .addCase(submitAssignment.pending, (state) => {
        state.loadingAction = true;
        state.error = null;
      })
      .addCase(submitAssignment.fulfilled, (state) => {
        state.loadingAction = false;
        // The fetchStudentAssignments is usually called again to refresh, 
        // but we can also update the local state if needed.
      })
      .addCase(submitAssignment.rejected, (state, action) => {
        state.loadingAction = false;
        state.error = action.payload as string;
      })

      // Evaluate Assignment (Teacher)
      .addCase(evaluateAssignment.pending, (state) => {
        // Not setting loadingAction here to avoid global loading spinners blocking UI
        state.error = null;
      })
      .addCase(evaluateAssignment.fulfilled, (state, action) => {
        const { assignmentId, studentId, marks } = action.payload;
        // Update teacher assignment state
        const assignment = state.teacherAssignments.find(a => a._id === assignmentId);
        if (assignment && assignment.submissions) {
          const submission = assignment.submissions.find((s: any) => s.student?._id === studentId);
          if (submission) {
            submission.status = 'graded';
            submission.marks = marks;
          }
        }
      })
      .addCase(evaluateAssignment.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = assignmentSlice.actions;

export default assignmentSlice.reducer;
