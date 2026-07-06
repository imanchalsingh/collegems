import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const token = jwt.sign({ id: 'dummy', role: 'teacher' }, process.env.JWT_SECRET, { expiresIn: '1h' });

async function test() {
  try {
    const res = await fetch('http://localhost:5000/api/assessments/config/666666666666666666666666', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        components: [
          { name: "Midterm", weightage: 50, maxMarks: 50 },
          { name: "Final", weightage: 50, maxMarks: 100 }
        ]
      })
    });
    const data = await res.json();
    console.log(res.status, data);
  } catch (err) {
    console.error(err);
  }
}

test();
