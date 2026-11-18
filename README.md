# Cassetto Rosso — sito dimostrativo

**Demo online → https://gxmich.github.io/cassetto-rosso-demo/**

> ### ⚠️ Attività di fantasia
>
> **Cassetto Rosso non esiste**, e nemmeno il paese di Vallolmo. Nome, indirizzo, telefono, email, prodotti,
> prezzi e testi sono inventati e servono solo a mostrare come funziona il negozio.
>
> Il telefono è `+39 000 000 0000` e l'email resta su `cassetto-rosso.example`: `.example` è un dominio
> riservato dallo IANA, non registrabile. Tutte le pagine hanno `<meta name="robots" content="noindex, nofollow">`.
> Nessun prodotto è in vendita e nessun ordine viene spedito.

E-commerce di una boutique intima: lingerie, giochi di coppia, accessori e prodotti per il massaggio.
Il percorso d'acquisto è completo ma simulato: carrello, preferiti, checkout in quattro passaggi e
conferma d'ordine restano nel browser.

## Cosa mostra la demo

- **Home** con campagna, scorciatoie "da dove cominci", prodotti in evidenza, due percorsi (intimo e serata
  di relax) e un invito per chi compra per la prima volta.
- **Catalogo** con collezioni, ricerca, filtri per prezzo, materiale, colore e alimentazione, ordinamento.
- **Scheda prodotto** con varianti di colore che cambiano la foto, dettagli tecnici, FAQ, zoom, barra
  d'acquisto fissa su telefono.
- **Carrello e checkout**: quantità, spedizione gratuita sopra una soglia, quattro passaggi con validazione,
  ordine di prova con riferimento `DEMO-*`.
- **Preferiti** salvati nel browser e una pagina per cancellare tutti i dati di prova.
- Pagine di guida, spedizioni, assistenza (modulo che non invia nulla) e condizioni della demo.

## Cosa è simulato

Non c'è un server. Carrello, preferiti e ultimo riepilogo sono nel `localStorage` del browser, senza
nome, indirizzo o email. I dati scritti nei moduli restano in memoria e vengono cancellati alla conferma.
Nessun pagamento, nessuna email, nessuna richiesta verso servizi esterni.

## Tecnologie

- JavaScript in un solo modulo ES (`app.js`), senza framework e senza dipendenze npm
- Routing con l'History API; su GitHub Pages i percorsi diretti passano da `404.html`, che è una copia di
  `index.html`
- CSS del tema base Hummingbird (licenza AFL 3.0 in `assets/parent/LICENSE.md`) più due fogli di stile del
  negozio
- Font locali: Cormorant Garamond e DM Sans (licenza OFL, inclusa); icone Phosphor (licenza MIT, inclusa)
- Foto da Unsplash, elencate in [CREDITI-FOTO.md](CREDITI-FOTO.md)

## Come avviarla

Il sito si aspetta di stare nella sottocartella `/cassetto-rosso-demo/` (vedi i percorsi in `index.html`
e `404.html`; `app.js` ricava la base da solo). In locale:

```bash
mkdir prova && cd prova
git clone https://github.com/GxMich/cassetto-rosso-demo.git
npx serve .        # poi apri http://localhost:3000/cassetto-rosso-demo/
```

Un server statico semplice va bene per la home e per la navigazione interna; per aprire direttamente un
indirizzo come `/cassetto-rosso-demo/prodotto/onda` serve un server che risponda con `404.html` (o
`index.html`) quando il file non esiste, come fa GitHub Pages.

## Struttura

```
index.html, 404.html   guscio della pagina (404.html serve i percorsi diretti su GitHub Pages)
app.js                 rotte, catalogo, filtri, carrello, checkout simulato
home.js                contenuto della home
demo.css               stili delle pagine del negozio e della demo
data/catalog.json      dodici prodotti inventati
assets/css, fonts      stili e font del negozio
assets/parent          CSS del tema base Hummingbird
assets/img, products   foto della home e dei prodotti
```
