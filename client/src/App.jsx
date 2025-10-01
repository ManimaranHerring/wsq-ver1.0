import React, { useEffect, useMemo, useState } from 'react'
import API from './api'


const styles = {
app: {fontFamily:'Inter, system-ui, sans-serif', background:'#0b1020', color:'#e8eeff', minHeight:'100vh'},
container:{maxWidth:1200, margin:'0 auto', padding:24},
card:{background:'#121a33', border:'1px solid #24325e', borderRadius:16, padding:18, marginTop:12},
row:{display:'flex', gap:10, flexWrap:'wrap', alignItems:'center'},
input:{background:'#0c1429', border:'1px solid #2a355e', color:'#e7efff', borderRadius:12, padding:'10px 12px'},
btn:(variant='primary')=>({
border:'none', borderRadius:12, padding:'10px 14px', cursor:'pointer',
background: variant==='secondary' ? '#25325b' : (variant==='danger'?'#ef4444': (variant==='success'?'#22c55e':'#5b8cff')),
color: variant==='secondary' ? '#d8e4ff' : '#fff'
})
}


function useAuth(){
const [user,setUser]=useState(()=> JSON.parse(localStorage.getItem('auth')||'null'));
useEffect(()=>{ if(user) localStorage.setItem('auth', JSON.stringify(user)); else localStorage.removeItem('auth'); API.setToken(user?.token||null); },[user]);
return {user,setUser};
}


export default function App(){
const {user,setUser} = useAuth();
const [route,setRoute] = useState('#/login');
useEffect(()=>{ const onhash=()=> setRoute(location.hash||'#/login'); window.addEventListener('hashchange', onhash); onhash(); return ()=>window.removeEventListener('hashchange', onhash); },[]);


return (
<div style={styles.app}>
<div style={styles.container}>
<Header user={user} onLogout={()=>setUser(null)} />
{route==="#/login" && <Login onLogin={setUser} />}
{user && route==="#/search" && <Search />}
{user && route==="#/compare" && <Compare />}
{user && user.role==='Learner' && route==="#/dashboard" && <Learner />}
{user && user.role==='Corporate HR' && route==="#/hr" && <HR />}
{user && user.role==='Provider' && route==="#/provider" && <Provider />}
{user && user.role==='Admin' && route==="#/admin" && <Admin />}
</div>
</div>
)
} 


function Header({user,onLogout}){
return (
<div style={{...styles.card, display:'flex', justifyContent:'space-between'}}>
<div style={{display:'flex', alignItems:'center', gap:12}}>
<div style={{width:36,height:36,borderRadius:10, background:'conic-gradient(#5b8cff,#22c55e,#5b8cff)'}}/>
<div>
<div style={{fontWeight:700}}>WSQCourses</div>
<div style={{fontSize:12, color:'#93a0c3'}}>Node + React + SQLite</div>
</div>
</div>
<div style={styles.row}>
{user && <span style={{fontSize:12, padding:'6px 10px', border:'1px solid #2a355e', borderRadius:999}}>{user.user.role}: {user.user.name}</span>}
{user && <button style={styles.btn('secondary')} onClick={onLogout}>Logout</button>}
</div>
</div>
)
}


function Login({onLogin}){
const [role,setRole]=useState('Learner');
const [email,setEmail]=useState('');
const [password,setPassword]=useState('');
const demo=()=>{
const map={ 'Learner':['learner@demo.sg','demo'], 'Corporate HR':['hr@demo.sg','demo'], 'Provider':['provider@demo.sg','demo'], 'Admin':['admin@demo.sg','demo'] };
setEmail(map[role][0]); setPassword(map[role][1]);
}
const signIn=async()=>{
const data = await API.post('/api/auth/login',{email,password});
onLogin({token:data.token, user:data.user}); location.hash = role==='Learner'?'#/search': (role==='Corporate HR'?'#/hr': (role==='Provider'?'#/provider':'#/admin'))
}
const register=async()=>{
const name=prompt('Name / Company'); if(!name) return;
await API.post('/api/auth/register',{role,name,email,password});
alert('Account created. You can now login.');
}
return (
<div style={styles.card}>
<div style={{display:'flex', justifyContent:'space-between'}}>
<h2 style={{margin:0}}>Login</h2>
<span style={{fontSize:12, padding:'4px 8px', border:'1px solid #2a355e', borderRadius:999}}>Roles: Learner / Corporate HR / Provider / Admin</span>
</div>
<div style={styles.row}>
<select value={role} onChange={e=>setRole(e.target.value)} style={styles.input}>
<option>Learner</option><option>Corporate HR</option><option>Provider</option><option>Admin</option>
</select>
<input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} style={styles.input} />
<input placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} style={styles.input} />
<button style={styles.btn()} onClick={signIn}>Sign in</button>
<button style={styles.btn('secondary')} onClick={demo}>Use demo users</button>
<button style={styles.btn('success')} onClick={register}>Create account</button>
</div>
</div>
)
}


function Search(){
const [filters,setFilters]=useState({q:'',provider:'',mode:'Any',location:'',industry:'',maxPrice:''});
const [list,setList]=useState([]);
useEffect(()=>{ fetchList(); },[]);
const fetchList=async()=>{ const qs = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([,v])=>v))).toString(); const r = await API.get('/api/courses'+(qs?`?${qs}`:'')); setList(r); };
useEffect(()=>{ fetchList(); },[JSON.stringify(filters)]);
const addCompare=id=>{ const cur = JSON.parse(localStorage.getItem('compare')||'[]'); if(cur.includes(id)) return; if(cur.length>=3){ alert('Up to 3'); return; } cur.push(id); localStorage.setItem('compare', JSON.stringify(cur)); };
return (
<div style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:16}}>
<div style={styles.card}>
<h3>Filters</h3>
{['q','provider','location','industry','maxPrice'].map(k=> (
<input key={k} placeholder={k==='q'?'Course name':k} style={{...styles.input, width:'100%'}} value={filters[k]} onChange={e=>setFilters({...filters,[k]:e.target.value})} />
))}
<select style={{...styles.input, width:'100%'}} value={filters.mode} onChange={e=>setFilters({...filters,mode:e.target.value})}>
<option>Any</option><option>Classroom</option><option>Online</option><option>Blended</option>
</select>
<div style={styles.row}>
<button style={styles.btn('secondary')} onClick={()=>setFilters({q:'',provider:'',mode:'Any',location:'',industry:'',maxPrice:''})}>Clear</button>
<a href="#/compare" style={{marginLeft:'auto', color:'#cfe0ff'}}>Go to Compare</a>
</div>
</div>
<div style={styles.card}>
<h3>Results</h3>
{list.map(c=> (
<div key={c.id} style={{...styles.card, marginTop:8}}>
<div style={{display:'flex', justifyContent:'space-between'}}>
<div>
<b>{c.title}</b>
<div style={{color:'#93a0c3'}}>{c.provider_name} · {c.mode} · {c.location} · {c.duration}</div>
</div>
<div>
{c.featured? <span style={{fontSize:11, padding:'3px 8px', border:'1px solid #384a86', borderRadius:999, marginRight:6}}>Featured</span>: null}
<span style={{fontSize:11, padding:'3px 8px', border:'1px solid #384a86', borderRadius:999}}>{c.plan}</span>
</div>
</div>
<div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6}}>
<div style={{color:'#93a0c3'}}>Schedule: {(c.schedule||[]).join(', ')||'-'}</div>
<div style={styles.row}>
<div style={{border:'1px solid #24325e', borderRadius:12, padding:'8px 10px'}}> ${c.price} </div>
<button style={styles.btn('secondary')} onClick={()=>{addCompare(c.id); alert('Added to compare');}}>Compare</button>
<button style={styles.btn()} onClick={async()=>{ await API.post(`/api/courses/${c.id}/click`); await API.post(`/api/courses/${c.id}/enroll`); alert('Enrollment recorded (demo)'); }}>Enroll Now</button>
</div>
</div>
<Reviews courseId={c.id} />
</div>
))}
</div>
</div>
)
}


function Reviews({courseId}){
const [list,setList]=useState([]);
useEffect(()=>{ API.get('/api/reviews/'+courseId).then(setList); },[courseId]);
return (
<div style={{marginTop:8}}>
<div style={{color:'#93a0c3'}}>Reviews: {list.map(r=>`⭐${r.stars} ${r.text}`).join(' • ')||'No reviews yet'}</div>
<button style={{...styles.btn('secondary'), marginTop:6}} onClick={async()=>{
const text = prompt('Review text (optional)'); if(text===null) return;
const stars = Number(prompt('Stars 1-5','5')||5);
await API.post('/api/reviews', {courseId, text, stars});
const fresh = await API.get('/api/reviews/'+courseId); setList(fresh);
}}>Leave review</button>
</div>
)
}


function Compare(){
const [courses,setCourses]=useState([]);
useEffect(()=>{ API.get('/api/courses').then(setCourses); },[]);
const ids = JSON.parse(localStorage.getItem('compare')||'[]');
const pick = c=> ids.includes(c.id);
const rows=['Provider','Mode','Duration','Location','Price','Next schedule'];
return (
<div style={styles.card}>
<h3>Compare Courses</h3>
{ids.length===0? <div style={{color:'#93a0c3'}}>No courses selected.</div> : (
<table style={{width:'100%'}}>
<thead><tr><th>Feature</th>{ids.map(id=> <th key={id}>{(courses.find(c=>c.id===id)||{}).title||id}</th>)}</tr></thead>
<tbody>
{rows.map(r=> (
<tr key={r}>
<td>{r}</td>
{ids.map(id=>{
const c = courses.find(x=>x.id===id) || {};
const v = {
'Provider': c.provider_name,
'Mode': c.mode,
'Duration': c.duration,
'Location': c.location,
'Price': '$'+c.price,
'Next schedule': (c.schedule||[])[0]||'-'
}[r];
return <td key={id+"-"+r}>{v}</td>
})}
</tr>
))}
</tbody>
</table>
)}
<div style={{marginTop:8}}><a href="#/search" style={{color:'#cfe0ff'}}>Back to Search</a></div>
</div>
)
}


function Learner(){
return (
<div style={styles.card}>
<h3>Learner Dashboard</h3>
<p style={{color:'#93a0c3'}}>Enrollments are recorded when you click “Enroll Now” from Search (demo flow). Reviews can be added per course.</p>
</div>
)
}


function HR(){
const [staff,setStaff]=useState([]);
const [assign,setAssign]=useState([]);
const [courses,setCourses]=useState([]);
useEffect(()=>{ API.get('/api/hr/staff').then(setStaff); API.get('/api/hr/assignments').then(setAssign); API.get('/api/courses').then(setCourses); },[]);
const addStaff=async()=>{ const name=prompt('Employee name'); if(!name) return; const email=prompt('Email'); if(!email) return; await API.post('/api/hr/staff',{name,email}); setStaff(await API.get('/api/hr/staff')); };
const addAssign=async(cId)=>{ const sId = prompt('Enter staff ID (see list above)'); if(!sId) return; await API.post('/api/hr/assignments',{courseId:Number(sId)?cId:cId, staffId:Number(sId)}); setAssign(await API.get('/api/hr/assignments')); };
const toggle=async(id)=>{ await API.put(`/api/hr/assignments/${id}/toggle`); setAssign(await API.get('/api/hr/assignments')); };
  

return (
<div>
<div style={styles.card}>
<h3>Staff</h3>
<button style={styles.btn()} onClick={addStaff}>Add Staff</button>
<table style={{width:'100%', marginTop:8}}>
<thead><tr><th>ID</th><th>Name</th><th>Email</th></tr></thead>
<tbody>{staff.map(s=> <tr key={s.id}><td>{s.id}</td><td>{s.name}</td><td>{s.email}</td></tr>)}</tbody>
</table>
</div>
<div style={styles.card}>
<h3>Assign Courses</h3>
{courses.map(c=> (
<div key={c.id} style={{display:'flex', justifyContent:'space-between', marginTop:6}}>
<div><b>{c.title}</b> <span style={{color:'#93a0c3'}}>${c.price} · {c.mode} · {c.location}</span></div>
<button style={styles.btn()} onClick={()=>addAssign(c.id)}>Assign</button>
</div>
))}
</div>
<div style={styles.card}>
<h3>Progress</h3>
<table style={{width:'100%'}}>
<thead><tr><th>ID</th><th>Staff</th><th>Email</th><th>Course</th><th>Status</th><th></th></tr></thead>
<tbody>{assign.map(a=> (
<tr key={a.id}><td>{a.id}</td><td>{a.staff_name}</td><td>{a.staff_email}</td><td>{a.course_title}</td><td>{a.status}</td><td><button style={styles.btn('secondary')} onClick={()=>toggle(a.id)}>Toggle</button></td></tr>
))}</tbody>
</table>
</div>
</div>
)
}


function Provider(){
const [list,setList]=useState([]);
useEffect(()=>{ API.get('/api/provider/courses').then(setList); },[]);
const add=async()=>{
const title=prompt('Course title'); if(!title) return;
const mode=prompt('Mode (Classroom/Online/Blended)','Classroom');
const price=Number(prompt('Price','100')||0);
const location=prompt('Location','Remote');
await API.post('/api/provider/courses',{title,mode,price,location});
setList(await API.get('/api/provider/courses'));
}
const edit=async(id)=>{ const title=prompt('New title'); if(!title) return; await API.put(`/api/provider/courses/${id}`,{title}); setList(await API.get('/api/provider/courses')); }
const del=async(id)=>{ if(!confirm('Delete?')) return; await API.del(`/api/provider/courses/${id}`); setList(await API.get('/api/provider/courses')); }
const addDate=async(id)=>{ const date=prompt('YYYY-MM-DD'); if(!date) return; await API.post(`/api/provider/courses/${id}/schedule`,{date}); setList(await API.get('/api/provider/courses')); }
const plan=async()=>{ const p=prompt('Plan (Free/Featured/Sponsored)','Free'); if(!p) return; await API.put('/api/provider/plan',{plan:p}); alert('Plan updated'); }


const clicksEnrolls=async()=>{ alert('Clicks/Enrolls appear in Admin > Analytics'); }
  

return (
<div>
<div style={styles.card}><h3>Provider Portal</h3>
<button style={styles.btn()} onClick={add}>Add Course</button>
<button style={{...styles.btn('secondary'), marginLeft:8}} onClick={plan}>Change Plan</button>
<button style={{...styles.btn('secondary'), marginLeft:8}} onClick={clicksEnrolls}>Where are my analytics?</button>
</div>
{list.map(c=> (
<div key={c.id} style={{...styles.card, marginTop:8}}>
<div style={{display:'flex', justifyContent:'space-between'}}>
<div><b>{c.title}</b> <span style={{color:'#93a0c3'}}>{c.mode} · ${c.price} · {c.location}</span></div>
<div>
<button style={styles.btn('secondary')} onClick={()=>edit(c.id)}>Edit</button>
<button style={{...styles.btn('danger'), marginLeft:8}} onClick={()=>del(c.id)}>Delete</button>
</div>
</div>
<div style={{marginTop:6, color:'#93a0c3'}}>Schedule: {(c.schedule||[]).join(', ')||'-'}</div>
<button style={{...styles.btn('secondary'), marginTop:6}} onClick={()=>addDate(c.id)}>Add date</button>
</div>
))}
</div>
)
}


function Admin(){
const [providers,setProviders]=useState([]);
const [ads,setAds]=useState([]);
const [analytics,setAnalytics]=useState({clicks:{},enrolls:{},courses:[]});
const refresh=async()=>{
setProviders(await API.get('/api/admin/providers'));
setAds(await API.get('/api/admin/ads'));
setAnalytics(await API.get('/api/analytics'));
};
useEffect(()=>{ refresh(); },[]);
const toggleVerify=async(id)=>{ await API.put(`/api/admin/providers/${id}/verify`); refresh(); }
const addAd=async()=>{ const text=prompt('Ad text'); if(!text) return; await API.post('/api/admin/ads',{text}); refresh(); }
const delAd=async(id)=>{ await API.del('/api/admin/ads/'+id); refresh(); }
return (
<div>
<div style={styles.card}>
<h3>Providers</h3>
<table style={{width:'100%'}}>
<thead><tr><th>ID</th><th>Name</th><th>Verified</th><th>Plan</th><th></th></tr></thead>
<tbody>{providers.map(p=> (
<tr key={p.id}><td>{p.id}</td><td>{p.name}</td><td>{p.verified? 'Yes':'No'}</td><td>{p.plan}</td><td><button style={styles.btn('secondary')} onClick={()=>toggleVerify(p.id)}>{p.verified?'Unverify':'Verify'}</button></td></tr>
))}</tbody>
</table>
</div>
<div style={styles.card}>
<h3>Ads</h3>
<button style={styles.btn()} onClick={addAd}>Create Ad</button>
{ads.map(a=> (
<div key={a.id} style={{display:'flex', justifyContent:'space-between', marginTop:6}}>
<span style={{color:'#93a0c3'}}>{a.text}</span>
<button style={styles.btn('danger')} onClick={()=>delAd(a.id)}>Remove</button>
</div>
))}
</div>
<div style={styles.card}>
<h3>Analytics</h3>
<table style={{width:'100%'}}>
<thead><tr><th>Course</th><th>Clicks</th><th>Enrolls</th></tr></thead>
<tbody>{analytics.courses.map(c=> (
<tr key={c.id}><td>{c.title}</td><td>{analytics.clicks[c.id]||0}</td><td>{analytics.enrolls[c.id]||0}</td></tr>
))}</tbody>
</table>
</div>
</div>
)
}
