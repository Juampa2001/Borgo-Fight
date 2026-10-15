// Borgo Fight: impostazioni della versione sito/app.
// 1. Per il gioco online incolla qui sotto la configurazione del tuo progetto Firebase (Impostazioni progetto > Le tue app > Config).
// 2. Per ricevere le segnalazioni di bug e idee scrivi la tua email (si apre il programma di posta di chi segnala).
//    Con Firebase attivo le segnalazioni arrivano anche nella raccolta "feedback" del database.
// 3. Nome, email e data compaiono nelle pagine di privacy e termini d'uso (e l'email serve anche per le segnalazioni).
window.BORGO_CONFIG = {
  platform: 'web',
  version: '1.0',
  ownerName: 'Borgo Fight',        // nome e cognome del titolare, per esempio 'Mario Rossi'
  ownerEmail: '',       // email di contatto, per esempio 'mario@esempio.it'
  legalDate: '15 ottobre 2026',        // data dell'ultimo aggiornamento, per esempio '15 novembre 2026'
  feedbackEmail: '',    // lasciala vuota: usa ownerEmail
  feedbackUrl: '',
  region: 'europe-west1',   // dove girano le funzioni del server (Europa)
  firebase: {
    apiKey: "AIzaSyCQmM6gelLE3CZTX8ssUJ-zozoL_QkamSo",
    authDomain: "borgo-fight.firebaseapp.com",
    projectId: "borgo-fight",
    storageBucket: "borgo-fight.firebasestorage.app",
    messagingSenderId: "985049536393",
    appId: "1:985049536393:web:a904c67addf38faaf93358",
    measurementId: "G-ET6R6XYMMZ"
  }
  // firebase: { apiKey:'...', authDomain:'...', projectId:'...', storageBucket:'...', messagingSenderId:'...', appId:'...' }
};
if(!window.BORGO_CONFIG.feedbackEmail) window.BORGO_CONFIG.feedbackEmail=window.BORGO_CONFIG.ownerEmail||'';
// senza Firebase non c'è gioco online, quindi non serve nessun codice: il pulsante "Versione free" non compare
if(!window.BORGO_CONFIG.firebase) window.BORGO_CONFIG.access={mode:'off',paidOnline:false};
