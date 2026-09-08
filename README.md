# HAIR MANIA VALKANIS — ιστοσελίδα & σύστημα ραντεβού

Mobile-first στατικό site με πλήρες σύστημα online κρατήσεων, χωρίς κανένα
κόστος hosting. Ελληνικά / Αγγλικά.

```
site/                    ← ΑΥΤΟ ανεβαίνει στο GitHub Pages (τα περιεχόμενά του, στη ρίζα)
  index.html             Αρχική
  rantevou.html          Κράτηση ραντεβού
  gallery.html           Φωτογραφίες
  epikoinonia.html       Επικοινωνία + χάρτης
  akyrosi.html           Ακύρωση ραντεβού (μέσω συνδέσμου)
  assets/css/style.css   Design system
  assets/js/config.js    ★ ΤΟ ΜΟΝΟ αρχείο που αλλάζεις μετά την εγκατάσταση
  assets/js/i18n.js      Μεταφράσεις ΕΛ/EN
  assets/js/app.js       Κοινός κώδικας (header, ωράριο, γλώσσα, χρόνος)
  assets/js/booking.js   Ο wizard κράτησης
  assets/js/ics.js       Παραγωγή αρχείου ημερολογίου (.ics)
  assets/js/gallery.js   Gallery + lightbox
  assets/js/cancel.js    Σελίδα ακύρωσης
  assets/img/            Λογότυπο & φωτογραφίες

apps-script/Code.gs      Το backend (επικολλάται στο Google Apps Script)
apps-script/appsscript.json  Manifest (ζώνη ώρας, scopes)

docs/ΟΔΗΓΙΕΣ-ΕΓΚΑΤΑΣΤΑΣΗΣ.md  Βήμα-βήμα setup (~20΄)
docs/ΟΔΗΓΟΣ-ΙΔΙΟΚΤΗΤΗ.md      Πώς το χρησιμοποιεί ο κουρέας καθημερινά
docs/ΚΟΣΤΟΛΟΓΙΟ.md            Τι κοστίζει τι

serve.js                 Τοπικός server προεπισκόπησης: `node serve.js`
bundle.mjs               Φτιάχνει ΕΝΑ αυτόνομο html με όλο το site: `node bundle.mjs`
```

## Αρχιτεκτονική

```
Πελάτης (browser)
   │  GET  ?action=slots&date=…      → ελεύθερες ώρες
   │  POST {action:'book', …}        → κράτηση
   ▼
Google Apps Script Web App  ── LockService ──┐
   │                                          │ σειριοποιεί τις κρατήσεις:
   ├── Google Calendar  (πηγή αλήθειας)  ◄────┘ αδύνατο το διπλοκλείσιμο
   ├── Google Sheet     (ωράριο, υπηρεσίες, αρχείο)
   └── Google Drive     (φωτογραφίες gallery)
```

**Πηγή αλήθειας είναι το Ημερολόγιο.** Ό,τι γράφει ο ιδιοκτήτης εκεί —
walk-in, τηλεφωνικό ραντεβού, διακοπές — μπλοκάρει αυτόματα την ώρα online.

### Πώς αποφεύγεται το διπλοκλείσιμο
Το frontend δεν αποφασίζει ποτέ. Στην υποβολή, ο server παίρνει
`LockService.getScriptLock()`, **ξαναελέγχει** το ημερολόγιο μέσα στο
κλείδωμα και μόνο τότε δημιουργεί το συμβάν. Αν στο μεταξύ πιάστηκε η ώρα,
επιστρέφει `SLOT_TAKEN` και το UI ζητά νέα ώρα. Ένα `idem` κλειδί ανά
υποβολή αποτρέπει διπλή κράτηση από διπλό tap ή retry.

### Ακύρωση από τον πελάτη
Κάθε κράτηση παίρνει τυχαίο κωδικό, αποθηκευμένο στην περιγραφή του συμβάντος.
Ο πελάτης παίρνει σύνδεσμο `akyrosi.html?id=…&k=…` (στην οθόνη επιβεβαίωσης,
στο email και μέσα στο `.ics`). Επιτρέπεται έως 2 ώρες πριν.

### Αρχείο .ics
Παράγεται στον browser, ώρες σε **UTC** (καμία εξάρτηση από VTIMEZONE), με
δύο `VALARM` (−2h, −30m). Ανοίγει σε Google, Apple, Samsung, Outlook.

## Θέματα εμφάνισης

Τρία πλήρη θέματα ζουν μαζί. Αλλάζεις με μία λέξη στο `assets/js/config.js`:

```js
theme: 'c',   // 'c' Ticket (ενεργό) | 'a' Editorial | 'b' Warm Analog
```

Για γρήγορη σύγκριση χωρίς αλλαγή αρχείου: `?theme=a`, `?theme=b`, `?theme=c` στο URL.

**Γραμματοσειρές — προσοχή:** κάθε γραμματοσειρά είναι ελεγμένη ότι έχει
ελληνικούς χαρακτήρες. Πολλές δημοφιλείς (Archivo, Space Grotesk, Instrument
Sans, DM Mono, Bricolage Grotesque, Anton, Oswald) **δεν έχουν** — τα ελληνικά
πέφτουν σε fallback serif και το site δείχνει σπασμένο.

**Κεφαλαία:** τα ελληνικά κεφαλαία δεν παίρνουν τόνο (ΔΙΑΛΕΞΕ ΩΡΑ, όχι
ΔΙΆΛΕΞΕ ΩΡΑ). Δεν το αφήνουμε στον browser — το επιβάλλει η `fixGreekCaps()`
στο `app.js`.

## DEMO MODE

Όσο το `API_URL` στο `config.js` είναι κενό, το site τρέχει με ψεύτικες ώρες
και κόκκινη ταινία στην κορυφή — για επίδειξη πριν στηθεί το backend.

## Τοπική προεπισκόπηση

```bash
node serve.js
```
