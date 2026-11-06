// Borgo Fight: collegamento a Firebase per le versioni sito/app.
// Offre al gioco le stesse funzioni che ha su claude.ai (database condiviso e utente), quindi il gioco non va modificato.
(function(){
  const cfg=(window.BORGO_CONFIG||{}).firebase; if(!cfg) return;
  // librerie di Firebase (versione 10.12.2) ospitate nel sito stesso, nella cartella fb/: nessuna richiesta a server esterni per caricarle
  const base=new URL('fb/',(document.currentScript&&document.currentScript.src)||location.href).href;
  const C=window.BORGO_CONFIG||{};
  // antibot: Cloudflare Turnstile (stessa chiave pubblica di Ascensore) e il piccolo server su Cloudflare che consegna il pass di App Check
  const TS_KEY=C.turnstileKey||'0x4AAAAAAFuRIFeJv_bjd4hR', AC_URL=C.appCheckUrl||'https://borgo-appcheck.juampa2001.workers.dev/token';
  let tsLoad=null;
  function loadTs(){ return tsLoad||(tsLoad=new Promise((res,rej)=>{ const sc=document.createElement('script'); sc.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; sc.async=true; sc.onload=()=>res(window.turnstile); sc.onerror=()=>{ tsLoad=null; rej(new Error('turnstile non caricato')); }; document.head.appendChild(sc); })); }
  async function tsToken(){ const ts=await loadTs(); return new Promise((res,rej)=>{
    let box=document.getElementById('bf-ts'); if(!box){ box=document.createElement('div'); box.id='bf-ts'; box.style.cssText='position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:99999'; document.body.appendChild(box); }
    let id=null; const done=()=>{ try{ ts.remove(id); }catch(e){} };
    id=ts.render(box,{sitekey:TS_KEY, appearance:'interaction-only', callback:t=>{ done(); res(t); }, 'error-callback':()=>{ done(); rej(new Error('turnstile')); }, 'timeout-callback':()=>{ done(); rej(new Error('turnstile scaduto')); }}); }); }
  // ogni dato salvato online scade 30 giorni dopo l'ultima modifica: Firebase poi lo cancella da solo (regola TTL sul campo expireAt)
  const KEEP_DAYS=30, EXPIRING=/^(games|profiles|pubkeys|userkeys|feedback|reports)\//;
  let ready=null;
  function init(){ if(ready) return ready; ready=(async()=>{
    const app=await import(base+'firebase-app.js'), fs=await import(base+'firebase-firestore.js'), au=await import(base+'firebase-auth.js'), fn=await import(base+'firebase-functions.js');
    const a=app.initializeApp(cfg);
    // App Check: Google controlla di nascosto che le richieste arrivino dal vero sito del gioco e non da programmi estranei.
    // La chiave è pubblica (Fraud Defense / reCAPTCHA Enterprise, valida solo sul dominio registrato). Va avviato prima del database.
    if(/(^|\.)juampa2001\.github\.io$/.test(location.hostname)){
      try{ const ac=await import(base+'firebase-app-check.js');
        ac.initializeAppCheck(a,{ isTokenAutoRefreshEnabled:true, provider:new ac.CustomProvider({ getToken: async()=>{
          const t=await tsToken();
          const r=await fetch(AC_URL,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({t})});
          if(!r.ok) throw new Error('pass App Check non ricevuto: '+r.status);
          const j=await r.json(); return {token:j.token, expireTimeMillis:j.expireTimeMillis}; } }) }); }
      catch(e){ console.warn('App Check non avviato',e); }
    }
    const db=fs.getFirestore(a), auth=au.getAuth(a), funcs=fn.getFunctions(a, (window.BORGO_CONFIG||{}).region||'europe-west1');
    const user=auth.currentUser || (await au.signInAnonymously(auth)).user;   // accesso anonimo: nessuna registrazione
    return {fs,db,uid:user.uid,fn,funcs};
  })(); return ready; }
  const wrapErr=e=>{ const c=e&&e.code; throw {code: c==='permission-denied'?'invalid_argument': c==='resource-exhausted'?'resource_exhausted':'unavailable', message:String(e&&e.message||e)}; };
  const snap=s=>({id:s.id, exists:s.exists(), data:()=>s.data(), metadata:{}});
  const withExp=(fs,path,d)=>EXPIRING.test(path)&&d&&typeof d==='object'?Object.assign({},d,{expireAt:fs.Timestamp.fromMillis(Date.now()+KEEP_DAYS*864e5)}):d;
  function mkDb({fs,db}){
    const docRef=path=>{ const r=fs.doc(db,path); return { id:r.id, path,
      get:async()=>{ try{ return snap(await fs.getDoc(r)); }catch(e){ wrapErr(e); } },
      set:async d=>{ try{ await fs.setDoc(r,withExp(fs,path,d)); }catch(e){ wrapErr(e); } },
      update:async d=>{ try{ await fs.updateDoc(r,withExp(fs,path,d)); }catch(e){ wrapErr(e); } },
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
