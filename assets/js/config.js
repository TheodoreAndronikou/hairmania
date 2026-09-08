/* =============================================================
   HAIR MANIA VALKANIS — ΚΕΝΤΡΙΚΕΣ ΡΥΘΜΙΣΕΙΣ
   Αυτό είναι το ΜΟΝΟ αρχείο που χρειάζεται να αλλάξεις μετά
   την εγκατάσταση. Οδηγίες: docs/ΟΔΗΓΙΕΣ-ΕΓΚΑΤΑΣΤΑΣΗΣ.md
   ============================================================= */

window.CONFIG = {

  /* ---- 1. ΣΥΝΔΕΣΗ ΜΕ ΤΟ BACKEND ------------------------------
     Επικόλλησε εδώ το URL του Google Apps Script Web App.
     Όσο είναι κενό (''), το site τρέχει σε DEMO MODE: δείχνει
     ψεύτικες διαθέσιμες ώρες και δεν κλείνει πραγματικά ραντεβού. */
  API_URL: 'https://script.google.com/macros/s/AKfycbww-iRh5xueCymEjEQL_cha1TYdJlzXON3tTKHKeoks2cVMRSxo0A7-zWKdT0oFRu9a/exec',

  /* ---- 1β. ΘΕΜΑ ΕΜΦΑΝΙΣΗΣ ------------------------------------
     'c' = TICKET       — άσπρο / μαύρο / acid κίτρινο  (ενεργό)
     'a' = EDITORIAL    — χαρτί / μελάνι / κόκκινο-πορτοκαλί
     'b' = WARM ANALOG  — εσπρέσο / κρεμ / φασκόμηλο
     Για γρήγορη σύγκριση χωρίς αλλαγή αρχείου, βάλε στο URL
     ?theme=a  ή  ?theme=b  ή  ?theme=c */
  theme: 'c',

  /* ---- 2. ΕΠΙΧΕΙΡΗΣΗ ---------------------------------------- */
  business: {
    name: 'HAIR MANIA VALKANIS',
    tagline: { el: 'Barber Shop · Γιαννιτσά', en: 'Barber Shop · Giannitsa' },
    phones: ['2382504514', '6981195115'],
    /* Το email ΤΟΥ ΚΑΤΑΣΤΗΜΑΤΟΣ — φαίνεται δημόσια στο site και σε αυτό
       πάνε οι ειδοποιήσεις νέων ραντεβού. Άλλαξέ το στο πραγματικό
       email του μπαρμπέρη όταν το αποκτήσει. */
    email: 'teo20942@gmail.com',
    address: {
      street: 'Στρατηγού Πλαστήρα Νικολάου 35',
      city: 'Γιαννιτσά',
      postcode: '58100',
      country: 'GR'
    },
    mapsQuery: 'Στρατηγού Πλαστήρα Νικολάου 35, Γιαννιτσά 58100',
    social: {
      facebook: 'https://www.facebook.com/theodoros.valkanis.7?locale=el_GR',
      instagram: 'https://www.instagram.com/hairmania_valkanis/',
      tiktok: '' /* βάλε εδώ το κανονικό tiktok.com/@... link όταν το έχεις */
    }
  },

  /* ---- 3. ΩΡΑΡΙΟ --------------------------------------------
     Κλειδί = ημέρα (0 = Κυριακή ... 6 = Σάββατο)
     Κάθε ημέρα έχει λίστα διαστημάτων [από, έως] σε 24ωρη μορφή.
     Κενή λίστα = κλειστά.
     ΠΡΟΣΟΧΗ: αυτό είναι το εφεδρικό / εμφανιζόμενο ωράριο.
     Όταν συνδεθεί το backend, το πραγματικό ωράριο διαβάζεται
     από το Google Sheet ώστε να το αλλάζει ο ιδιοκτήτης μόνος του. */
  hours: {
    0: [],                              /* Κυριακή    — κλειστά      */
    1: [['09:00','15:00'],['17:00','21:00']],  /* Δευτέρα           */
    2: [['17:00','21:00']],             /* Τρίτη      — μόνο απόγευμα */
    3: [['09:00','15:00'],['17:00','21:00']],  /* Τετάρτη           */
    4: [['09:00','15:00'],['17:00','21:00']],  /* Πέμπτη            */
    5: [['09:00','15:00'],['17:00','21:00']],  /* Παρασκευή         */
    6: [['09:00','15:00']]              /* Σάββατο    — μόνο πρωί    */
  },

  /* ---- 4. ΥΠΗΡΕΣΙΕΣ -----------------------------------------
     Εφεδρικές τιμές. Όταν συνδεθεί το backend διαβάζονται από
     το Google Sheet (ο ιδιοκτήτης τις αλλάζει χωρίς κώδικα). */
  services: [
    { id: 'kourema',  el: 'Ανδρικό κούρεμα',        en: "Men's haircut",        min: 30, price: 12 },
    { id: 'combo',    el: 'Κούρεμα & γενειάδα',     en: 'Haircut & beard',      min: 45, price: 18 },
    { id: 'geneiada', el: 'Περιποίηση γενειάδας',   en: 'Beard trim',           min: 20, price: 8  },
    { id: 'paidiko',  el: 'Παιδικό κούρεμα',        en: 'Kids haircut',         min: 30, price: 10 },
    { id: 'ksurisma', el: 'Ξύρισμα με λεπίδα',      en: 'Straight razor shave', min: 30, price: 12 },
    { id: 'styling',  el: 'Χτένισμα / styling',     en: 'Styling',              min: 15, price: 8  }
  ],

  /* ---- 5. ΚΑΝΟΝΕΣ ΚΡΑΤΗΣΕΩΝ --------------------------------- */
  booking: {
    timezone: 'Europe/Athens',
    slotStep: 15,          /* κάθε πόσα λεπτά ξεκινάει νέο slot     */
    leadTimeMinutes: 60,   /* πόσο πριν κλείνει η online κράτηση     */
    daysAhead: 21,         /* πόσες μέρες μπροστά μπορεί να κλείσει  */
    cancelCutoffHours: 2,  /* έως πόσο πριν επιτρέπεται η ακύρωση    */
    reminderHours: [2, 0.5]/* υπενθυμίσεις μέσα στο αρχείο .ics      */
  },

  /* ---- 6. GALLERY -------------------------------------------
     Εφεδρικές φωτογραφίες. Όταν συνδεθεί το backend + φάκελος
     Google Drive, φορτώνονται αυτόματα οι φωτογραφίες του Drive. */
  gallery: [
    { src: 'assets/img/barbershop.jpg', el: 'Το κατάστημα', en: 'The shop' },
    { src: 'assets/img/haircut.jpg',    el: 'Fade',          en: 'Fade' },
    { src: 'assets/img/haircut2.jpg',   el: 'Κούρεμα & γενειάδα', en: 'Haircut & beard' },
    { src: 'assets/img/haircut1.jpg',   el: 'Classic', en: 'Classic' },
    { src: 'assets/img/pomada.jpg',     el: 'Προϊόντα styling', en: 'Styling products' }
  ]
};
