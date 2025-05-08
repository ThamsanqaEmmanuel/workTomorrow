const express = require('express');
const cors = require('cors'); 
const mysql = require('mysql2');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path'); 
const app = express();
const MySQLStore = require('express-mysql-session')(session);



app.get('/session-info', (req, res) => {
  res.json({ session: req.session });
});

app.use(express.json());
app.use(cors()); 




dotenv.config();

// Database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
  } else {
    console.log("Connected to MySQL Database");
    createTables();
  }
});

// Session setup
app.use(session({
    secret: process.env.SESSION_SECRET, 
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } 
}));


const createTables = () => {
  const createPatientsTable = `
    CREATE TABLE IF NOT EXISTS Patients (
      patient_id INT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      phone VARCHAR(20),
      date_of_birth DATE,
      gender ENUM('male', 'female', 'other'),
      address TEXT
    );
  `;

  const createDoctorsTable = `
    CREATE TABLE IF NOT EXISTS Doctors (
      doctor_id INT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      specialization VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(20),
      schedule TEXT,
      password_hash VARCHAR(255) NOT NULL
    );
  `;

  const createAppointmentsTable = `
    CREATE TABLE IF NOT EXISTS Appointments (
      appointment_id INT AUTO_INCREMENT PRIMARY KEY,
      patient_id INT,
      doctor_id INT,
      appointment_date DATE,
      appointment_time TIME,
      status ENUM('pending', 'completed', 'canceled'),
      FOREIGN KEY (patient_id) REFERENCES Patients(patient_id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES Doctors(doctor_id) ON DELETE CASCADE
    );
  `;

  const createAdminTable = `
    CREATE TABLE IF NOT EXISTS Admin (
      Admin_id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin', 'superadmin')
    );
  `;

  // Execute each query
  db.query(createPatientsTable, (err) => {
    if (err) console.error("Error creating Patients table:", err);
    else console.log("Patients table created or already exists.");
  });

  db.query(createDoctorsTable, (err) => {
    if (err) console.error("Error creating Doctors table:", err);
    else console.log("Doctors table created or already exists.");
  });

  db.query(createAppointmentsTable, (err) => {
    if (err) console.error("Error creating Appointments table:", err);
    else console.log("Appointments table created or already exists.");
  });

  db.query(createAdminTable, (err) => {
    if (err) console.error("Error creating Admin table:", err);
    else console.log("Admin table created or already exists.");
  });
};


// route for registration
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'register.html')); 
});

// POST route for registration
app.post('/register', async (req, res) => {
  const { firstName, lastName, email, password, phone, dob, gender, address } = req.body;

  try {
    db.query('SELECT * FROM Patients WHERE email = ?', [email], async (err, results) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err });
      }

      if (results.length > 0) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const password_hash = await bcrypt.hash(password, 10);

      db.query('INSERT INTO Patients (first_name, last_name, email, password_hash, phone, date_of_birth, gender, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
        [firstName, lastName, email, password_hash, phone, dob, gender, address], (err, result) => {
          if (err) {
            return res.status(500).json({ message: "Error registering patient", error: err });
          }
          res.status(201).json({ message: "Patient registered successfully!" });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname))); 

// Serve login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Patient post route for login
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.query('SELECT * FROM Patients WHERE email = ?', [email], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (results.length === 0) {
            return res.status(400).json({ message: 'User not found' });
        }

        const user = results[0];
        const password_hash = user.password_hash;

        bcrypt.compare(password, password_hash, (err, result) => {
            if (err) {
                console.error('Error comparing passwords:', err);
                return res.status(500).json({ message: 'Internal server error' });
            }

            if (results.length > 0){
                 
                res.json({ message: 'Login successful',
                patient_id: user.patient_id
                 });
                
            } else {
                return res.status(401).json({ message: 'Invalid password' });
            }
        });
    });
});

//Retrieve Patient ID
app.get('/indexs/:patientId', (req, res) => {
  const patientId = req.params.patientId; 
  const query = `SELECT patient_id, first_name, last_name FROM Patients WHERE patient_id = ?`;


  db.query(query, [patientId], (err, results) => {
      if (err) {
          return res.status(500).json({ message: "Error retrieving patient details", error: err });
      }
      if (results.length === 0) {
          return res.status(404).json({ message: "Patient not found" });
      }
      res.json(results[0]);
  });
});

// Serve appointments.html after login
app.use(express.static(path.join(__dirname))); 

app.get('/appointments', (req, res) => {
  res.sendFile(path.join(__dirname, 'appointments.html'));
});


// POST route to create an appointment
app.post('/appointments', (req, res) => {
  const { patient_id, appointment_date, appointment_time } = req.body;

  db.query(
    'INSERT INTO Appointments (patient_id, appointment_date, appointment_time, status) VALUES (?, ?, ?, "pending")',
    [patient_id, appointment_date, appointment_time],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Error booking appointment", error: err });
      res.status(201).json({ message: "Appointment booked successfully", appointmentId: result.insertId });
    }
  );
});


// GET route to view all appointments for a specific patient
app.get('/view-status/:patientId', (req, res) => {
  const patientId = req.params.patientId;

  
      const query = `
    SELECT a.*, d.first_name AS doctor_first_name, d.last_name AS doctor_last_name
    FROM Appointments a
    LEFT JOIN Doctors d ON a.doctor_id = d.doctor_id
    WHERE a.patient_id = ?
`;

  

  db.query(query, [patientId], (err, results) => {
      if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ message: "Error retrieving appointments", error: err });
      }
      if (results.length === 0) return res.status(404).json({ message: "No appointments found" });
      res.json( results);
  });
});




// PUT route to update an appointment
app.put('/update-appointment/:currentAppointmentId', (req, res) => {
  const { currentAppointmentId } = req.params;
  const { date, time, status } = req.body;

  db.query(
      'UPDATE Appointments SET appointment_date = ?, appointment_time = ?, status = ? WHERE appointment_id = ?',
      [date, time,status, currentAppointmentId],
      (err, result) => {
          if (err) {
              return res.status(500).json({ message: "Error updating appointment", error: err });
          }
          res.status(200).json({ message: "Appointment updated successfully" });
      }
  );
});


// DELETE route to cancel an appointment
app.delete('/cancel-appointment/:appointment_id', (req, res) => {
  const { appointment_id } = req.params;

  const query = 'DELETE FROM appointments WHERE appointment_id = ?';
  db.query(query, [appointment_id], (err, results) => {
      if (err) {
          console.error('Error deleting appointment:', err);
          res.status(500).json({ error: 'Database delete failed' });
      } else if (results.affectedRows === 0) {
          res.status(404).json({ error: 'Appointment not found' });
      } else {
          res.json({ message: 'Appointment deleted successfully' });
      }
  });
});


// Doctor  registration  
app.get('/docreg', (req, res) => {
  res.sendFile(path.join(__dirname, 'docreg.html')); 
});

// POST route for registration
app.post('/docreg', async (req, res) => {
  const { firstName, lastName, specialization, email, phone, schedule, password} = req.body;

  try {
    db.query('SELECT * FROM Doctors WHERE email = ?', [email], async (err, results) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err });
      }

      if (results.length > 0) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const password_hash = await bcrypt.hash(password, 10);

      db.query('INSERT INTO Doctors (first_name, last_name, specialization, email, phone, schedule, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?)', 
        [firstName, lastName, specialization, email , phone, schedule, password_hash], (err, result) => {
          if (err) {
            return res.status(500).json({ message: "Error registering doctor", error: err });
          }
          res.status(201).json({ message: "Doctor registered successfully!" });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});


//Doctor Serve login page
app.get('/doclogin', (req, res) => {
  res.sendFile(path.join(__dirname, 'doclogin.html'));
});

// Doc post route for login
app.post('/doclogin', (req, res) => {
    const { email, password } = req.body;

    db.query('SELECT * FROM Doctors WHERE email = ?', [email], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (results.length === 0) {
            return res.status(400).json({ message: 'User not found' });
        }

        const user = results[0];
        const password_hash = user.password_hash;

        bcrypt.compare(password, password_hash, (err, result) => {
            if (err) {
                console.error('Error comparing passwords:', err);
                return res.status(500).json({ message: 'Internal server error' });
            }

            if (results.length > 0){
                 
              res.json({ message: 'Login successful',
              doctor_id: user.doctor_id
               });
              
          } else {
              return res.status(401).json({ message: 'Invalid password' });
          }
        });
    });
});

// Retrieve Doctor ID 
app.get('/docdash/:doctorId', (req, res) => {
  const doctorId = req.params.doctorId; 
  const query = `SELECT doctor_id, first_name, last_name FROM Doctors WHERE doctor_id = ?`;

  db.query(query, [doctorId], (err, results) => {
      if (err) {
          return res.status(500).json({ message: "Error retrieving doctor details", error: err });
      }
      if (results.length === 0) {
          return res.status(404).json({ message: "Doctor not found" });
      }
      res.json(results[0]);
  });
});

app.get('/view-appointments', (req, res) => {
  const query = `
SELECT  p.first_name AS patient_first_name, p.last_name AS patient_last_name, a.appointment_date AS date, a.appointment_time AS time, a.status, a.appointment_id

FROM Appointments a
LEFT JOIN Doctors d ON a.doctor_id = d.doctor_id
LEFT JOIN Patients p ON a.patient_id = p.patient_id
WHERE a.status = 'pending';`;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Error retrieving appointments", error: err });
    }
    console.log("Query results:", results); 
    res.json(results);  
  });
});



// Accepting appointment status 

app.put('/view-appointments/:appointment_id', (req, res) => {
  const appointment_id = req.params.appointment_id; 
  const { status, doctor_id } = req.body;

  console.log("Received appointmentId:", appointment_id); 

  // Update appointment only if the appointmentId and status match
  const query = `
    UPDATE Appointments 
    SET status = ?, doctor_id = ? 
    WHERE appointment_id = ?;  
  `;

  db.query(query, [status, doctor_id, appointment_id], (err, results) => {
    if (err) {
      console.error("Error updating appointment:", err);
      return res.status(500).json({ message: "Error accepting appointment", error: err });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "Appointment not found or already accepted." });
    }
    res.json({ message: "Appointment Accepted successfully" });
  });
});



// Reschedule appointment status 
app.put('/view-appointments/:currentAppointmentId', (req, res) => {
  const currentAppointmentId = req.params.currentAppointmentId;
  const { date, time, status } = req.body;

  console.log(`Received update request: ${date}, ${time}, ${status}`);

  if (!date || !time) {
      return res.status(400).json({ message: "Date and time are required." });
  }

  db.query(
    ` UPDATE Appointments 
    SET status = ?, doctor_id = ? 
    WHERE appointment_id = ?; `,
      [date, time, status, currentAppointmentId],
      (err, result) => {
          if (err) {
              console.error("Error updating appointment:", err);
              return res.status(500).json({ message: "Error updating appointment", error: err });
          }
          console.log("Query result:", result); 
          res.status(200).json({ message: "Appointment updated successfully" });
      }
  );
});


// Admin login page
app.get('/adminlogin', (req, res) => {
  res.sendFile(path.join(__dirname, 'adminlogin.html'));
});

// Admin post route for login
app.post('/adminlogin', (req, res) => {
    const { email, password } = req.body;

    db.query('SELECT * FROM Admin WHERE email = ?', [email], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (results.length === 0) {
            return res.status(400).json({ message: 'User not found' });
        }

        const user = results[0];
        const password_hash = user.password_hash;

        bcrypt.compare(password, password_hash, (err, result) => {
            if (err) {
                console.error('Error comparing passwords:', err);
                return res.status(500).json({ message: 'Internal server error' });
            }

            if (results.length > 0){
                 
              res.json({ message: 'Login successful',
              doctor_id: user.doctor_id
               });
              
          } else {
              return res.status(401).json({ message: 'Invalid password' });
          }
        });
    });
});

// Retrieve Admin ID 
app.get('/adminlogin/:adminId', (req, res) => {
  const adminId = req.params.adminId; 
  const query = `SELECT admin_id, first_name, last_name FROM Admin WHERE admin_id = ?`;

  db.query(query, [adminId], (err, results) => {
      if (err) {
          return res.status(500).json({ message: "Error retrieving doctor details", error: err });
      }
      if (results.length === 0) {
          return res.status(404).json({ message: "Admin not found" });
      }
      res.json(results[0]);
  });
});


// Admin Get all appointments
app.get('/admindash', (req, res) => {
  const query = `SELECT a.*, 
                        p.first_name AS patient_first_name, 
                        p.last_name AS patient_last_name,  
                        d.first_name AS doctor_first_name, 
                        d.last_name AS doctor_last_name
                 FROM Appointments a
                 LEFT JOIN Patients p ON a.patient_id = p.patient_id
                 LEFT JOIN Doctors d ON a.doctor_id = d.doctor_id`;
  
  db.query(query, (err, results) => {
      if (err) {
          console.error('Error fetching appointments:', err);
          res.status(500).json({ error: 'Database query failed' });
      } else {
          res.json(results);
      }
  });
});

// Update an appointment
app.put('/admindash/:currentAppointmentId', (req, res) => {
  const currentAppointmentId = req.params.currentAppointmentId;
  const { date, time, status } = req.body;

  console.log(`Received update request: ${date}, ${time}, ${status}`);

  if (!date || !time) {
      return res.status(400).json({ message: "Date and time are required." });
  }

  db.query(
    ` UPDATE Appointments SET appointment_date = ?, appointment_time = ?, status = ? WHERE appointment_id = ? `,
      [date, time, status, currentAppointmentId],
      (err, result) => {
          if (err) {
              console.error("Error updating appointment:", err);
              return res.status(500).json({ message: "Error updating appointment", error: err });
          }
          console.log("Query result:", result); 
          res.status(200).json({ message: "Appointment updated successfully" });
      }
  );
});

// Delete an appointment
app.delete('/admindash/:appointment_id', (req, res) => {
  const { appointment_id } = req.params;

  const query = 'DELETE FROM appointments WHERE appointment_id = ?';
  db.query(query, [appointment_id], (err, results) => {
      if (err) {
          console.error('Error deleting appointment:', err);
          res.status(500).json({ error: 'Database delete failed' });
      } else if (results.affectedRows === 0) {
          res.status(404).json({ error: 'Appointment not found' });
      } else {
          res.json({ message: 'Appointment deleted successfully' });
      }
  });
});

// Get all doctors
app.get('/doctors', (req, res) => {
  const query = 'SELECT * FROM doctors';
  db.query(query, (err, results) => {
      if (err) {
          console.error('Error fetching doctors:', err);
          res.status(500).json({ error: 'Database query failed' });
      } else {
          res.json(results);
      }
  });
});


// Update a doctor
app.put('/doctors/:doctor_id', (req, res) => {
  const { doctor_id } = req.params;
  const { first_name, last_name, specialization, email, phone } = req.body;

  const query = 'UPDATE doctors SET first_name = ?, last_name = ?, specialization = ?, email = ?, phone = ? WHERE doctor_id = ?';
  db.query(query, [first_name, last_name, specialization, email, phone, doctor_id], (err, results) => {
      if (err) {
          console.error('Error updating doctor:', err);
          res.status(500).json({ error: 'Database update failed' });
      } else if (results.affectedRows === 0) {
          res.status(404).json({ error: 'Doctor not found' });
      } else {
          res.json({ message: 'Doctor updated successfully' });
      }
  });
});

// Delete a doctor
app.delete('/doctors/:id', (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM doctors WHERE doctor_id = ?';
  db.query(query, [id], (err, results) => {
      if (err) {
          console.error('Error deleting doctor:', err);
          res.status(500).json({ error: 'Database delete failed' });
      } else if (results.affectedRows === 0) {
          res.status(404).json({ error: 'Doctor not found' });
      } else {
          res.json({ message: 'Doctor deleted successfully' });
      }
  });
});

// Get all patients
app.get('/patients', (req, res) => {
  const query = 'SELECT * FROM patients';
  db.query(query, (err, results) => {
      if (err) {
          console.error('Error fetching patients:', err);
          res.status(500).json({ error: 'Database query failed' });
      } else {
          res.json(results);
      }
  });
});

// Update a patient
app.put('/patients/:id', (req, res) => {
  const { id } = req.params; // Use `id` as the parameter in the URL
  const { first_name, last_name, email, phone, date_of_birth, gender, address } = req.body;

  const query = 'UPDATE patients SET first_name = ?, last_name = ?, email = ?, phone = ?, date_of_birth = ?, gender = ?, address = ? WHERE patient_id = ?';
  db.query(query, [first_name, last_name, email, phone, date_of_birth, gender, address, id], (err, results) => {
      if (err) {
          console.error('Error updating patient:', err);
          res.status(500).json({ error: 'Database update failed' });
      } else if (results.affectedRows === 0) {
          res.status(404).json({ error: 'Patient not found' });
      } else {
          res.json({ message: 'Patient updated successfully' });
      }
  });
});


// Delete a patient
app.delete('/patients/:id', (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM patients WHERE patient_id = ?';
  db.query(query, [id], (err, results) => {
      if (err) {
          console.error('Error deleting patient:', err);
          res.status(500).json({ error: 'Database delete failed' });
      } else if (results.affectedRows === 0) {
          res.status(404).json({ error: 'Patient not found' });
      } else {
          res.json({ message: 'Patient deleted successfully' });
      }
  });
});


// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
