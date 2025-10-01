const API = {
token: null,
setToken(t){ this.token = t; },
async get(path){
const r = await fetch(path, { headers: this.token? {Authorization:`Bearer ${this.token}`} : {} });
if(!r.ok) throw new Error(await r.text());
return r.json();
},
async post(path, body){
const r = await fetch(path, { method:'POST', headers: { 'Content-Type':'application/json', ...(this.token?{Authorization:`Bearer ${this.token}`}:{}) }, body: JSON.stringify(body||{}) });
if(!r.ok) throw new Error(await r.text());
return r.json();
},
async put(path, body){
const r = await fetch(path, { method:'PUT', headers: { 'Content-Type':'application/json', ...(this.token?{Authorization:`Bearer ${this.token}`}:{}) }, body: JSON.stringify(body||{}) });
if(!r.ok) throw new Error(await r.text());
return r.json();
},
async del(path){
const r = await fetch(path, { method:'DELETE', headers: this.token? {Authorization:`Bearer ${this.token}`} : {} });
if(!r.ok) throw new Error(await r.text());
return r.json();
}
}
export default API;
