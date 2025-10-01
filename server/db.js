import Database from 'better-sqlite3';


const db = new Database('wsqcourses.db');


// Tables
db.exec(`
CREATE TABLE IF NOT EXISTS users (
id INTEGER PRIMARY KEY AUTOINCREMENT,
role TEXT NOT NULL,
name TEXT NOT NULL,
email TEXT UNIQUE NOT NULL,
pass_hash TEXT NOT NULL,
provider_id INTEGER
);
CREATE TABLE IF NOT EXISTS providers (
id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT NOT NULL,
verified INTEGER DEFAULT 0,
plan TEXT DEFAULT 'Free'
);
CREATE TABLE IF NOT EXISTS courses (
id INTEGER PRIMARY KEY AUTOINCREMENT,
title TEXT NOT NULL,
provider_id INTEGER,
mode TEXT,
duration TEXT,
location TEXT,
price REAL,
industry TEXT,
featured INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS schedules (
id INTEGER PRIMARY KEY AUTOINCREMENT,
course_id INTEGER,
date TEXT
);
CREATE TABLE IF NOT EXISTS reviews (
id INTEGER PRIMARY KEY AUTOINCREMENT,
course_id INTEGER,
user_id INTEGER,
stars INTEGER,
text TEXT
);
CREATE TABLE IF NOT EXISTS hr_staff (
id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT,
email TEXT
);
CREATE TABLE IF NOT EXISTS assignments (
id INTEGER PRIMARY KEY AUTOINCREMENT,
course_id INTEGER,
staff_id INTEGER,
status TEXT
);
CREATE TABLE IF NOT EXISTS analytics_clicks (
course_id INTEGER PRIMARY KEY,
n INTEGER
);
CREATE TABLE IF NOT EXISTS analytics_enrolls (
course_id INTEGER PRIMARY KEY,
n INTEGER
);
CREATE TABLE IF NOT EXISTS ads (
id INTEGER PRIMARY KEY AUTOINCREMENT,
text TEXT
);
`);


// Seed once
const hasUsers = db.prepare('SELECT COUNT(*) AS c FROM users').get().c > 0;
if (!hasUsers) {
const bcrypt = await import('bcryptjs');
const hash = s => bcrypt.default.hashSync(s, 8);
  

// Providers
db.prepare('INSERT INTO providers (name,verified,plan) VALUES (?,?,?)').run('SafeWorks Institute',1,'Sponsored');
db.prepare('INSERT INTO providers (name,verified,plan) VALUES (?,?,?)').run('GrowthLab Academy',1,'Featured');
db.prepare('INSERT INTO providers (name,verified,plan) VALUES (?,?,?)').run('CleanServe Training',0,'Free');
  

// Users
db.prepare('INSERT INTO users (role,name,email,pass_hash,provider_id) VALUES (?,?,?,?,?)')
.run('Learner','Alex Tan','learner@demo.sg',hash('demo'),null);
db.prepare('INSERT INTO users (role,name,email,pass_hash,provider_id) VALUES (?,?,?,?,?)')
.run('Corporate HR','Sunrise Pte Ltd','hr@demo.sg',hash('demo'),null);
db.prepare('INSERT INTO users (role,name,email,pass_hash,provider_id) VALUES (?,?,?,?,?)')
.run('Provider','SafeWorks Institute','provider@demo.sg',hash('demo'),1);
db.prepare('INSERT INTO users (role,name,email,pass_hash,provider_id) VALUES (?,?,?,?,?)')
.run('Admin','WSQ Admin','admin@demo.sg',hash('demo'),null);
  

// Courses
const mkCourse = db.prepare('INSERT INTO courses (title,provider_id,mode,duration,location,price,industry,featured) VALUES (?,?,?,?,?,?,?,?)');
const mkSchedule = db.prepare('INSERT INTO schedules (course_id,date) VALUES (?,?)');


mkCourse.run('Workplace Safety & Health (WSQ)',1,'Classroom','2 days','Jurong',250,'Safety',1);
mkCourse.run('Digital Marketing Fundamentals (WSQ)',2,'Online','8 hrs','Remote',180,'Marketing',0);
mkCourse.run('Food Hygiene Course (WSQ)',3,'Classroom','1 day','Tampines',120,'F&B',0);
mkCourse.run('Logistics & Warehousing Essentials (WSQ)',1,'Blended','3 days','Woodlands',390,'Logistics',0);
  

// Schedules
mkSchedule.run(1,'2025-10-10'); mkSchedule.run(1,'2025-11-02');
mkSchedule.run(2,'2025-10-15');
mkSchedule.run(3,'2025-10-05'); mkSchedule.run(3,'2025-10-28');
mkSchedule.run(4,'2025-10-20');
}


export default db;
