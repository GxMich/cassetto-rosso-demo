import homeTemplate from './home.js';

// Il sito può stare in una sottocartella (GitHub Pages): tutte le rotte sono relative a BASE.
const BASE=new URL('./',import.meta.url).pathname.replace(/\/$/,'');
const P=()=>{const l=location.pathname,p=l.startsWith(BASE)?l.slice(BASE.length):l;return p===''||p==='/index.html'?'/':p;};
const fix=html=>String(html).replace(/(href|src|action|data-ps-image)="\/(?!\/)/g,'$1="'+BASE+'/');
const withBase=url=>url.startsWith('/')&&!url.startsWith(BASE+'/')&&url!==BASE?BASE+url:url;

const app=document.querySelector('[data-ps-ref="pv-app"]');
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const slug=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const money=cents=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(cents/100);
const cents=value=>Math.round(Number(value)*100);
const icon=name=>`<img class="pv-icon" src="/assets/img/icons/${name}.svg" width="24" height="24" alt="" aria-hidden="true">`;
const collection=name=>'/collezione/'+slug(name);
const navNames=['Toys','Coppia','Intimo','Benessere','Bondage'];
const categoryNames=['Tutti i prodotti',...navNames,'Per iniziare','Per due','Relax e benessere'];
const cartKey='cassettorosso:demo:cart:v1',favoriteKey='cassettorosso:demo:favorites:v1',orderKey='cassettorosso:demo:order:v1';
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{notify('Il browser non consente il salvataggio: la selezione resta disponibile in questa pagina.');}};
let products=[];
try{
  const response=await fetch(BASE+'/data/catalog.json');
  if(!response.ok) throw Error('Catalogo non disponibile');
  products=await response.json();
}catch{
  app.innerHTML='<main class="pv-container pv-text-page"><h1>Un momento di attesa.</h1><p>Non siamo riusciti a caricare la selezione.</p><button class="pv-button pv-button--dark" data-ps-action="reload">Riprova</button></main>';
  document.addEventListener('click',event=>{if(event.target.closest('[data-ps-action="reload"]')) location.reload();});
  throw Error('Caricamento catalogo fallito');
}
const find=id=>products.find(product=>product.id===Number(id));
const productUrl=product=>'/prodotto/'+product.slug;
const variation=(product,id)=>product.variants.find(item=>item.source_id===Number(id))||product.variants[0]||null;
const validCart=value=>Array.isArray(value)?value.filter(item=>find(item.id)&&Number.isInteger(item.qty)&&item.qty>=1&&item.qty<=12&&(!find(item.id).variants.length||find(item.id).variants.some(v=>v.source_id===Number(item.variant)))).slice(0,30):[];
let cart=validCart(read(cartKey,[]));
let favorites=read(favoriteKey,[]);
favorites=Array.isArray(favorites)?[...new Set(favorites.map(Number))].filter(id=>find(id)):[];
let lastOrder=read(orderKey,null),checkoutStep=1,checkoutValues={},lastFocus=null,toastTimer;
const selectedVariants=new Map();
const qtyTotal=()=>cart.reduce((total,item)=>total+item.qty,0);
const itemPrice=item=>{const product=find(item.id);return cents(variation(product,item.variant)?.price??product.price);};
const subtotal=()=>cart.reduce((total,item)=>total+itemPrice(item)*item.qty,0);
const shipping=()=>subtotal()>=2990||!cart.length?0:800;
const total=()=>subtotal()+shipping();
const logo=(light=false)=>`<a class="pv-logo pv-logo--text${light?' pv-logo--light':''}" href="/" aria-label="Cassetto Rosso, homepage">Cassetto<span>Rosso</span></a>`;
const isCheckout=()=>P()==='/checkout';

function header(){
  return `<header class="pv-site-header"><div class="pv-announcement">Spedizione gratuita da 29,90 € <span aria-hidden="true">·</span> Pacco sempre anonimo</div><div class="pv-header${isCheckout()?' pv-header--checkout':''}"><div class="pv-header__main pv-container">
    ${isCheckout()?'':`<button class="pv-icon-button pv-header__menu" aria-label="Apri menu" aria-expanded="false" aria-controls="pv-navigation" data-ps-action="menu">${icon('list')}</button>`}${logo()}
    ${isCheckout()?`<span class="pv-checkout-note">${icon('lock-key')} Il tuo ordine di prova, in tutta tranquillità.</span>`:`<nav class="pv-nav" id="pv-navigation" aria-label="Categorie principali" data-ps-ref="pv-navigation"><span class="pv-nav__intro">Che cosa ti va?</span>${navNames.map(name=>`<a class="pv-nav__link" href="${collection(name)}"${P()===collection(name)?' aria-current="page"':''}>${name}</a>`).join('')}<a class="pv-nav__guide" href="/guida">La prima volta? Cominciamo da qui. ${icon('arrow-right')}</a></nav><div class="pv-header__actions"><button class="pv-icon-button pv-header__action" aria-label="Apri ricerca" aria-expanded="false" aria-controls="pv-search-panel" aria-haspopup="dialog" data-ps-action="search">${icon('magnifying-glass')}<span>Cerca</span></button><button class="pv-icon-button" aria-label="I tuoi preferiti" title="I tuoi preferiti" data-ps-action="favorites">${icon('heart')}<span class="pv-count" data-ps-target="pv-favorite-count"${favorites.length?'':' hidden'}>${favorites.length}</span></button><a class="pv-icon-button pv-header__action" href="/carrello" aria-label="Carrello">${icon('handbag')}<span>Carrello</span><span class="pv-count" data-ps-target="pv-cart-count"${qtyTotal()?'':' hidden'}>${qtyTotal()}</span></a></div>`}
    </div></div></header>${isCheckout()?'':`<dialog class="pv-search-panel" id="pv-search-panel" data-ps-ref="pv-search-panel" aria-labelledby="pv-search-title"><div class="pv-search-panel__heading"><h2 id="pv-search-title">Cerca nel catalogo</h2><button class="pv-icon-button" type="button" aria-label="Chiudi ricerca" data-ps-action="close-search">${icon('x')}</button></div><form class="pv-search" role="search" action="/ricerca" data-ps-form="search"><label class="visually-hidden" for="pv-search">Cerca nel catalogo</label><input id="pv-search" name="q" type="search" placeholder="Cosa ti va di scoprire?" value="${esc(new URLSearchParams(location.search).get('q')||'')}" data-ps-ref="pv-search-input" required autofocus><button class="pv-icon-button" aria-label="Cerca">${icon('arrow-right')}</button></form></dialog>`}`;
}

function footer(){return `<footer id="footer" class="footer"><div class="pv-footer pv-container"><div class="pv-footer__brand">${logo(true)}<p>Quello che tieni nel cassetto.</p><span>Lingerie, giochi e piccoli rituali, spediti in un pacco neutro.</span></div><div><h2>Il tuo mondo</h2>${navNames.map(name=>`<a href="${collection(name)}">${name}</a>`).join('')}<a href="/guida">Per cominciare</a></div><div><h2>Al tuo fianco</h2><a href="/assistenza">Contattaci</a><a href="/account">Il tuo account</a><a href="/spedizioni">Spedizioni e discrezione</a><a href="/condizioni">Condizioni della demo</a></div><div class="pv-footer__demo"><h2>La discrezione, sempre.</h2><p>Un pacco anonimo.<br>Un momento tutto tuo.</p><p class="pv-footer__small">Demo online: gli ordini di prova non comportano addebiti né spedizioni.</p></div></div><div class="pv-footer__bottom pv-container"><span>Cassetto Rosso · Via delle Rose 7, Vallolmo (Piemonte) · +39 000 000 0000 · info@cassetto-rosso.example</span><span>Boutique di fantasia</span></div><p class="pv-footer__fantasy pv-container">Attività di fantasia: nomi, recapiti, prezzi e recensioni sono inventati. Sito dimostrativo realizzato da <a href="https://www.modicamichele.it">Michele Modica</a>.</p><div hidden></div></footer>`;}
const favoriteButton=product=>`<button class="pv-product__favorite pv-icon-button" aria-label="${favorites.includes(product.id)?'Rimuovi':'Salva'} ${esc(product.name)} ${favorites.includes(product.id)?'dai':'nei'} preferiti" aria-pressed="${favorites.includes(product.id)}" data-ps-action="favorite" data-ps-product-id="${product.id}">${icon('heart')}</button>`;
function card(product){return `<article class="pv-product"><div class="pv-product__visual"><a class="pv-product__image-link" href="${productUrl(product)}" tabindex="-1" aria-hidden="true"><img src="${product.images[0]}" alt="${esc(product.name)}" width="800" height="800" loading="lazy"></a>${favoriteButton(product)}<div class="pv-product__quick-add">${product.variants.length?`<a class="pv-product__add" href="${productUrl(product)}">Scegli il colore ${icon('arrow-right')}</a>`:`<button class="pv-product__add" data-ps-action="add" data-ps-product-id="${product.id}" aria-label="Aggiungi ${esc(product.name)} al carrello">Aggiungi al carrello ${icon('plus')}</button>`}</div></div><span class="pv-product__category">${esc(product.primary_category)}</span><h3 class="pv-product__name"><a href="${productUrl(product)}">${esc(product.name)}</a></h3><div class="pv-product__price">${money(cents(product.price))}</div></article>`;}
const crumb=label=>`<nav class="pv-breadcrumb" aria-label="Percorso di navigazione"><div class="pv-page-container"><a href="/">Home</a><span aria-hidden="true">/</span><span>${esc(label)}</span></div></nav>`;
function dialog(name,title,body,extra=''){return `<dialog class="pv-dialog ${extra}" aria-labelledby="pv-${name}-title" data-ps-ref="pv-${name}"><div class="pv-dialog__header"><h2 id="pv-${name}-title">${title}</h2><button class="pv-icon-button" aria-label="Chiudi ${name==='favorites'?'preferiti':name==='filters'?'filtri':'pannello'}" data-ps-action="close" data-ps-dialog="${name}">${icon('x')}</button></div>${body}</dialog>`;}
function favoritesContent(){return favorites.length?favorites.map(id=>{const product=find(id);return `<article class="pv-dialog__item"><img src="${product.images[0]}" width="75" height="75" alt=""><div><a href="${productUrl(product)}">${esc(product.name)}</a><p>${money(cents(product.price))}</p></div><button class="pv-dialog__remove" data-ps-action="favorite" data-ps-product-id="${id}" aria-label="Rimuovi ${esc(product.name)} dai preferiti">Rimuovi</button></article>`;}).join(''):'<p>Qualcosa ti incuriosisce? Tocca il cuore su un prodotto per ritrovarlo qui.</p>';}
function modals(){return dialog('favorites','I tuoi desideri',`<div data-ps-target="pv-favorites-list">${favoritesContent()}</div><p class="pv-dialog__note">La tua selezione resta salvata su questo browser.</p>`)+dialog('cart-modal','Il tuo desiderio è nel carrello.','<div data-ps-target="pv-cart-modal-content"></div>')+'<div class="pv-toast" role="status" aria-live="polite" data-ps-target="pv-toast" hidden></div>';}

function catalog(){
  const query=new URLSearchParams(location.search),category=categoryNames.find(name=>slug(name)===P().split('/')[2])||'Tutti i prodotti';
  const search=P()==='/ricerca'?query.get('q')||'':'';
  const available=products.filter(product=>(category==='Tutti i prodotti'||product.primary_category===category||product.categories.includes(category))&&(!search||slug(product.name+' '+product.short_description).includes(slug(search))));
  const filtered=available.filter(product=>(!query.get('material')||product.specifications.Materiale===query.get('material'))&&(!query.get('color')||product.colors.includes(query.get('color')))&&(!query.get('power')||product.specifications.Alimentazione===query.get('power'))&&(!query.get('min')||cents(product.price)>=cents(query.get('min')))&&(!query.get('max')||cents(product.price)<=cents(query.get('max'))));
  if(query.get('sort')==='price-asc') filtered.sort((a,b)=>a.price-b.price);
  if(query.get('sort')==='price-desc') filtered.sort((a,b)=>b.price-a.price);
  if(query.get('sort')==='name') filtered.sort((a,b)=>a.name.localeCompare(b.name,'it'));
  const options=(values,selected)=>'<option value="">Tutti</option>'+[...new Set(values.filter(Boolean))].sort().map(value=>`<option${selected===value?' selected':''} value="${esc(value)}">${esc(value)}</option>`).join('');
  const sidebar=`<aside id="left-column" class="pv-catalog-sidebar" data-ps-ref="pv-catalog-sidebar"><nav class="pv-categories" aria-label="Collezioni"><h2>Collezioni</h2>${categoryNames.map(name=>`<a href="${collection(name)}"${name===category?' aria-current="page"':''}>${name}</a>`).join('')}</nav><form id="pv-filters-form" data-ps-form="filters"><h2>Filtra per</h2><details open><summary>Prezzo</summary><div class="pv-price-filter__fields"><label>Da (€)<input class="form-control" type="number" name="min" min="0" max="200" step="0.01" value="${esc(query.get('min')||'')}" placeholder="0"></label><label>A (€)<input class="form-control" type="number" name="max" min="0" max="200" step="0.01" value="${esc(query.get('max')||'')}" placeholder="200"></label></div></details><label class="pv-filter-label">Materiale<select class="form-select" name="material">${options(available.map(p=>p.specifications.Materiale),query.get('material'))}</select></label><label class="pv-filter-label">Colore<select class="form-select" name="color">${options(available.flatMap(p=>p.colors),query.get('color'))}</select></label><label class="pv-filter-label">Alimentazione<select class="form-select" name="power">${options(available.map(p=>p.specifications.Alimentazione),query.get('power'))}</select></label><p class="pv-form-error" data-ps-target="pv-filter-error" role="status"></p><button class="btn btn-outline-primary pv-filter-submit" type="submit">Applica filtri</button><a class="pv-clear-filters" href="${P()}${search?'?q='+encodeURIComponent(search):''}">Rimuovi filtri</a></form></aside>`;
  const title=search?`Risultati per “${search}”`:category;
  const description=category==='Tutti i prodotti'?'Dodici prodotti, scelti uno per uno. Tutti inventati per questa demo.':category==='Coppia'||category==='Per due'?'Complicità, attesa, nuovi rituali. Una selezione da vivere insieme.':category==='Intimo'?'Dettagli che raccontano il tuo desiderio, prima ancora delle parole.':'Il tuo momento, a modo tuo. Segui la tua curiosità.';
  return crumb(search?'Ricerca':category)+`<main id="main-content" class="pv-page-container pv-catalog-layout">${sidebar}<section><p class="pv-eyebrow">La selezione Cassetto Rosso</p><h1 class="page-title-section">${esc(title)}</h1><p class="pv-catalog-intro">${search?'Trova il tuo prossimo desiderio.':description}</p><button class="pv-catalog-filter btn btn-outline-primary" data-ps-action="filters" aria-haspopup="dialog">${icon('list')} Filtri e categorie</button>${dialog('filters','Segui la tua curiosità','<div data-ps-target="pv-sidebar-mobile"></div><button class="pv-button pv-button--dark pv-filter-dialog__apply" form="pv-filters-form" type="submit">Mostra i prodotti '+icon('arrow-right')+'</button>','pv-filter-dialog')}<div class="pv-catalog-toolbar"><span role="status">${filtered.length} ${filtered.length===1?'prodotto':'prodotti'}</span><label>Ordina per<select class="form-select" aria-label="Cambia ordinamento" data-ps-ref="pv-sort">${[['','Rilevanza'],['price-asc','Prezzo crescente'],['price-desc','Prezzo decrescente'],['name','Nome A–Z']].map(([value,label])=>`<option value="${value}"${(query.get('sort')||'')===value?' selected':''}>${label}</option>`).join('')}</select></label></div>${filtered.length?`<div class="products">${filtered.map(card).join('')}</div>`:`<div class="pv-empty"><h2>Nessun prodotto con questa selezione.</h2><p>Prova un altro termine o rimuovi qualche filtro.</p><a class="pv-button pv-button--dark" href="${collection('Tutti i prodotti')}">Esplora tutti i prodotti ${icon('arrow-right')}</a></div>`}</section></main>`;
}

function productPage(product){
  const selected=variation(product,selectedVariants.get(product.id));
  const images=selected?[selected.image]:product.images;
  const price=cents(selected?.price??product.price);
  return crumb(product.name)+`<main id="main-content" class="pv-page-container pv-product-page"><div class="product__container"><div class="product__left"><button class="pv-detail-photo" data-ps-action="zoom" aria-label="Ingrandisci foto ${esc(product.name)}"><img src="${images[0]}" alt="${esc(product.name)}" width="720" height="720" fetchpriority="high" data-ps-ref="pv-product-image">${icon('magnifying-glass')}</button><div class="pv-detail-thumbs">${images.map((image,index)=>`<button data-ps-action="thumbnail" data-ps-image="${image}" aria-label="Foto prodotto ${index+1}"><img src="${image}" alt="" width="64" height="64"></button>`).join('')}</div></div><div class="product__right" data-ps-ref="product-right"><p class="pv-eyebrow pv-product-kicker">${esc(product.headline)}</p><h1 class="product__name">${esc(product.name)}</h1><div class="product__price" data-ps-target="pv-live-price">${money(price)}</div><p class="pv-tax-note">Tasse incluse</p><p class="product__description-short">${esc(product.short_description)}</p><dl class="pv-quick-details">${Object.entries(product.specifications).slice(0,3).map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>${selected?`<label class="pv-variant-label">Colore<select class="form-select" name="colore" data-ps-ref="pv-variant" data-ps-product-id="${product.id}">${product.variants.map(variant=>`<option value="${variant.source_id}"${variant.source_id===selected.source_id?' selected':''}>${esc(variant.attributes.Colore)}</option>`).join('')}</select></label>`:''}<div class="pv-buy-row"><label class="visually-hidden" for="pv-qty">Quantità</label><input class="form-control" id="pv-qty" type="number" min="1" max="12" value="1" data-ps-ref="pv-qty" inputmode="numeric"><button class="pv-button pv-button--dark" data-ps-action="add" data-ps-product-id="${product.id}" aria-label="Aggiungi al carrello ${esc(product.name)}">Aggiungi al carrello ${icon('plus')}</button></div><button class="pv-save-product" data-ps-action="favorite" data-ps-product-id="${product.id}" aria-pressed="${favorites.includes(product.id)}">${icon('heart')} ${favorites.includes(product.id)?'Salvato nei preferiti':'Salva nei preferiti'}</button><div class="pv-product-reassurance"><p>${icon('package')} Pacco neutro, senza riferimenti al contenuto.</p><p>${icon('headset')} Una domanda? <a href="/assistenza">Parliamone.</a></p><p class="pv-product-reassurance__note">Demo online: nessun addebito o spedizione.</p></div></div></div><section class="pv-product-info"><div class="product__description"><h2>${esc(product.headline)}</h2><p>${esc(product.short_description)}</p><h3>I dettagli che contano</h3><table><tbody>${Object.entries(product.specifications).map(([label,value])=>`<tr><th scope="row">${esc(label)}</th><td>${esc(value)}</td></tr>`).join('')}</tbody></table><p>Per utilizzo e manutenzione, segui le indicazioni riportate sulla confezione del prodotto.</p></div><div class="pv-product-faq"><h2>Prima di lasciarti tentare.</h2><details><summary>Come scelgo il prodotto giusto per me?</summary><p>Confronta materiali, dimensioni e caratteristiche. Se è la tua prima volta, <a href="/guida">lasciati guidare dalla curiosità</a>.</p></details><details><summary>Come si usa e si pulisce?</summary><p>Segui sempre le istruzioni del produttore sulla confezione, anche per ricarica e manutenzione.</p></details><details><summary>Quanto costa la spedizione nella demo?</summary><p>8 € IVA inclusa, gratuita da 29,90 €. Nessun prodotto viene spedito e nessun pagamento viene richiesto.</p></details></div></section><section class="pv-related"><div class="pv-section-heading"><h2>Un altro desiderio?</h2></div><div class="pv-product-grid">${products.filter(item=>item.id!==product.id&&item.primary_category===product.primary_category).slice(0,4).map(card).join('')}</div></section><div class="pv-sticky-buy" aria-label="Acquista questo prodotto"><div><span class="pv-sticky-buy__label">Il tuo desiderio</span><strong data-ps-target="pv-sticky-price">${money(price)}</strong></div><button class="pv-button pv-button--dark" data-ps-action="add" data-ps-product-id="${product.id}">Aggiungi al carrello ${icon('plus')}</button></div></main>${dialog('zoom','Un dettaglio da vicino.',`<img class="pv-zoom-image" src="${images[0]}" alt="${esc(product.name)}" data-ps-ref="pv-zoom-image">`,'pv-zoom-dialog')}`;
}

function orderSummary(){return `<aside class="pv-order-summary"><h2>Riepilogo dell’ordine</h2><p>${qtyTotal()} ${qtyTotal()===1?'articolo':'articoli'}</p><dl><div><dt>Prodotti</dt><dd>${money(subtotal())}</dd></div><div><dt>Spedizione</dt><dd>${shipping()?money(shipping()):'Gratuita'}</dd></div><div class="pv-order-total"><dt>Totale <small>(IVA inclusa)</small></dt><dd>${money(total())}</dd></div></dl><p class="pv-demo-note">Ordine dimostrativo: nessun addebito o spedizione.</p></aside>`;}
function cartPage(){return crumb('Carrello')+`<main id="main-content" class="pv-page-container pv-shop-page"><h1 class="page-title-section">I tuoi desideri.</h1>${cart.length?`<div class="pv-cart-layout"><section aria-label="Prodotti nel carrello">${cart.map(item=>{const product=find(item.id),variant=variation(product,item.variant);return `<article class="pv-cart-item"><a href="${productUrl(product)}"><img src="${variant?.image||product.images[0]}" alt="${esc(product.name)}" width="140" height="140"></a><div><h2><a href="${productUrl(product)}">${esc(product.name)}</a></h2>${variant?`<p>Colore: ${esc(variant.attributes.Colore)}</p>`:''}<p>${money(itemPrice(item))}</p><div class="pv-quantity"><button class="pv-icon-button" data-ps-action="quantity" data-ps-product-id="${item.id}" data-ps-variant="${item.variant||0}" data-ps-delta="-1" aria-label="Diminuisci quantità di ${esc(product.name)}"${item.qty===1?' disabled':''}>${icon('minus')}</button><span aria-label="Quantità">${item.qty}</span><button class="pv-icon-button" data-ps-action="quantity" data-ps-product-id="${item.id}" data-ps-variant="${item.variant||0}" data-ps-delta="1" aria-label="Aumenta quantità di ${esc(product.name)}"${item.qty>=12?' disabled':''}>${icon('plus')}</button></div><button class="pv-remove" data-ps-action="remove" data-ps-product-id="${item.id}" data-ps-variant="${item.variant||0}" aria-label="Rimuovi ${esc(product.name)} dal carrello">Rimuovi</button></div><strong>${money(itemPrice(item)*item.qty)}</strong></article>`;}).join('')}<a class="pv-text-link" href="${collection('Tutti i prodotti')}">Continua a esplorare ${icon('arrow-right')}</a></section><div>${orderSummary()}<a class="pv-button pv-button--dark pv-checkout-link" href="/checkout">Procedi con il checkout ${icon('arrow-right')}</a></div></div>`:`<div class="pv-empty"><h2>Il prossimo desiderio ti aspetta.</h2><p>Il tuo carrello è ancora vuoto.</p><a class="pv-button pv-button--dark" href="${collection('Tutti i prodotti')}">Esplora la selezione ${icon('arrow-right')}</a></div>`}</main>`;}

const input=(name,label,type='text',extra='')=>`<label class="pv-field">${label}<input class="form-control" name="${name}" type="${type}" value="${esc(checkoutValues[name]||'')}" ${extra} required></label>`;
function checkout(){
  if(!cart.length) return cartPage();
  const steps=['Informazioni personali','Indirizzi','Spedizione','Pagamento'];
  let fields='';
  if(checkoutStep===1) fields=`<p class="pv-demo-note">Questa è una demo. Usa solo dati inventati: non vengono inviati o conservati sul server.</p>${input('firstname','Nome','text','autocomplete="off"')}${input('lastname','Cognome','text','autocomplete="off"')}${input('email','E-mail','email','autocomplete="off"')}<label class="pv-checkbox"><input type="checkbox" name="demo-consent" required> Ho capito che è una demo e userò dati inventati.</label>`;
  if(checkoutStep===2) fields=`${input('address','Indirizzo','text','autocomplete="off"')}${input('postcode','Codice postale','text','pattern="[0-9]{5}" inputmode="numeric" maxlength="5"')}${input('city','Città')}${input('province','Provincia')}<p>Paese: Italia</p>`;
  if(checkoutStep===3) fields=`<label class="pv-shipping-option"><input type="radio" name="shipping" value="demo" required checked><span><strong>Consegna discreta</strong><br>Consegna dimostrativa · pacco anonimo</span><strong>${shipping()?money(shipping()):'Gratuita'}</strong></label><p class="pv-demo-note">Nessun prodotto verrà realmente spedito.</p>`;
  if(checkoutStep===4) fields=`<label class="pv-checkbox"><input type="radio" name="payment" value="demo" checked required> Ordine di prova — nessun addebito</label><p>La prova termina con una conferma su questo browser. Nessun pagamento, spedizione o invio email.</p><label class="pv-checkbox"><input type="checkbox" name="terms" required> Accetto le <a href="/condizioni" target="_blank" rel="noopener">condizioni della demo</a>.</label>`;
  return `<nav class="pv-checkout-steps" aria-label="Avanzamento checkout">${steps.map((title,index)=>`<span${checkoutStep===index+1?' aria-current="step"':''}><b>${index+1}</b>${title}</span>`).join('')}</nav><main id="main-content" class="pv-page-container pv-shop-page"><div class="pv-cart-layout"><section><h1 class="page-title-section">${steps[checkoutStep-1]}</h1><form class="pv-checkout-form" data-ps-form="checkout">${fields}<div class="pv-checkout-actions">${checkoutStep>1?'<button class="btn btn-outline-primary" type="button" data-ps-action="checkout-back">Indietro</button>':'<a href="/carrello">Torna al carrello</a>'}<button class="pv-button pv-button--dark" type="submit">${checkoutStep===4?'Conferma ordine':'Continua'} ${icon('arrow-right')}</button></div></form></section>${orderSummary()}</div></main>`;
}

function confirmation(){
  if(!lastOrder?.reference) return textPage('Una prova da vivere.','<p>Non ci sono ancora ordini di prova su questo browser.</p><a class="pv-button pv-button--dark" href="'+collection('Tutti i prodotti')+'">Esplora la selezione</a>');
  return textPage('Ordine di prova confermato',`<p class="pv-confirmation-message">La prova è completata. Nessun addebito, spedizione o invio email.</p><p>Riferimento: <strong>${esc(lastOrder.reference)}</strong></p><ul class="pv-confirmation-list">${lastOrder.items.map(item=>`<li>${esc(item.name)}${item.color?' · '+esc(item.color):''} × ${item.qty}<span>${money(item.unitPrice*item.qty)}</span></li>`).join('')}</ul><p>Spedizione di prova: ${lastOrder.shipping?money(lastOrder.shipping):'gratuita'}</p><p class="pv-confirmation-total">Totale: ${money(lastOrder.total)}</p><p class="pv-demo-note">Il riepilogo di prova è salvato solo su questo browser, senza dati personali.</p><a class="pv-button pv-button--dark" href="/">Torna a Cassetto Rosso ${icon('arrow-right')}</a>`);
}
const textPage=(title,body)=>crumb(title)+`<main id="main-content" class="pv-page-container pv-text-page"><h1 class="page-title-section">${title}</h1><div class="rich-text">${body}</div></main>`;
function contentPage(){
  if(P()==='/guida') return textPage('Il tuo primo desiderio','<h2>Il desiderio comincia dalla curiosità.</h2><p>Non serve avere già tutte le risposte. Parti da una sensazione, da un dettaglio che ti incuriosisce, dal tempo che vuoi dedicarti.</p><h2>Un momento per te</h2><p>Confronta dimensioni, materiali, alimentazione e caratteristiche del prodotto. Un formato compatto può essere un punto di partenza; la scelta resta personale.</p><h2>Un momento da condividere</h2><p>Parlate di ciò che vi piace e di ciò che preferite evitare. Un accessorio, un gioco o un rituale possono diventare un’occasione per conoscersi meglio, senza fretta e senza aspettative.</p><h2>I dettagli contano</h2><p>Leggi la scheda, verifica la composizione e consulta sempre le istruzioni sulla confezione per uso, pulizia e manutenzione.</p><a class="pv-text-link" href="'+collection('Per iniziare')+'">Scopri la selezione per iniziare '+icon('arrow-right')+'</a>');
  if(P()==='/spedizioni') return textPage('Spedizioni e discrezione','<h2>Un pacco discreto, sempre.</h2><p>La demo presenta una spedizione da 8 € IVA inclusa, gratuita da 29,90 €. Il pacco previsto è neutro, senza riferimenti al contenuto.</p><p>Questa è una presentazione dimostrativa: nessun ordine viene realmente spedito.</p>');
  if(P()==='/condizioni') return textPage('Condizioni della demo','<p>Cassetto Rosso è una boutique di fantasia: questo sito è una demo realizzata per presentare il design e il percorso di acquisto. Non è un negozio operativo e nessuno dei prodotti esiste.</p><p>Gli ordini di prova non comportano addebiti, email o spedizioni. Non inserire dati reali o carte di pagamento: usa esclusivamente informazioni inventate.</p><p>Carrello, preferiti e ultimo riepilogo di prova sono memorizzati nel browser. I dati digitati nei moduli non vengono inviati a un server e non sono inclusi nel riepilogo salvato. Puoi cancellare questi dati con il pulsante qui sotto o dalle impostazioni del browser.</p><p>Nomi, descrizioni e prezzi dei prodotti sono inventati. Le fotografie provengono da Unsplash e sono usate solo a scopo illustrativo.</p><button class="btn btn-outline-primary" data-ps-action="clear-demo">Cancella i dati di prova di questo browser</button>');
  if(P()==='/account') return textPage('Il tuo spazio.',`<p>Per esplorare questa demo non serve creare un account. Puoi salvare i preferiti e completare un acquisto come ospite, usando dati inventati.</p>${lastOrder?`<h2>La tua ultima prova</h2><p>${esc(lastOrder.reference)} · ${money(lastOrder.total)}</p><a class="pv-text-link" href="/conferma-ordine">Rivedi il riepilogo ${icon('arrow-right')}</a>`:'<p>Il tuo primo desiderio ti aspetta.</p>'}<p><button class="pv-button pv-button--dark" data-ps-action="favorites">I tuoi preferiti ${icon('heart')}</button></p>`);
  if(P()==='/assistenza') return textPage('Una domanda? Parliamone.',`<p>Puoi provare il modulo con dati inventati. In questa demo nessun messaggio viene inviato.</p><form class="pv-contact-form" data-ps-form="contact">${input('contact-name','Nome')}${input('contact-email','E-mail','email')}<label class="pv-field">Il tuo messaggio<textarea class="form-control" name="message" rows="5" required></textarea></label><button class="pv-button pv-button--dark" type="submit">Prova l’invio ${icon('arrow-right')}</button><p data-ps-target="pv-contact-result" role="status"></p></form>`);
  return textPage('Un desiderio ancora da scoprire.','<p>Questa pagina non è disponibile. Esplora la selezione Cassetto Rosso.</p><a class="pv-button pv-button--dark" href="/">Torna alla homepage</a>');
}

function render(keepScroll=false){
  const y=scrollY,path=P();
  let content,title='Cassetto Rosso — Boutique intima (demo)',page='index';
  if(path==='/') content='<main id="main-content">'+homeTemplate.replace('<!-- PV_FEATURED -->',[101,108,107,111].map(id=>card(find(id))).filter(Boolean).join(''))+'</main>';
  else if(path.startsWith('/collezione/')||path==='/ricerca'){content=catalog();page='category';title='La selezione | Cassetto Rosso';}
  else if(path.startsWith('/prodotto/')){const product=products.find(item=>item.slug===path.split('/')[2]);content=product?productPage(product):contentPage();page='product';title=(product?.name||'Prodotto')+' | Cassetto Rosso';}
  else if(path==='/carrello'){content=cartPage();page='cart';title='I tuoi desideri | Cassetto Rosso';}
  else if(path==='/checkout'){content=checkout();page='checkout';title='Ordine di prova | Cassetto Rosso';}
  else if(path==='/conferma-ordine'){content=confirmation();page='order-confirmation';title='Prova completata | Cassetto Rosso';}
  else{content=contentPage();page='cms';title='Il tuo mondo | Cassetto Rosso';}
  document.body.id=page;document.title=title;
  app.innerHTML=fix(header()+content+footer()+modals());
  app.querySelectorAll('dialog').forEach(panel=>{
    panel.addEventListener('close',()=>{if(!panel.isConnected)return;if(panel.dataset.psRef==='pv-search-panel')setSearch(false);else if(lastFocus?.isConnected)lastFocus.focus();});
    if(panel.dataset.psRef==='pv-search-panel')panel.addEventListener('click',event=>{if(event.target!==panel)return;const box=panel.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)setSearch(false);});
  });
  placeSidebar();
  if(keepScroll) scrollTo(0,y);else scrollTo(0,0);
}
function navigate(url){history.pushState({},'',withBase(url));render();document.querySelector('main')?.setAttribute('tabindex','-1');document.querySelector('main')?.focus({preventScroll:true});}
function notify(message){const toast=document.querySelector('[data-ps-target="pv-toast"]');if(!toast)return;clearTimeout(toastTimer);toast.textContent=message;toast.hidden=false;toastTimer=setTimeout(()=>{toast.hidden=true;},2800);}
function openDialog(name){const panel=document.querySelector(`[data-ps-ref="pv-${name}"]`);if(!panel)return;lastFocus=document.activeElement;panel.showModal();}
function closeDialog(name){document.querySelector(`[data-ps-ref="pv-${name}"]`)?.close();}
function syncBadges(){for(const [target,count] of [['pv-cart-count',qtyTotal()],['pv-favorite-count',favorites.length]]) document.querySelectorAll(`[data-ps-target="${target}"]`).forEach(el=>{el.textContent=count;el.hidden=!count;});}
function setSearch(open){const panel=document.querySelector('[data-ps-ref="pv-search-panel"]'),button=document.querySelector('[data-ps-action="search"]');if(!panel||!button)return;button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'Chiudi ricerca':'Apri ricerca');if(open){setMenu(false);if(!panel.open)panel.showModal();document.querySelector('[data-ps-ref="pv-search-input"]').focus();}else if(panel.open)panel.close();}
function setMenu(open){const menu=document.querySelector('[data-ps-ref="pv-navigation"]'),button=document.querySelector('[data-ps-action="menu"]');menu?.setAttribute('data-ps-state',open?'open':'closed');button?.setAttribute('aria-expanded',String(open));button?.setAttribute('aria-label',open?'Chiudi menu':'Apri menu');}
const mobile=matchMedia('(max-width:767px)');
function placeSidebar(){const sidebar=document.querySelector('[data-ps-ref="pv-catalog-sidebar"]'),target=document.querySelector('[data-ps-target="pv-sidebar-mobile"]');if(!sidebar||!target)return;if(mobile.matches)target.append(sidebar);else{closeDialog('filters');document.querySelector('.pv-catalog-layout')?.prepend(sidebar);}}
mobile.addEventListener('change',placeSidebar);
function addCart(id){
  const product=find(id);if(!product)return;
  const input=P()===productUrl(product)?document.querySelector('[data-ps-ref="pv-qty"]'):null;if(input&&!input.reportValidity())return;
  const qty=input?Number(input.value):1,variant=variation(product,selectedVariants.get(product.id)),variantId=variant?.source_id||0;
  const item=cart.find(row=>row.id===product.id&&row.variant===variantId);
  if((item?.qty||0)+qty>12){notify('Puoi aggiungere al massimo 12 pezzi per variante in questa demo.');return;}
  if(item)item.qty+=qty;else cart.push({id:product.id,variant:variantId,qty});
  save(cartKey,cart);syncBadges();
  document.querySelector('[data-ps-target="pv-cart-modal-content"]').innerHTML=fix(`<img class="pv-cart-modal-image" src="${variant?.image||product.images[0]}" alt="${esc(product.name)}"><h3>${esc(product.name)}</h3>${variant?'<p>Colore: '+esc(variant.attributes.Colore)+'</p>':''}<p>Quantità aggiunta: ${qty} · ${money(cents(variant?.price??product.price)*qty)}</p><p class="pv-drawer-total">${qtyTotal()} articoli · ${money(total())} con spedizione</p><a class="pv-button pv-button--dark pv-checkout-link" href="/carrello">Vai al carrello ${icon('arrow-right')}</a><button class="pv-continue" data-ps-action="close" data-ps-dialog="cart-modal">Continua a esplorare</button>`);
  openDialog('cart-modal');
}

document.addEventListener('click',event=>{
  const button=event.target.closest('[data-ps-action]');
  if(button){
    const action=button.dataset.psAction,id=Number(button.dataset.psProductId);
    if(action==='menu'){const open=button.getAttribute('aria-expanded')!=='true';if(open)setSearch(false);setMenu(open);}
    if(action==='search')setSearch(button.getAttribute('aria-expanded')!=='true');
    if(action==='close-search')setSearch(false);
    if(action==='close')closeDialog(button.dataset.psDialog);
    if(action==='filters')openDialog('filters');
    if(action==='favorites')openDialog('favorites');
    if(action==='favorite'){
      favorites=favorites.includes(id)?favorites.filter(value=>value!==id):[...favorites,id];save(favoriteKey,favorites);syncBadges();
      document.querySelectorAll(`[data-ps-action="favorite"][data-ps-product-id="${id}"]`).forEach(el=>{el.setAttribute('aria-pressed',String(favorites.includes(id)));el.setAttribute('aria-label',`${favorites.includes(id)?'Rimuovi':'Salva'} ${find(id).name} ${favorites.includes(id)?'dai':'nei'} preferiti`);});
      document.querySelector('[data-ps-target="pv-favorites-list"]').innerHTML=fix(favoritesContent());notify(favorites.includes(id)?'Prodotto salvato nei preferiti.':'Prodotto rimosso dai preferiti.');
    }
    if(action==='add')addCart(id);
    if(action==='quantity'||action==='remove'){
      const item=cart.find(row=>row.id===id&&row.variant===Number(button.dataset.psVariant));
      if(item){if(action==='remove')cart=cart.filter(row=>row!==item);else item.qty=Math.max(1,Math.min(12,item.qty+Number(button.dataset.psDelta)));save(cartKey,cart);render(true);}
    }
    if(action==='checkout-back'){checkoutStep=Math.max(1,checkoutStep-1);render();}
    if(action==='thumbnail'){document.querySelector('[data-ps-ref="pv-product-image"]').src=button.dataset.psImage;document.querySelector('[data-ps-ref="pv-zoom-image"]').src=button.dataset.psImage;}
    if(action==='zoom')openDialog('zoom');
    if(action==='clear-demo'){cart=[];favorites=[];lastOrder=null;checkoutValues={};for(const key of [cartKey,favoriteKey,orderKey])try{localStorage.removeItem(key);}catch{}render(true);notify('Dati di prova cancellati.');}
    return;
  }
  const link=event.target.closest('a[href]');
  if(link&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&event.button===0&&link.target!=='_blank'&&!link.hasAttribute('download')){
    const url=new URL(link.href,location.origin);
    if(url.origin===location.origin&&!url.hash){event.preventDefault();navigate(url.pathname+url.search);}
  }
});
document.addEventListener('change',event=>{
  if(event.target.matches('[data-ps-ref="pv-sort"]')){const url=new URL(location.href);url.searchParams.set('sort',event.target.value);navigate(url.pathname+url.search);}
  if(event.target.matches('[data-ps-ref="pv-variant"]')){
    const product=find(event.target.dataset.psProductId),selected=variation(product,event.target.value);selectedVariants.set(product.id,selected.source_id);
    document.querySelector('[data-ps-ref="pv-product-image"]').src=withBase(selected.image);document.querySelector('[data-ps-ref="pv-zoom-image"]').src=withBase(selected.image);
    document.querySelectorAll('[data-ps-target="pv-live-price"],[data-ps-target="pv-sticky-price"]').forEach(el=>el.textContent=money(cents(selected.price)));
    const thumb=document.querySelector('[data-ps-action="thumbnail"]');thumb.dataset.psImage=withBase(selected.image);thumb.querySelector('img').src=withBase(selected.image);
  }
});
document.addEventListener('submit',event=>{
  const form=event.target.closest('[data-ps-form]');if(!form)return;event.preventDefault();
  const data=new FormData(form);
  if(form.dataset.psForm==='search')navigate('/ricerca?q='+encodeURIComponent(String(data.get('q')).trim()));
  if(form.dataset.psForm==='filters'){
    const min=Number(data.get('min')),max=data.get('max')?Number(data.get('max')):Infinity;
    if(min>max){form.querySelector('[data-ps-target="pv-filter-error"]').textContent='Il valore minimo deve essere inferiore al massimo.';return;}
    const url=new URL(location.href);for(const name of ['min','max','material','color','power']){const value=data.get(name);if(value)url.searchParams.set(name,String(value));else url.searchParams.delete(name);}navigate(url.pathname+url.search);
  }
  if(form.dataset.psForm==='contact'){document.querySelector('[data-ps-target="pv-contact-result"]').textContent='Prova completata. Il messaggio non è stato inviato.';form.reset();}
  if(form.dataset.psForm==='checkout'){
    for(const [key,value] of data)checkoutValues[key]=value;
    if(checkoutStep<4){checkoutStep++;render();return;}
    lastOrder={reference:'DEMO-'+crypto.randomUUID().slice(0,8).toUpperCase(),items:cart.map(item=>({name:find(item.id).name,color:variation(find(item.id),item.variant)?.attributes.Colore||'',qty:item.qty,unitPrice:itemPrice(item)})),shipping:shipping(),total:total(),date:new Date().toISOString()};
    save(orderKey,lastOrder);cart=[];save(cartKey,cart);checkoutValues={};checkoutStep=1;navigate('/conferma-ordine');
  }
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){setMenu(false);if(document.querySelector('[data-ps-action="search"]')?.getAttribute('aria-expanded')==='true'){setSearch(false);document.querySelector('[data-ps-action="search"]').focus();}}});
window.addEventListener('popstate',()=>render());
render();
