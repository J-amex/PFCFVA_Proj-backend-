
const express = require('express');
const mysql = require('mysql'); 
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { promisify } = require('util');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
require('dotenv').config({ path: './.env' });
const socketIo = require('socket.io');
const http = require('http');  // Added for HTTP server creation
// const session = require('express-session');
// const MySQLStore = require('express-mysql-session')(session);
const mysql2 = require('mysql2/promise');
const fileUpload = require('express-fileupload');



const db = mysql.createConnection({
    host: process.env.DB_HOST,
    // port: process.env.DB_PORT, // Uncomment if you want to use a specific port
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, // Corrected this line
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});
const db2 = mysql2.createPool({
    host: process.env.DB_HOST,
    // port: process.env.DB_PORT, // Uncomment if you want to use a specific port
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, // Corrected this line
    database: process.env.DB_NAME,

});

// Connect
db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('MySQL connected');
});

const app = express();

app.use(fileUpload({
    createParentPath: true,  // Automatically creates directories if they don't exist
}));
const storage = multer.diskStorage({
    destination: path.join(__dirname, 'public/uploads/'),
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// Init upload
const upload = multer({
    storage: storage,
    limits: {fileSize: 50 * 1024 * 1024}, // 50MB limit
    fileFilter: function(req, file, cb){
        checkFileType(file, cb);
    }
}).single('itemImage');


// Check File Type
function checkFileType(file, cb){
    // Allowed ext
    const filetypes = /jpeg|jpg|png|gif/;
    // Check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime
    const mimetype = filetypes.test(file.mimetype);

    if(mimetype && extname){
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}




// middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());


//session
// app.use(session({
//     secret: 'secret',
//     resave: false,
//     saveUninitialized: true,
//     cookie: { maxAge: 1000 * 60 * 60 * 24 } 
// }));
app.use(session({
    secret: 'ampotangina',
    resave: false,
    cookie: { secure: false },
    saveUninitialized: true
}));;

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

// Create HTTP server and pass it to socket.io
const server = http.createServer(app);  // Create the HTTP server

const io = socketIo(server);  // Attach Socket.IO to the server


// io.on('connection', (socket) => {
//     console.log('A user connected: ', socket.id);

//     // Handle incoming messages
//     socket.on('chatMessage', (msgData) => {
//         // Broadcast the message object to all clients
//         io.emit('chatMessage', msgData);
//     });

//     socket.on('disconnect', () => {
//         console.log('A user disconnected: ', socket.id);
//     });
// });

io.on('connection', (socket) => {
    console.log('A user connected: ', socket.id);

    // Send the chat log when a user connects
    const now = new Date();
    const fileName = `chat_${now.toISOString().split('T')[0]}.txt`;
    const filePath = path.join(__dirname, 'public/chat_logs', fileName);

    // Check if the log file exists and read it
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading chat log file:', err);
        } else {
            // Send the entire chat log content to the client
            socket.emit('loadChatLog', data);
        }
    });

    // Handle incoming chat messages
    socket.on('chatMessage', (msgData) => {
        const now = new Date();
        const fileName = `chat_${now.toISOString().split('T')[0]}.txt`;
        const filePath = path.join(__dirname, 'public/chat_logs', fileName);

        const logMessage = `[${msgData.date} ${msgData.time}] ${msgData.username}: ${msgData.message}\n`;

        // Save the message to the .txt file
        fs.appendFile(filePath, logMessage, (err) => {
            if (err) {
                console.error('Error writing to chat log:', err);
                return;
            }

            // Store the file path in the database if it's not already saved
            const query = 'INSERT INTO tbl_chat_logs (filePath) VALUES (?) ON DUPLICATE KEY UPDATE filePath = ?';
            db.query(query, [filePath, filePath], (err) => {
                if (err) {
                    console.error('Error saving chat log path:', err);
                }
            });
        });

        // Broadcast the message to all clients
        io.emit('chatMessage', msgData);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected: ', socket.id);
    });
});


// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//routes etc
const authRoutes = require('./routes/auth')(db, db2); // Pass the `db` connection
app.use('/auth', authRoutes);

const allRoutes = require('./routes/routes_all')(db); // Pass the `db` connection
app.use('/routes_attendance', allRoutes);



// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


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



// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


// endpoint to get user profile data by RFID (working for profile)
app.get('/attendanceProfile', (req, res) => {
    const rfid = req.query.rfid;
    const sql = 'SELECT * FROM tbl_accounts WHERE rfid = ?';
    db.query(sql, [rfid], (err, result) => {
        if (err) {
            res.status(500).send('Error retrieving user data');
            return;
        }
        if (result.length === 0) {
            res.status(404).send('User not found');
            return;
        }
        const user = result[0];
        res.json({
            fullName: `${user.firstName} ${user.middleInitial}. ${user.lastName}`,
            callSign: user.callSign,
            dutyHours: user.dutyHours,
            fireResponsePoints: user.fireResponsePoints,
            inventoryPoints: user.inventoryPoints,
            activityPoints: user.activityPoints
        });
    });
});


// endpoint to record Time In (working)
app.post('/recordTimeIn', (req, res) => {
    const rfid = req.body.rfid;
    const currentTime = new Date();
    const timeIn = currentTime.toTimeString().split(' ')[0]; // time in HH:MM:SS format
    const dateOfTimeIn = currentTime.toISOString().split('T')[0]; // date in YYYY-MM-DD format

    const getUserQuery = 'SELECT accountID FROM tbl_accounts WHERE rfid = ?';
    db.query(getUserQuery, [rfid], (err, result) => {
        if (err) {
            res.status(500).send('Error retrieving user data');
            return;
        }
        if (result.length === 0) {
            res.status(404).send('User not found');
            return;
        }
        const accountID = result[0].accountID;
        const checkStatusQuery = `SELECT timeInStatus FROM tbl_attendance WHERE accountID = ? ORDER BY attendanceID DESC LIMIT 1`;
        db.query(checkStatusQuery, [accountID], (err, result) => {
            if (err) {
                res.status(500).send('Error checking attendance status');
                return;
            }
            if (result.length === 0 || result[0].timeInStatus === 0) {
                const insertAttendanceQuery = `INSERT INTO tbl_attendance (accountID, timeIn, dateOfTimeIn, timeInStatus) 
                                               VALUES (?, ?, ?, 1)`;
                db.query(insertAttendanceQuery, [accountID, timeIn, dateOfTimeIn], (err, result) => {
                    if (err) {
                        res.status(500).send('Error recording Time In');
                        return;
                    }
                    res.json({ timeIn, dateOfTimeIn });
                });
            } else {
                res.status(400).send('User already has an active Time In record');
            }
        });
    });
});

// endpoint to record Time Out (working)
app.post('/recordTimeOut', (req, res) => {
    const rfid = req.body.rfid;
    const currentTime = new Date();
    const timeOut = currentTime.toTimeString().split(' ')[0]; 
    const dateOfTimeOut = currentTime.toISOString().split('T')[0]; 

    const getUserQuery = 'SELECT accountID FROM tbl_accounts WHERE rfid = ?';
    db.query(getUserQuery, [rfid], (err, result) => {
        if (err) {
            res.status(500).send('Error retrieving user data');
            return;
        }
        if (result.length === 0) {
            res.status(404).send('User not found');
            return;
        }
        const accountID = result[0].accountID;
        const updateAttendanceQuery = `UPDATE tbl_attendance 
                                       SET timeOut = ?, dateOfTimeOut = ?, timeInStatus = 0 
                                       WHERE accountID = ? AND timeInStatus = 1 ORDER BY attendanceID DESC LIMIT 1`;
        db.query(updateAttendanceQuery, [timeOut, dateOfTimeOut, accountID], (err, result) => {
            if (err) {
                res.status(500).send('Error recording Time Out');
                return;
            }
            if (result.affectedRows === 0) {
                res.status(400).send('No active Time In record found');
                return;
            }
            res.json({ timeOut, dateOfTimeOut });
        });
    });
});



// endpoint to retrieve recent attendance records
app.get('/recentAttendance', (req, res) => {
    const sql = `
        SELECT a.accountID, a.timeIn, a.dateOfTimeIn, a.timeOut, a.dateOfTimeOut, 
               b.firstName, b.middleInitial, b.lastName
        FROM tbl_attendance a
        JOIN tbl_accounts b ON a.accountID = b.accountID
        ORDER BY a.attendanceID DESC
        LIMIT 50`; // pang limit kung ilan kukunin shit

    db.query(sql, (err, results) => {
        if (err) {
            res.status(500).send('Error retrieving recent attendance records');
            return;
        }
        res.json(results);
    });
});


//SELECT tbl_accounts (REFINED)
app.get('/accountsAll', (req, res) => {
    const sql = `
        SELECT
            accountID,
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
            idPicture,
            bioDataChecked,
            interviewChecked,
            fireResponsePoints,
            activityPoints,
            inventoryPoints,
            dutyHours,
            cumulativeDutyHours,
            rank,
            resetPasswordToken,
            resetPasswordExpires,
            status
        FROM tbl_accounts
        ORDER BY lastName ASC, firstName ASC, middleInitial ASC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            res.status(500).send('Error retrieving accounts');
            return;
        }
        res.json(results);
    });
});


//admin attendance shit
// endpoint to retrieve attendance details
app.get('/attendanceDetails', (req, res) => {
    const sql = `
        SELECT 
            a.firstName,
            a.middleInitial,
            a.lastName,
            a.callSign,
            b.dateOfTimeIn,
            b.timeIn,
            b.dateOfTimeOut,
            b.timeOut,
            a.status,
            a.accountType
        FROM tbl_accounts a
        JOIN tbl_attendance b ON a.accountID = b.accountID
        ORDER BY b.dateOfTimeIn DESC, b.timeIn DESC `; // add LIMIT # if need

    db.query(sql, (err, results) => {
        if (err) {
            res.status(500).send('Error retrieving attendance details');
            return;
        }
        res.json(results);
    });
});


// endpoint to retrieve volunteer details
// New endpoint to retrieve all account details
app.get('/volunteerDetails', (req, res) => {
    const sql = `
        SELECT 
            a.firstName,
            a.middleInitial,
            a.lastName,
            a.callSign,
            a.callSign AS rank, 
            a.dutyHours,
            a.cumulativeDutyHours,
            a.fireResponsePoints,
            a.inventoryPoints,
            a.activityPoints,
            a.accountType
        FROM tbl_accounts a
        ORDER BY a.lastName, a.firstName`;  

    db.query(sql, (err, results) => {
        if (err) {
            res.status(500).send('Error retrieving account details');
            return;
        }
        res.json(results);
    }); 
});

// Endpoint to get current attendees with timeInStatus = 1
app.get('/getCurrentPresent', (req, res) => {
    const sql = `
        SELECT b.callSign, b.firstName, b.middleInitial, b.lastName 
        FROM tbl_attendance a
        JOIN tbl_accounts b ON a.accountID = b.accountID
        WHERE a.timeInStatus = 1
    `;

    db.query(sql, (err, results) => {
        if (err) {  
            console.error('Error retrieving current present attendees:', err);
            res.status(500).send('Error retrieving current present attendees');
            return;
        }
        res.json(results);
    });
});



// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


// working with compression and anti
app.post('/uploadEquipment', (req, res) => {
    upload(req, res, function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }

        // Destructure the fields correctly from req.body
        const { itemName, vehicleAssignment, dateAcquired } = req.body;

        if (!itemName || !dateAcquired || !vehicleAssignment) {  // Make sure all fields are validated
            return res.status(400).json({ error: 'All fields are required.' });
        }

        // Check if the itemName already exists
        const checkItemNameQuery = 'SELECT COUNT(*) AS count FROM tbl_inventory WHERE itemName = ?';
        db.query(checkItemNameQuery, [itemName], (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to check item name uniqueness' });
            }

            if (result[0].count > 0) {
                return res.status(400).json({ error: 'Item name already exists. Please choose a different name.' });
            }

            const originalImagePath = path.join(__dirname, 'public/uploads', req.file.filename);

            // Compress the image using sharp and resize it
            sharp(originalImagePath)
                .metadata()
                .then(metadata => {
                    const newWidth = Math.round(metadata.width * 0.5);
                    const newHeight = Math.round(metadata.height * 0.5);

                    return sharp(originalImagePath)
                        .resize({ width: newWidth, height: newHeight })
                        .toBuffer();
                })
                .then(data => {
                    fs.writeFile(originalImagePath, data, (err) => {
                        if (err) {
                            return res.status(500).json({ error: 'Failed to save compressed image.' });
                        }

                        const itemImagePath = `/uploads/${req.file.filename}`;

                        const sql = `
                            INSERT INTO tbl_inventory (itemName, itemImage, vehicleAssignment, dateAcquired)
                            VALUES (?, ?, ?, ?)
                        `;

                        db.query(sql, [itemName, itemImagePath, vehicleAssignment, dateAcquired], (err, results) => {
                            if (err) {
                                return res.status(500).json({ error: 'Failed to add equipment due to internal server error.' });
                            }
                            res.status(201).json({
                                message: 'Equipment added successfully!',
                                data: { itemName, itemImagePath, vehicleAssignment, dateAcquired }
                            });
                        });
                    });
                })
                .catch(err => {
                    console.error('Error compressing image:', err);
                    return res.status(500).json({ error: 'Failed to compress image. Please try again later.' });
                });
        });
    });
});





// //select equip route
// app.get('/getEquipment', (req, res) => {
//     const sql = 'SELECT itemName, itemImage, vehicleAssignment FROM tbl_inventory';
//     db.query(sql, (err, results) => {
//         if (err) {
//             console.error('Failed to retrieve equipment:', err);
//             res.status(500).json({ error: 'Failed to retrieve equipment' });
//         } else {
//             res.json(results);
//         }
//     });
// });

app.get('/getVehicleAssignments', (req, res) => {
    const sql = 'SELECT * from tbl_vehicles;';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Failed to retrieve vehicle assignments:', err);
            res.status(500).json({ error: 'Failed to retrieve vehicle assignments' });
        } else {
            res.json(results);
        }
    });
});

app.get('/getEquipment', (req, res) => {
    const vehicleAssignment = req.query.vehicleAssignment;
    let sql = 'SELECT itemName, itemImage, vehicleAssignment FROM tbl_inventory WHERE itemStatus != "trash"';
    const params = []; 
    if (vehicleAssignment && vehicleAssignment !== '') {
        sql += ' AND vehicleAssignment = ?';
        params.push(vehicleAssignment); 
    }

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Failed to retrieve equipment:', err);
            res.status(500).json({ error: 'Failed to retrieve equipment' });
        } else {
            res.json(results);
        }
    });
});


app.get('/getTrashedEquipment', (req, res) => {
    const sql = 'SELECT itemName, itemImage, vehicleAssignment FROM tbl_inventory WHERE itemStatus = "trash"';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Failed to retrieve trashed equipment:', err);
            res.status(500).json({ error: 'Failed to retrieve trashed equipment' });
        } else {
            res.json(results);
        }
    });
});



//delete equipment route
app.delete('/deleteEquipment/:itemName', (req, res) => {
    const itemName = req.params.itemName;

    // First, retrieve the image path from the database
    const getImagePathQuery = 'SELECT itemImage FROM tbl_inventory WHERE itemName = ?';
    db.query(getImagePathQuery, [itemName], (err, results) => {
        if (err) {
            console.error('Error retrieving image path:', err);
            return res.status(500).json({ error: 'Failed to retrieve image path.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Equipment not found.' });
        }

        const imagePath = path.join(__dirname, 'public', results[0].itemImage);

        // Delete the image file
        fs.unlink(imagePath, (err) => {
            if (err) {
                console.error('Failed to delete image file:', err);
                return res.status(500).json({ error: 'Failed to delete image file.' });
            }

            // Proceed to delete the database entry
            const sql = 'DELETE FROM tbl_inventory WHERE itemName = ?';
            db.query(sql, [itemName], (err, result) => {
                if (err) {
                    console.error('Error deleting equipment:', err);
                    return res.status(500).json({ error: 'Failed to delete equipment.' });
                }

                if (result.affectedRows === 0) {
                    return res.status(404).json({ error: 'Equipment not found.' });
                }

                res.status(200).json({ message: 'Equipment deleted successfully.' });
            });
        });
    });
});

// Move equipment to trash (soft delete, no image deletion)
app.put('/moveToTrash/:itemName', (req, res) => {
    const itemName = req.params.itemName;

    // Move the item to the trash by updating its `itemStatus`
    const sql = 'UPDATE tbl_inventory SET itemStatus = "trash" WHERE itemName = ?'; 
    db.query(sql, [itemName], (err, result) => {
        if (err) {
            console.error('Error moving equipment to trash:', err);
            return res.status(500).json({ error: 'Failed to move equipment to trash.' });
        }

        res.status(200).json({ message: 'Equipment moved to trash successfully.' });
    });
});


// Permanently delete equipment from trash
// app.delete('/deleteFromTrash/:itemName', (req, res) => {
//     const itemName = req.params.itemName;

//     // First, retrieve the image path from the database
//     const getImagePathQuery = 'SELECT itemImage FROM tbl_inventory WHERE itemName = ?';
//     db.query(getImagePathQuery, [itemName], (err, results) => {
//         if (err) {
//             console.error('Error retrieving image path:', err);
//             return res.status(500).json({ error: 'Failed to retrieve image path.' });
//         }

//         if (results.length === 0) {
//             return res.status(404).json({ error: 'Equipment not found.' });
//         }

//         const imagePath = path.join(__dirname, 'public', results[0].itemImage);

//         // Delete the image file
//         fs.unlink(imagePath, (err) => {
//             if (err) {
//                 console.error('Failed to delete image file:', err);
//                 return res.status(500).json({ error: 'Failed to delete image file.' });
//             }

//             // Proceed to delete the database entry
//             const sql = 'DELETE FROM tbl_inventory WHERE itemName = ?';
//             db.query(sql, [itemName], (err, result) => {
//                 if (err) {
//                     console.error('Error deleting equipment:', err);
//                     return res.status(500).json({ error: 'Failed to delete equipment.' });
//                 }

//                 res.status(200).json({ message: 'Equipment permanently deleted from trash.' });
//             });
//         });
//     });
// });


app.delete('/deleteFromTrash/:itemName', (req, res) => {
    const { itemName } = req.params;
    const { password } = req.body;
    const username = req.session.user?.username;  // Get the logged-in user's username

    if (!username) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if the provided password matches the current user's password
    const getPasswordQuery = 'SELECT password FROM tbl_accounts WHERE username = ?';
    db.query(getPasswordQuery, [username], (err, results) => {
        if (err || results.length === 0) {
            return res.status(500).json({ error: 'Error retrieving password' });
        }

        const hashedPassword = results[0].password;
        bcrypt.compare(password, hashedPassword, (err, isMatch) => {
            if (err || !isMatch) {
                return res.status(401).json({ error: 'Incorrect password' });
            }

            // If the password matches, proceed to delete the item
            const getImagePathQuery = 'SELECT itemImage FROM tbl_inventory WHERE itemName = ?';
            db.query(getImagePathQuery, [itemName], (err, results) => {
                if (err || results.length === 0) {
                    return res.status(500).json({ error: 'Failed to retrieve image path' });
                }

                const imagePath = path.join(__dirname, 'public', results[0].itemImage);
                fs.unlink(imagePath, (err) => {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to delete image file' });
                    }

                    const deleteQuery = 'DELETE FROM tbl_inventory WHERE itemName = ?';
                    db.query(deleteQuery, [itemName], (err) => {
                        if (err) {
                            return res.status(500).json({ error: 'Failed to delete equipment' });
                        }
                        res.status(200).json({ message: 'Equipment permanently deleted from trash.' });
                    });
                });
            });
        });
    });
});




//edit equip route
app.put('/updateEquipment', (req, res) => {
    const { originalItemName, updatedItemName, updatedVehicleAssignment } = req.body;

    const sql = `
        UPDATE tbl_inventory
        SET itemName = ?, vehicleAssignment = ?
        WHERE itemName = ?
    `;
    
    db.query(sql, [updatedItemName, updatedVehicleAssignment, originalItemName], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to update equipment' });
        }
        res.status(200).json({ message: 'Equipment updated successfully' });
    });
});


const pages = require('./routes/pages');
app.use('/', pages);
app.use('/upload', express.static(path.join(__dirname, 'upload')));
app.use('/profilePicture', express.static(path.join(__dirname, 'profilePicture')));
app.use('/img', express.static(path.join(__dirname, 'public/img')));


// //port
// const PORT = 3000;
// app.listen(PORT, () => {
//     console.log(`Server started on port ${PORT}`);
// });


const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
