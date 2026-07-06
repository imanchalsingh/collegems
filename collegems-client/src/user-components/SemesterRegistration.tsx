import React, { useState } from 'react';

export const SemesterRegistration: React.FC = () => {
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
    alert("Semester Registration Form Submitted Successfully!");
    setCurrentStep(3);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>🎓 Semester Registration Portal</h2>
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
          <input type="text" placeholder="Full Name" style={{display:'block', width:'100%', padding:'8px', margin:'10px 0', borderRadius:'4px', border:'1px solid #ccc'}} value={formData.studentName} onChange={(e)=>setFormData({...formData, studentName: e.target.value})} />
          <input type="text" placeholder="Roll Number" style={{display:'block', width:'100%', padding:'8px', margin:'10px 0', borderRadius:'4px', border:'1px solid #ccc'}} value={formData.rollNumber} onChange={(e)=>setFormData({...formData, rollNumber: e.target.value})} />
          <button onClick={() => setCurrentStep(2)} style={{padding:'10px 20px', backgroundColor:'#007bff', color:'#fff', border:'none', borderRadius:'4px', cursor:'pointer'}}>Next Step</button>
        </div>
      )}
      {currentStep === 2 && (
        <div>
          <h3>Step 2: Select Upcoming Semester & Electives</h3>
          <select style={{display:'block', width:'100%', padding:'8px', margin:'10px 0', borderRadius:'4px', border:'1px solid #ccc'}} value={formData.nextSemester} onChange={(e)=>setFormData({...formData, nextSemester: e.target.value})}>
            <option value="">-- Select Next Semester --</option>
            <option value="Semester 3">Semester 3</option>
            <option value="Semester 5">Semester 5</option>
            <option value="Semester 7">Semester 7</option>
          </select>
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
