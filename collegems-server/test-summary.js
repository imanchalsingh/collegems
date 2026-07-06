async function test() {
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'hod@college.edu', password: 'password123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token || loginData.accessToken;
  
  const studentsRes = await fetch('http://localhost:5000/api/users/students', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const studentsData = await studentsRes.json();
  const studentId = studentsData.data[0]._id;
  console.log('Fetching summary for:', studentId);
  
  const summaryRes = await fetch(`http://localhost:5000/api/users/students/${studentId}/summary`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Status:', summaryRes.status);
  const summaryData = await summaryRes.text();
  console.log('Summary:', summaryData);
}
test();
