const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

// Create connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pfcfva'
});

// Connect
db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('MySQL connected');
});

const app = express();



// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the "public" directory
app.use(express.static('public'));

//session
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

//url body
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());


//add rfid to database (done)
//register route (test-hash)
app.post('/register', (req, res) => {
    const {
        rfid,
        username,
        password,
        accountType,
        lastName,
        firstName,
        middleName,
        middleInitial,
        callSign,
        currentAddress,
        dateOfBirth,
        civilStatus,
        gender,
        nationality,
        bloodType,
        mobileNumber,
        emailAddress,
        emergencyContactPerson,
        emergencyContactNumber,
        highestEducationalAttainment,
        nameOfCompany,
        yearsInService,
        skillsTraining,
        otherAffiliation,
        bioDataChecked,
        interviewChecked,
        fireResponsePoints,
        activityPoints,
        inventoryPoints,
        dutyHours
    } = req.body;

    // Check if the username already exists in the database
    const checkUsernameQuery = 'SELECT COUNT(*) AS count FROM tbl_accounts WHERE username = ?';
    db.query(checkUsernameQuery, [username], (checkErr, checkResult) => {
        if (checkErr) {
            console.error('Error checking username:', checkErr);
            res.status(500).send('Error checking username');
            return;
        }

        // If username already exists, send an error response
        if (checkResult[0].count > 0) {
            res.status(400).send('Username already exists');
            return;
        }

        // If username does not exist, proceed with registration
        bcrypt.hash(password, 10, (hashErr, hash) => {
            if (hashErr) {
                console.error('Error hashing password:', hashErr);
                res.status(500).send('Error hashing password');
                return;
            }

            const sql = `INSERT INTO tbl_accounts (
                rfid,
                username,
                password,
                accountType,
                lastName,
                firstName,
                middleName,
                middleInitial,
                callSign,
                currentAddress,
                dateOfBirth,
                civilStatus,
                gender,
                nationality,
                bloodType,
                mobileNumber,
                emailAddress,
                emergencyContactPerson,
                emergencyContactNumber,
                highestEducationalAttainment,
                nameOfCompany,
                yearsInService,
                skillsTraining,
                otherAffiliation,
                bioDataChecked,
                interviewChecked,
                fireResponsePoints,
                activityPoints,
                inventoryPoints,
                dutyHours
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            db.query(sql, [
                rfid,
                username,
                hash, // Store the hashed password 
                accountType,
                lastName,
                firstName,
                middleName,
                middleInitial,
                callSign,
                currentAddress,
                dateOfBirth,
                civilStatus,
                gender,
                nationality,
                bloodType,
                mobileNumber,
                emailAddress,
                emergencyContactPerson,
                emergencyContactNumber,
                highestEducationalAttainment,
                nameOfCompany,
                yearsInService,
                skillsTraining,
                otherAffiliation,
                bioDataChecked,
                interviewChecked,
                fireResponsePoints,
                activityPoints,
                inventoryPoints,
                dutyHours
            ], (err, result) => {
                if (err) {
                    console.error('Error registering user:', err);
                    res.status(500).send('Error registering user');
                    return;
                }
                res.status(200).send('User registered successfully');
            });
        });
    });
});





// Login route (test-hash)
//format: req.session.dataName = user.dataName;
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM tbl_accounts WHERE username = ?';
    db.query(sql, [username], (err, result) => {
        if (err) {
            res.status(500).send('Error logging in');
            return;
        }
        if (result.length === 0) {
            res.status(401).send('Invalid username or password');
            return;
        }
        const hashedPassword = result[0].password;
        bcrypt.compare(password, hashedPassword, (compareErr, compareResult) => {
            if (compareErr) {
                res.status(500).send('Error comparing passwords');
                return;
            }
            if (compareResult) {
                const user = result[0];
                req.session.loggedin = true;
                req.session.username = user.username;
                req.session.rfid = user.rfid; //this 2
                //basic info
                req.session.fullName = `${user.firstName} ${user.middleInitial +"."} ${user.lastName}`; //add middle initial
                //temp
                req.session.lastName = user.lastName;
                req.session.firstName = user.firstName;
                req.session.middleName = user.middleName;
                //basic info 2
                req.session.callSign = user.callSign;
                req.session.dateOfBirth = user.dateOfBirth; //need format fix
                req.session.gender = user.gender;
                req.session.civilStatus = user.civilStatus;
                req.session.nationality = user.nationality;
                req.session.bloodType = user.bloodType;
                req.session.highestEducationalAttainment = user.highestEducationalAttainment;
                req.session.nameOfCompany = user.nameOfCompany;
                req.session.yearsInService = user.yearsInService;
                req.session.skillsTraining = user.skillsTraining;
                req.session.otherAffiliation = user.otherAffiliation;
                //contact info
                req.session.emailAddress = user.emailAddress;
                req.session.mobileNumber = user.mobileNumber;
                req.session.currentAddress = user.currentAddress;
                req.session.emergencyContactPerson = user.emergencyContactPerson;
                req.session.emergencyContactNumber = user.emergencyContactNumber;
                //points
                req.session.dutyHours = user.dutyHours;
                req.session.fireResponsePoints = user.fireResponsePoints;
                req.session.inventoryPoints = user.inventoryPoints;
                req.session.activityPoints = user.activityPoints;
                //etc
                req.session.accountType = user.accountType;

                res.status(200).json({ message: 'Login successful', accountType: user.accountType });
            } else {
                res.status(401).send('Invalid username or password');
            }
        });
    });
});

app.get('/volunteer', (req, res) => {
    if (req.session.loggedin) {
        res.sendFile(path.join(__dirname, 'public', 'volunteer.html'));
    } else {
        res.redirect('/');
    }
});

//profiling session
//format: dataName: req.session.dataName,
app.get('/profile', (req, res) => {
    if (req.session.loggedin) {
        res.json({ 
            rfid: req.session.rfid,// this 3
            //basic info
            fullName: req.session.fullName, 
            //temp
            lastName: req.session.lastName,
            firstName: req.session.firstName,
            middleName: req.session.middleName,
            //basic info 2
            callSign: req.session.callSign, 
            dateOfBirth: req.session.dateOfBirth, 
            gender: req.session.gender,
            civilStatus: req.session.civilStatus,
            nationality: req.session.nationality,
            bloodType: req.session.bloodType,
            highestEducationalAttainment: req.session.highestEducationalAttainment,
            nameOfCompany: req.session.nameOfCompany,
            yearsInService: req.session.yearsInService,
            skillsTraining: req.session.skillsTraining,
            otherAffiliation: req.session.otherAffiliation,
            //contact info
            emailAddress: req.session.emailAddress,
            mobileNumber: req.session.mobileNumber,
            currentAddress: req.session.currentAddress,
            emergencyContactPerson: req.session.emergencyContactPerson,
            emergencyContactNumber: req.session.emergencyContactNumber,
            //points
            dutyHours: req.session.dutyHours,
            fireResponsePoints: req.session.fireResponsePoints,
            inventoryPoints: req.session.inventoryPoints,
            activityPoints: req.session.activityPoints,
            //etc
            accountType: req.session.accountType,
            username: req.session.username
            
        });
    } else {
        res.status(401).send('Not logged in');
    }
});



//update profile route (WITH BUGS)
app.post('/updateProfile', (req, res) => {
    const {
        rfid, lastName, firstName, middleName, middleInitial, username, emailAddress, mobileNumber,
        civilStatus, nationality, bloodType, dateOfBirth, gender, currentAddress,
        emergencyContactPerson, emergencyContactNumber, highestEducationalAttainment,
        nameOfCompany, yearsInService, skillsTraining, otherAffiliation, oldPassword,
        newPassword, confirmPassword
    } = req.body;

    if (newPassword && newPassword !== confirmPassword) {
        return res.status(400).send('New password and confirm password do not match');
    }

    const getUserQuery = 'SELECT password FROM tbl_accounts WHERE rfid = ?';
    db.query(getUserQuery, [rfid], (err, result) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).send('Error fetching user');
        }

        const hashedPassword = result[0].password;

        // If a new password is provided, validate the old password
        if (newPassword) {
            bcrypt.compare(oldPassword, hashedPassword, (compareErr, compareResult) => {
                if (compareErr || !compareResult) {
                    return res.status(400).send('Incorrect old password');
                }

                bcrypt.hash(newPassword, 10, (hashErr, hash) => {
                    if (hashErr) {
                        console.error('Error hashing new password:', hashErr);
                        return res.status(500).send('Error hashing new password');
                    }

                    // Call updateUserProfile with new password
                    updateUserProfile(rfid, lastName, firstName, middleName, middleInitial, username, emailAddress, mobileNumber,
                        civilStatus, nationality, bloodType, dateOfBirth, gender, currentAddress,
                        emergencyContactPerson, emergencyContactNumber, highestEducationalAttainment,
                        nameOfCompany, yearsInService, skillsTraining, otherAffiliation, hash, req, res); // Pass req to update session
                });
            });
        } else {
            // Call updateUserProfile without new password
            updateUserProfile(rfid, lastName, firstName, middleName, middleInitial, username, emailAddress, mobileNumber,
                civilStatus, nationality, bloodType, dateOfBirth, gender, currentAddress,
                emergencyContactPerson, emergencyContactNumber, highestEducationalAttainment,
                nameOfCompany, yearsInService, skillsTraining, otherAffiliation, null, req, res); // Pass req to update session
        }
    });
});

function updateUserProfile(rfid, lastName, firstName, middleName, middleInitial, username, emailAddress, mobileNumber,
    civilStatus, nationality, bloodType, dateOfBirth, gender, currentAddress,
    emergencyContactPerson, emergencyContactNumber, highestEducationalAttainment,
    nameOfCompany, yearsInService, skillsTraining, otherAffiliation, newPassword, req, res) { // Added req to update session
    
    let updateUserQuery = `UPDATE tbl_accounts SET
        lastName = ?, firstName = ?, middleName = ?, middleInitial = ?, username = ?, emailAddress = ?,
        mobileNumber = ?, civilStatus = ?, nationality = ?, bloodType = ?, dateOfBirth = ?,
        gender = ?, currentAddress = ?, emergencyContactPerson = ?, emergencyContactNumber = ?,
        highestEducationalAttainment = ?, nameOfCompany = ?, yearsInService = ?, skillsTraining = ?,
        otherAffiliation = ?`;

    const updateValues = [
        lastName, firstName, middleName, middleInitial, username, emailAddress, mobileNumber,
        civilStatus, nationality, bloodType, dateOfBirth, gender, currentAddress,
        emergencyContactPerson, emergencyContactNumber, highestEducationalAttainment,
        nameOfCompany, yearsInService, skillsTraining, otherAffiliation
    ];

    if (newPassword) {
        updateUserQuery += `, password = ?`;
        updateValues.push(newPassword);
    }

    updateUserQuery += ` WHERE rfid = ?`;
    updateValues.push(rfid);

    db.query(updateUserQuery, updateValues, (updateErr, updateResult) => {
        if (updateErr) {
            console.error('Error updating profile:', updateErr);
            return res.status(500).send('Error updating profile');
        }
        
        // Update session variables to reflect the changes
        req.session.lastName = lastName; 
        req.session.firstName = firstName; 
        req.session.middleName = middleName; 
        req.session.middleInitial = middleInitial; 
        req.session.username = username; 
        req.session.emailAddress = emailAddress; 
        req.session.mobileNumber = mobileNumber; 
        req.session.civilStatus = civilStatus; 
        req.session.nationality = nationality; 
        req.session.bloodType = bloodType; 
        req.session.dateOfBirth = dateOfBirth; 
        req.session.gender = gender; 
        req.session.currentAddress = currentAddress; 
        req.session.emergencyContactPerson = emergencyContactPerson; 
        req.session.emergencyContactNumber = emergencyContactNumber; 
        req.session.highestEducationalAttainment = highestEducationalAttainment; 
        req.session.nameOfCompany = nameOfCompany; 
        req.session.yearsInService = yearsInService; 
        req.session.skillsTraining = skillsTraining; 
        req.session.otherAffiliation = otherAffiliation; 

        // res.status(200).send('Profile updated successfully');
        req.session.fullName = `${firstName} ${middleInitial}. ${lastName}`; // Corrected to update fullName

        res.status(200).json(req.session); // Send updated session data to client
    });
}







// Attendance profile route
app.get('/attendanceProfile', (req, res) => {
    const rfid = req.query.rfid;
    if (!rfid) {
        return res.status(400).send('RFID is required');
    }

    const getUserQuery = 'SELECT * FROM tbl_accounts WHERE rfid = ?';
    db.query(getUserQuery, [rfid], (err, result) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).send('Error fetching user');
        }

        if (result.length === 0) {
            return res.status(404).send('User not found');
        }

        const user = result[0];
        res.json({
            rfid: user.rfid,
            fullName: `${user.firstName} ${user.middleInitial}. ${user.lastName}`,
            callSign: user.callSign,
            dutyHours: user.dutyHours,
            fireResponsePoints: user.fireResponsePoints,
            inventoryPoints: user.inventoryPoints,
            activityPoints: user.activityPoints,
            emailAddress: user.emailAddress,
            mobileNumber: user.mobileNumber,
            dateOfBirth: user.dateOfBirth,
            gender: user.gender,
            civilStatus: user.civilStatus,
            nationality: user.nationality,
            bloodType: user.bloodType,
            highestEducationalAttainment: user.highestEducationalAttainment,
            nameOfCompany: user.nameOfCompany,
            yearsInService: user.yearsInService,
            skillsTraining: user.skillsTraining,
            otherAffiliation: user.otherAffiliation,
            currentAddress: user.currentAddress,
            emergencyContactPerson: user.emergencyContactPerson,
            emergencyContactNumber: user.emergencyContactNumber
        });
    });
});

// Record attendance route
app.post('/recordAttendance', (req, res) => {
    const { rfid } = req.body;
    if (!rfid) {
        return res.status(400).send('RFID is required');
    }

    // Get the user's account ID based on RFID
    const getUserQuery = 'SELECT accountID, dutyHours FROM tbl_accounts WHERE rfid = ?';
    db.query(getUserQuery, [rfid], (err, result) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).send('Error fetching user');
        }

        if (result.length === 0) {
            return res.status(404).send('User not found');
        }

        const accountID = result[0].accountID;
        const currentDutyHours = result[0].dutyHours || 0;

        // Check if the user already has an active attendance record (timeInStatus = 1)
        const checkAttendanceQuery = 'SELECT * FROM tbl_attendance WHERE accountID = ? AND timeInStatus = 1';
        db.query(checkAttendanceQuery, [accountID], (checkErr, checkResult) => {
            if (checkErr) {
                console.error('Error checking attendance:', checkErr);
                return res.status(500).send('Error checking attendance');
            }

            const now = new Date();
            const timeNow = now.toTimeString().split(' ')[0];
            const dateNow = now.toISOString().split('T')[0];

            if (checkResult.length === 0) {
                // No active attendance record, insert a new time-in record
                const insertAttendanceQuery = `INSERT INTO tbl_attendance (accountID, timeIn, dateOfTimeIn, timeInStatus)
                                                VALUES (?, ?, ?, 1)`;
                db.query(insertAttendanceQuery, [accountID, timeNow, dateNow], (insertErr, insertResult) => {
                    if (insertErr) {
                        console.error('Error inserting attendance:', insertErr);
                        return res.status(500).send('Error inserting attendance');
                    }
                    console.log('Time in recorded:', { timeIn: timeNow, dateOfTimeIn: dateNow });
                    res.status(200).json({
                        message: 'Time in recorded successfully',
                        timeIn: timeNow,
                        dateOfTimeIn: dateNow,
                        timeInStatus: 1
                    });
                });
            } else {
                // Active attendance record exists, update with time out
                const attendanceID = checkResult[0].attendanceID;
                const timeIn = checkResult[0].timeIn;
                const dateOfTimeIn = checkResult[0].dateOfTimeIn;

                const updateAttendanceQuery = `UPDATE tbl_attendance SET timeOut = ?, dateOfTimeOut = ?, timeInStatus = 0
                                                WHERE attendanceID = ?`;
                db.query(updateAttendanceQuery, [timeNow, dateNow, attendanceID], (updateErr, updateResult) => {
                    if (updateErr) {
                        console.error('Error updating attendance:', updateErr);
                        return res.status(500).send('Error updating attendance');
                    }

                    // Calculate the duty hours
                    const dutyHours = (new Date(`${dateNow} ${timeNow}`) - new Date(`${dateOfTimeIn} ${timeIn}`)) / (1000 * 60 * 60);
                    const newDutyHours = currentDutyHours + dutyHours;

                    // Update the duty hours in tbl_accounts
                    const updateDutyHoursQuery = 'UPDATE tbl_accounts SET dutyHours = ? WHERE accountID = ?';
                    db.query(updateDutyHoursQuery, [newDutyHours, accountID], (dutyErr, dutyResult) => {
                        if (dutyErr) {
                            console.error('Error updating duty hours:', dutyErr);
                            return res.status(500).send('Error updating duty hours');
                        }
                        console.log('Time out recorded:', { timeOut: timeNow, dateOfTimeOut: dateNow, dutyHours: newDutyHours });
                        res.status(200).json({
                            message: 'Time out recorded successfully',
                            timeOut: timeNow,
                            dateOfTimeOut: dateNow,
                            timeInStatus: 0,
                            dutyHours: newDutyHours
                        });
                    });
                });
            }
        });
    });
});











// // Attendance profile route (50%)
// app.get('/attendanceProfile', (req, res) => {
//     const rfid = req.query.rfid;
//     if (!rfid) {
//         return res.status(400).send('RFID is required');
//     }

//     const getUserQuery = 'SELECT * FROM tbl_accounts WHERE rfid = ?';
//     db.query(getUserQuery, [rfid], (err, result) => {
//         if (err) {
//             console.error('Error fetching user:', err);
//             return res.status(500).send('Error fetching user');
//         }

//         if (result.length === 0) {
//             return res.status(404).send('User not found');
//         }

//         const user = result[0];
//         res.json({
//             rfid: user.rfid,
//             fullName: `${user.firstName} ${user.middleInitial}. ${user.lastName}`,
//             callSign: user.callSign,
//             dutyHours: user.dutyHours,
//             fireResponsePoints: user.fireResponsePoints,
//             inventoryPoints: user.inventoryPoints,
//             activityPoints: user.activityPoints,
//             emailAddress: user.emailAddress,
//             mobileNumber: user.mobileNumber,
//             dateOfBirth: user.dateOfBirth,
//             gender: user.gender,
//             civilStatus: user.civilStatus,
//             nationality: user.nationality,
//             bloodType: user.bloodType,
//             highestEducationalAttainment: user.highestEducationalAttainment,
//             nameOfCompany: user.nameOfCompany,
//             yearsInService: user.yearsInService,
//             skillsTraining: user.skillsTraining,
//             otherAffiliation: user.otherAffiliation,
//             currentAddress: user.currentAddress,
//             emergencyContactPerson: user.emergencyContactPerson,
//             emergencyContactNumber: user.emergencyContactNumber
//         });
//     });
// });



// // Record attendance route
// app.post('/recordAttendance', (req, res) => {
//     const { rfid } = req.body;
//     if (!rfid) {
//         return res.status(400).send('RFID is required');
//     }

//     // Get the user's account ID based on RFID
//     const getUserQuery = 'SELECT accountID, dutyHours FROM tbl_accounts WHERE rfid = ?';
//     db.query(getUserQuery, [rfid], (err, result) => {
//         if (err) {
//             console.error('Error fetching user:', err);
//             return res.status(500).send('Error fetching user');
//         }

//         if (result.length === 0) {
//             return res.status(404).send('User not found');
//         }

//         const accountID = result[0].accountID;
//         const currentDutyHours = result[0].dutyHours || 0;

//         // Check if the user already has an active attendance record (timeInStatus = 1)
//         const checkAttendanceQuery = 'SELECT * FROM tbl_attendance WHERE accountID = ? AND timeInStatus = 1';
//         db.query(checkAttendanceQuery, [accountID], (checkErr, checkResult) => {
//             if (checkErr) {
//                 console.error('Error checking attendance:', checkErr);
//                 return res.status(500).send('Error checking attendance');
//             }

//             const now = new Date();
//             const timeNow = now.toTimeString().split(' ')[0];
//             const dateNow = now.toISOString().split('T')[0];

//             if (checkResult.length === 0) {
//                 // No active attendance record, insert a new time in record
//                 const insertAttendanceQuery = `INSERT INTO tbl_attendance (accountID, timeIn, dateOfTimeIn, timeInStatus)
//                                                 VALUES (?, ?, ?, 1)`;
//                 db.query(insertAttendanceQuery, [accountID, timeNow, dateNow], (insertErr, insertResult) => {
//                     if (insertErr) {
//                         console.error('Error inserting attendance:', insertErr);
//                         return res.status(500).send('Error inserting attendance');
//                     }
//                     console.log('Time in recorded:', { timeIn: timeNow, dateOfTimeIn: dateNow });
//                     res.status(200).json({
//                         message: 'Time in recorded successfully',
//                         timeIn: timeNow,
//                         dateOfTimeIn: dateNow,
//                         timeInStatus: 1
//                     });
//                 });
//             } else {
//                 // Active attendance record exists, update with time out
//                 const attendanceID = checkResult[0].attendanceID;
//                 const timeIn = checkResult[0].timeIn;
//                 const dateOfTimeIn = checkResult[0].dateOfTimeIn;

//                 const updateAttendanceQuery = `UPDATE tbl_attendance SET timeOut = ?, dateOfTimeOut = ?, timeInStatus = 0
//                                                 WHERE attendanceID = ?`;
//                 db.query(updateAttendanceQuery, [timeNow, dateNow, attendanceID], (updateErr, updateResult) => {
//                     if (updateErr) {
//                         console.error('Error updating attendance:', updateErr);
//                         return res.status(500).send('Error updating attendance');
//                     }

//                     // Calculate the duty hours
//                     const dutyHours = (new Date(`${dateNow} ${timeNow}`) - new Date(`${dateOfTimeIn} ${timeIn}`)) / (1000 * 60 * 60);
//                     const newDutyHours = currentDutyHours + dutyHours;

//                     // Update the duty hours in tbl_accounts
//                     const updateDutyHoursQuery = 'UPDATE tbl_accounts SET dutyHours = ? WHERE accountID = ?';
//                     db.query(updateDutyHoursQuery, [newDutyHours, accountID], (dutyErr, dutyResult) => {
//                         if (dutyErr) {
//                             console.error('Error updating duty hours:', dutyErr);
//                             return res.status(500).send('Error updating duty hours');
//                         }
//                         console.log('Time out recorded:', { timeOut: timeNow, dateOfTimeOut: dateNow, dutyHours: newDutyHours });
//                         res.status(200).json({
//                             message: 'Time out recorded successfully',
//                             timeOut: timeNow,
//                             dateOfTimeOut: dateNow,
//                             timeInStatus: 0,
//                             dutyHours: newDutyHours
//                         });
//                     });
//                 });
//             }
//         });
//     });
// });



// // Record attendance route (bugged)
// app.post('/recordAttendance', (req, res) => {
//     const { rfid } = req.body;
//     if (!rfid) {
//         return res.status(400).send('RFID is required');
//     }

//     // Get the user's account ID based on RFID
//     const getUserQuery = 'SELECT accountID, dutyHours FROM tbl_accounts WHERE rfid = ?';
//     db.query(getUserQuery, [rfid], (err, result) => {
//         if (err) {
//             console.error('Error fetching user:', err);
//             return res.status(500).send('Error fetching user');
//         }

//         if (result.length === 0) {
//             return res.status(404).send('User not found');
//         }

//         const accountID = result[0].accountID;
//         const currentDutyHours = result[0].dutyHours || 0;

//         // Check if the user already has an active attendance record (timeInStatus = 1)
//         const checkAttendanceQuery = 'SELECT * FROM tbl_attendance WHERE accountID = ? AND timeInStatus = 1';
//         db.query(checkAttendanceQuery, [accountID], (checkErr, checkResult) => {
//             if (checkErr) {
//                 console.error('Error checking attendance:', checkErr);
//                 return res.status(500).send('Error checking attendance');
//             }

//             const now = new Date();
//             const timeNow = now.toTimeString().split(' ')[0];
//             const dateNow = now.toISOString().split('T')[0];

//             if (checkResult.length === 0) {
//                 // No active attendance record, insert a new time in record
//                 const insertAttendanceQuery = `INSERT INTO tbl_attendance (accountID, timeIn, dateOfTimeIn, timeInStatus)
//                                                 VALUES (?, ?, ?, 1)`;
//                 db.query(insertAttendanceQuery, [accountID, timeNow, dateNow], (insertErr, insertResult) => {
//                     if (insertErr) {
//                         console.error('Error inserting attendance:', insertErr);
//                         return res.status(500).send('Error inserting attendance');
//                     }
//                     console.log('Time in recorded:', { timeIn: timeNow, dateOfTimeIn: dateNow });
//                     res.status(200).json({
//                         message: 'Time in recorded successfully',
//                         timeIn: timeNow,
//                         dateOfTimeIn: dateNow,
//                         timeInStatus: 1
//                     });
//                 });
//             } else {
//                 // Active attendance record exists, update with time out
//                 const attendanceID = checkResult[0].attendanceID;
//                 const timeIn = checkResult[0].timeIn;
//                 const dateOfTimeIn = checkResult[0].dateOfTimeIn;

//                 const updateAttendanceQuery = `UPDATE tbl_attendance SET timeOut = ?, dateOfTimeOut = ?, timeInStatus = 0
//                                                 WHERE attendanceID = ?`;
//                 db.query(updateAttendanceQuery, [timeNow, dateNow, attendanceID], (updateErr, updateResult) => {
//                     if (updateErr) {
//                         console.error('Error updating attendance:', updateErr);
//                         return res.status(500).send('Error updating attendance');
//                     }

//                     // Calculate the duty hours
//                     const dutyHours = (new Date(`${dateNow} ${timeNow}`) - new Date(`${dateOfTimeIn} ${timeIn}`)) / (1000 * 60 * 60);
//                     const newDutyHours = currentDutyHours + dutyHours;

//                     // Update the duty hours in tbl_accounts
//                     const updateDutyHoursQuery = 'UPDATE tbl_accounts SET dutyHours = ? WHERE accountID = ?';
//                     db.query(updateDutyHoursQuery, [newDutyHours, accountID], (dutyErr, dutyResult) => {
//                         if (dutyErr) {
//                             console.error('Error updating duty hours:', dutyErr);
//                             return res.status(500).send('Error updating duty hours');
//                         }
//                         console.log('Time out recorded:', { timeOut: timeNow, dateOfTimeOut: dateNow, dutyHours: newDutyHours });
//                         res.status(200).json({
//                             message: 'Time out recorded successfully',
//                             timeOut: timeNow,
//                             dateOfTimeOut: dateNow,
//                             timeInStatus: 0,
//                             dutyHours: newDutyHours
//                         });
//                     });
//                 });
//             }
//         });
//     });
// });





//port
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
