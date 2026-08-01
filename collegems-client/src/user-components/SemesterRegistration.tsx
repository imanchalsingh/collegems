import React, { useState } from 'react';
import { getAcademicLabel } from "../utils/academicLabels";
import { useAcademicLabels } from "../hooks/useAcademicLabels";

export const SemesterRegistration: React.FC = () => {
  const { data: academicLabels } = useAcademicLabels();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [status, setStatus] = useState<string>("Not Submitted");
  const [formData, setFormData] = useState({
    studentName: '',
    rollNumber: '',
    currentSemester: '',
    nextSemester: '',
    electiveCourses: [] as string[]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Pending");
    alert(`${getAcademicLabel("semester", academicLabels)} Registration Form Submitted Successfully!`);
    setCurrentStep(3);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>🎓 {getAcademicLabel("semester", academicLabels)} Registration Portal</h2>
      <div style={{
        padding: '15px', marginBottom: '20px', borderRadius: '5px',
        backgroundColor: status === 'Pending' ? '#fff3cd' : status === 'Approved' ? '#d4edda' : '#f8d7da',
        color: status === 'Pending' ? '#856404' : status === 'Approved' ? '#155724' : '#721c24'
      }}>
        <strong>Current Status:</strong> {status}
      </div>
      {currentStep === 1 && (
        <div>
          <h3>Step 1: Verify Academic Info</h3>
          <div style={{margin:'10px 0'}}>
            <label htmlFor="sr-student-name" style={{display:'block', marginBottom:'4px', fontWeight:'600'}}>Full Name</label>
            <input id="sr-student-name" type="text" placeholder="Full Name" style={{display:'block', width:'100%', padding:'8px', borderRadius:'4px', border:'1px solid #ccc'}} value={formData.studentName} onChange={(e)=>setFormData({...formData, studentName: e.target.value})} />
          </div>
          <div style={{margin:'10px 0'}}>
            <label htmlFor="sr-roll-number" style={{display:'block', marginBottom:'4px', fontWeight:'600'}}>Roll Number</label>
            <input id="sr-roll-number" type="text" placeholder="Roll Number" style={{display:'block', width:'100%', padding:'8px', borderRadius:'4px', border:'1px solid #ccc'}} value={formData.rollNumber} onChange={(e)=>setFormData({...formData, rollNumber: e.target.value})} />
          </div>
          <button onClick={() => setCurrentStep(2)} style={{padding:'10px 20px', backgroundColor:'#007bff', color:'#fff', border:'none', borderRadius:'4px', cursor:'pointer'}}>Next Step</button>
        </div>
      )}
      {currentStep === 2 && (
        <div>
          <h3>Step 2: Select Upcoming {getAcademicLabel("semester", academicLabels)} &amp; Electives</h3>
          <div style={{margin:'10px 0'}}>
            <label htmlFor="sr-next-semester" style={{display:'block', marginBottom:'4px', fontWeight:'600'}}>Next {getAcademicLabel("semester", academicLabels)}</label>
            <select id="sr-next-semester" style={{display:'block', width:'100%', padding:'8px', borderRadius:'4px', border:'1px solid #ccc'}} value={formData.nextSemester} onChange={(e)=>setFormData({...formData, nextSemester: e.target.value})}>
              <option value="">-- Select Next {getAcademicLabel("semester", academicLabels)} --</option>
              <option value="Semester 3">{getAcademicLabel("semester", academicLabels)} 3</option>
              <option value="Semester 5">{getAcademicLabel("semester", academicLabels)} 5</option>
              <option value="Semester 7">{getAcademicLabel("semester", academicLabels)} 7</option>
            </select>
          </div>
          <form onSubmit={handleSubmit}>
            <button type="submit" style={{padding:'10px 20px', backgroundColor:'#28a745', color:'#fff', border:'none', borderRadius:'4px', cursor:'pointer'}}>Submit Application</button>
          </form>
        </div>
      )}
      {currentStep === 3 && (
        <div>
          <h3>✅ Application Tracking</h3>
          <p style={{marginTop:'10px'}}>Your registration has been sent to the Admin/HOD panel for approval. Please keep checking this page for real-time status updates.</p>
        </div>
      )}
    </div>
  );
};

export default SemesterRegistration;
