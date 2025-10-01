import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from './db.js';


const app = express();
app.use(cors());
app.use(express.json());


const JWT_SECRET = 'dev-demo-secret-change-later';


function auth(requiredRoles = []){
return (req,res,next)=>{
const token = (req.headers.authorization||'').replace('Bearer ','');
if(!token) return res.status(401).json({error:'No token'});
try{
const payload = jwt.verify(token, JWT_SECRET);
req.user = payload;
if(requiredRoles.length && !requiredRoles.includes(req.user.role)){
return res.status(403).json({error:'Forbidden'});
}
next();
}catch(e){ res.status(401).json({error:'Invalid token'}); }
}
}


// ------- Auth -------
app.post('/api/auth/login', (req,res)=>{
const {email, password} = req.body;
const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
if(!user) return res.status(400).json({error:'Invalid credentials'});
if(!bcrypt.compareSync(password, user.pass_hash)) return res.status(400).json({error:'Invalid credentials'});
const token = jwt.sign({id:user.id, role:user.role, name:user.name, provider_id:user.provider_id}, JWT_SECRET, {expiresIn:'2h'});
res.json({token, user:{id:user.id, role:user.role, name:user.name}});
});


app.post('/api/auth/register', (req,res)=>{
const {role,name,email,password} = req.body;
if(!role||!name||!email||!password) return res.status(400).json({error:'Missing'});
const exists = db.prepare('SELECT 1 FROM users WHERE email=?').get(email);
if(exists) return res.status(400).json({error:'Email exists'});
let provider_id = null;
if(role==='Provider'){
const info = db.prepare('INSERT INTO providers (name,verified,plan) VALUES (?,?,?)').run(name,0,'Free');
provider_id = info.lastInsertRowid;
}
const pass_hash = bcrypt.hashSync(password,8);
db.prepare('INSERT INTO users (role,name,email,pass_hash,provider_id) VALUES (?,?,?,?,?)')
.run(role,name,email,pass_hash,provider_id);
res.json({ok:true});
});


// ------- Courses & Search -------
app.get('/api/courses', (req,res)=>{
const {q, provider, mode, location, industry, maxPrice} = req.query;
// join provider for plan ordering
const rows = db.prepare(`
SELECT c.*, p.name AS provider_name, p.plan
FROM courses c LEFT JOIN providers p ON p.id=c.provider_id
`).all();
let arr = rows;
if(q) arr = arr.filter(c=> c.title.toLowerCase().includes(q.toLowerCase()));
if(provider) arr = arr.filter(c=> (c.provider_name||'').toLowerCase().includes(provider.toLowerCase()));
if(mode && mode!=='Any') arr = arr.filter(c=> c.mode===mode);
if(location) arr = arr.filter(c=> (c.location||'').toLowerCase().includes(location.toLowerCase()));
if(industry) arr = arr.filter(c=> (c.industry||'').toLowerCase().includes(industry.toLowerCase()));
if(maxPrice) arr = arr.filter(c=> Number(c.price) <= Number(maxPrice));
const planRank = p=>({Sponsored:0, Featured:1, Free:2})[p||'Free'];
arr.sort((a,b)=> planRank(a.plan)-planRank(b.plan));
const schedules = db.prepare('SELECT course_id, GROUP_CONCAT(date) AS dates FROM schedules GROUP BY course_id').all();
const datesMap = Object.fromEntries(schedules.map(r=>[r.course_id, (r.dates||'').split(',')]));
res.json(arr.map(c=> ({...c, schedule: datesMap[c.id]||[]})));
});


app.post('/api/courses/:id/click', (req,res)=>{
const id = Number(req.params.id);
const row = db.prepare('SELECT n FROM analytics_clicks WHERE course_id=?').get(id);
if(row) db.prepare('UPDATE analytics_clicks SET n=n+1 WHERE course_id=?').run(id);
else db.prepare('INSERT INTO analytics_clicks (course_id,n) VALUES (?,1)').run(id);
res.json({ok:true});
});


app.post('/api/courses/:id/enroll', auth(['Learner']), (req,res)=>{
const id = Number(req.params.id);
const row = db.prepare('SELECT n FROM analytics_enrolls WHERE course_id=?').get(id);
if(row) db.prepare('UPDATE analytics_enrolls SET n=n+1 WHERE course_id=?').run(id);
else db.prepare('INSERT INTO analytics_enrolls (course_id,n) VALUES (?,1)').run(id);
res.json({ok:true});
});


// ------- Reviews -------
app.post('/api/reviews', auth(['Learner']), (req,res)=>{
const {courseId, text, stars} = req.body;
db.prepare('INSERT INTO reviews (course_id,user_id,stars,text) VALUES (?,?,?,?)')
.run(courseId, req.user.id, Math.max(1,Math.min(5, Number(stars)||5)), text||'');
res.json({ok:true});
});
app.get('/api/reviews/:courseId', (req,res)=>{
const list = db.prepare('SELECT stars,text FROM reviews WHERE course_id=? ORDER BY id DESC LIMIT 10').all(req.params.courseId);
res.json(list);
});


// ------- Corporate HR -------
app.get('/api/hr/staff', auth(['Corporate HR']), (req,res)=>{
res.json(db.prepare('SELECT * FROM hr_staff ORDER BY id DESC').all());
});
app.post('/api/hr/staff', auth(['Corporate HR']), (req,res)=>{
const {name,email} = req.body; if(!name||!email) return res.status(400).json({error:'Missing'});
db.prepare('INSERT INTO hr_staff (name,email) VALUES (?,?)').run(name,email);
res.json({ok:true});
});
app.get('/api/hr/assignments', auth(['Corporate HR']), (req,res)=>{
const rows = db.prepare(`
SELECT a.id, a.status, s.name AS staff_name, s.email AS staff_email,
c.title AS course_title
FROM assignments a
LEFT JOIN hr_staff s ON s.id=a.staff_id
LEFT JOIN courses c ON c.id=a.course_id
ORDER BY a.id DESC
`).all();
res.json(rows);
});
app.post('/api/hr/assignments', auth(['Corporate HR']), (req,res)=>{
const {courseId, staffId} = req.body; if(!courseId||!staffId) return res.status(400).json({error:'Missing'});
db.prepare('INSERT INTO assignments (course_id,staff_id,status) VALUES (?,?,?)').run(courseId,staffId,'Assigned');
res.json({ok:true});
});
app.put('/api/hr/assignments/:id/toggle', auth(['Corporate HR']), (req,res)=>{
const a = db.prepare('SELECT * FROM assignments WHERE id=?').get(req.params.id);
if(!a) return res.status(404).json({error:'Not found'});
const next = a.status==='Assigned'?'Completed':'Assigned';
db.prepare('UPDATE assignments SET status=? WHERE id=?').run(next, a.id);
res.json({ok:true,status:next});
});


// ------- Provider -------
app.get('/api/provider/courses', auth(['Provider']), (req,res)=>{
const list = db.prepare('SELECT * FROM courses WHERE provider_id=? ORDER BY id DESC').all(req.user.provider_id);
const sch = db.prepare('SELECT course_id, GROUP_CONCAT(date) AS dates FROM schedules WHERE course_id IN (SELECT id FROM courses WHERE provider_id=?) GROUP BY course_id').all(req.user.provider_id);
const map = Object.fromEntries(sch.map(r=>[r.course_id, (r.dates||'').split(',')]));
res.json(list.map(c=>({...c, schedule:map[c.id]||[]})));
});
app.post('/api/provider/courses', auth(['Provider']), (req,res)=>{
const {title,mode,price,location} = req.body; if(!title) return res.status(400).json({error:'Missing'});
const info = db.prepare('INSERT INTO courses (title,provider_id,mode,duration,location,price,industry,featured) VALUES (?,?,?,?,?,?,?,?)')
.run(title, req.user.provider_id, mode||'Classroom','1 day', location||'', price||0, 'General', 0);
res.json({ok:true,id:info.lastInsertRowid});
});
app.put('/api/provider/courses/:id', auth(['Provider']), (req,res)=>{
const {title} = req.body; if(!title) return res.status(400).json({error:'Missing'});
db.prepare('UPDATE courses SET title=? WHERE id=? AND provider_id=?').run(title, req.params.id, req.user.provider_id);
res.json({ok:true});
});
app.delete('/api/provider/courses/:id', auth(['Provider']), (req,res)=>{
db.prepare('DELETE FROM courses WHERE id=? AND provider_id=?').run(req.params.id, req.user.provider_id);
db.prepare('DELETE FROM schedules WHERE course_id=?').run(req.params.id);
res.json({ok:true});
});
app.post('/api/provider/courses/:id/schedule', auth(['Provider']), (req,res)=>{
const {date} = req.body; if(!date) return res.status(400).json({error:'Missing'});
db.prepare('INSERT INTO schedules (course_id,date) VALUES (?,?)').run(req.params.id, date);
res.json({ok:true});
});
app.put('/api/provider/plan', auth(['Provider']), (req,res)=>{
const {plan} = req.body; const ok = ['Free','Featured','Sponsored'].includes(plan);
if(!ok) return res.status(400).json({error:'Invalid plan'});
db.prepare('UPDATE providers SET plan=? WHERE id=?').run(plan, req.user.provider_id);
res.json({ok:true});
});


// ------- Admin -------
app.get('/api/admin/providers', auth(['Admin']), (req,res)=>{
res.json(db.prepare('SELECT * FROM providers ORDER BY id').all());
});
app.put('/api/admin/providers/:id/verify', auth(['Admin']), (req,res)=>{
const p = db.prepare('SELECT verified FROM providers WHERE id=?').get(req.params.id);
if(!p) return res.status(404).json({error:'Not found'});
const next = p.verified?0:1;
db.prepare('UPDATE providers SET verified=? WHERE id=?').run(next, req.params.id);
res.json({ok:true, verified:!!next});
});
app.get('/api/admin/ads', auth(['Admin']), (req,res)=>{
res.json(db.prepare('SELECT * FROM ads ORDER BY id DESC').all());
});
app.post('/api/admin/ads', auth(['Admin']), (req,res)=>{
const {text} = req.body; if(!text) return res.status(400).json({error:'Missing'});
db.prepare('INSERT INTO ads (text) VALUES (?)').run(text);
res.json({ok:true});
});
app.delete('/api/admin/ads/:id', auth(['Admin']), (req,res)=>{
db.prepare('DELETE FROM ads WHERE id=?').run(req.params.id);
res.json({ok:true});
});


// ------- Analytics -------
app.get('/api/analytics', auth(['Admin']), (req,res)=>{
const clicks = Object.fromEntries(db.prepare('SELECT course_id,n FROM analytics_clicks').all().map(r=>[r.course_id,r.n]));
const enrolls = Object.fromEntries(db.prepare('SELECT course_id,n FROM analytics_enrolls').all().map(r=>[r.course_id,r.n]));
const courses = db.prepare('SELECT id,title FROM courses').all();
res.json({clicks,enrolls,courses});
});


// Health
app.get('/api/health', (req,res)=> res.json({ok:true}));


const PORT = 5000;
app.listen(PORT, ()=> console.log(`Server listening on ${PORT}`));
