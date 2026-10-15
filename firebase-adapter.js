// Borgo Fight: collegamento a Firebase per le versioni sito/app.
// Offre al gioco le stesse funzioni che ha su claude.ai (database condiviso e utente), quindi il gioco non va modificato.
(function(){
  const cfg=(window.BORGO_CONFIG||{}).firebase; if(!cfg) return;
  const V='10.12.2', base='https://www.gstatic.com/firebasejs/'+V+'/';
  let ready=null;
  function init(){ if(ready) return ready; ready=(async()=>{
    const app=await import(base+'firebase-app.js'), fs=await import(base+'firebase-firestore.js'), au=await import(base+'firebase-auth.js'), fn=await import(base+'firebase-functions.js');
    const a=app.initializeApp(cfg), db=fs.getFirestore(a), auth=au.getAuth(a), funcs=fn.getFunctions(a, (window.BORGO_CONFIG||{}).region||'europe-west1');
    const user=auth.currentUser || (await au.signInAnonymously(auth)).user;   // accesso anonimo: nessuna registrazione
    return {fs,db,uid:user.uid,fn,funcs};
  })(); return ready; }
  const wrapErr=e=>{ const c=e&&e.code; throw {code: c==='permission-denied'?'invalid_argument': c==='resource-exhausted'?'resource_exhausted':'unavailable', message:String(e&&e.message||e)}; };
  const snap=s=>({id:s.id, exists:s.exists(), data:()=>s.data(), metadata:{}});
  function mkDb({fs,db}){
    const docRef=path=>{ const r=fs.doc(db,path); return { id:r.id, path,
      get:async()=>{ try{ return snap(await fs.getDoc(r)); }catch(e){ wrapErr(e); } },
      set:async d=>{ try{ await fs.setDoc(r,d); }catch(e){ wrapErr(e); } },
      update:async d=>{ try{ await fs.updateDoc(r,d); }catch(e){ wrapErr(e); } },
      delete:async()=>{ try{ await fs.deleteDoc(r); }catch(e){ wrapErr(e); } },
      onSnapshot:(next,err)=>fs.onSnapshot(r,s=>next(snap(s)),err),
      collection:p=>colRef(path+'/'+p) }; };
    const colRef=(path,cons=[])=>({ path,
      doc:id=>docRef(path+'/'+(id||fs.doc(fs.collection(db,path)).id)),
      orderBy:(f,d)=>colRef(path,[...cons,fs.orderBy(f,d||'asc')]),
      limit:n=>colRef(path,[...cons,fs.limit(n)]),
      where:(f,op,v)=>colRef(path,[...cons,fs.where(f,op,v)]),
      get:async()=>{ const q=await fs.getDocs(fs.query(fs.collection(db,path),...cons)); return {docs:q.docs.map(snap),size:q.size,empty:q.empty}; },
      onSnapshot:(next,err)=>fs.onSnapshot(fs.query(fs.collection(db,path),...cons),q=>next({docs:q.docs.map(snap),size:q.size,empty:q.empty,docChanges:()=>[]}),err) });
    return {doc:docRef, collection:colRef};
  }
  function mkUser({fs,db,uid}){
    return { me:async()=>({id:uid,name:localStorage.getItem('bf-nick')||''}), id:async()=>uid, can:async()=>true, canEdit:()=>true, isOwner:()=>false,
      profiles:async ids=>{ const out={}; for(const id of ids){ try{ const s=await fs.getDoc(fs.doc(db,'profiles/'+id)); out[id]={id,name:s.exists()?(s.data().name||''):''}; }catch(e){ out[id]={id,name:''}; } } return out; } };
  }
  // funzioni sul server (controllo del codice della versione free)
  window.borgoCall=async (name,data)=>{ const F=await init(); const r=await F.fn.httpsCallable(F.funcs,name)(data||{}); return r.data; };
  // la versione free risulta attiva solo se il server ha scritto entitlements/{uid}
  window.borgoEntitled=async ()=>{ try{ const F=await init(); const s=await F.fs.getDoc(F.fs.doc(F.db,'entitlements/'+F.uid)); return s.exists(); }catch(e){ return false; } };
  window.claude={ use: async name=>{ try{ const F=await init(); if(name==='db') return mkDb(F); if(name==='user') return mkUser(F); return null; }catch(e){ console.error('Firebase',e); return null; } } };
})();
