// Demo content for `pnpm db:seed`. Prices in RON (converted to bani by the seed script).

export type SeedUser = {
  key: string
  name: string
  county: string
  city: string
  bio: string
}

export const SEED_USERS: SeedUser[] = [
  {
    key: "andrei",
    name: "Andrei Popescu",
    county: "B",
    city: "București",
    bio: "Pasionat de electronice și gadgeturi. Răspund repede la mesaje.",
  },
  {
    key: "ioana",
    name: "Ioana Marinescu",
    county: "CJ",
    city: "Cluj-Napoca",
    bio: "Colecționez viniluri și cărți vechi. Ambalez totul cu grijă.",
  },
  {
    key: "mihai",
    name: "Mihai Dumitrescu",
    county: "IS",
    city: "Iași",
    bio: "Biciclist de weekend, vând ce nu mai folosesc.",
  },
  {
    key: "elena",
    name: "Elena Constantin",
    county: "TM",
    city: "Timișoara",
    bio: "Mamă a doi copii — jucării și haine aproape noi.",
  },
  {
    key: "radu",
    name: "Radu Georgescu",
    county: "BV",
    city: "Brașov",
    bio: "Schi, camping și tot ce ține de munte.",
  },
  {
    key: "cristina",
    name: "Cristina Stan",
    county: "CT",
    city: "Constanța",
    bio: "Decorațiuni, mobilier vintage și obiecte de colecție.",
  },
]

export type SeedAuction = {
  seller: string
  category: string
  title: string
  description: string
  condition: "nou" | "ca_nou" | "folosit" | "pentru_piese"
  start: number
  increment: number
  reserve?: number
  buyNow?: number
  courier?: number
  /** Active: hours until end. Negative: already ended. */
  endsInHours: number
  durationDays: 1 | 3 | 5 | 7 | 10
  state?: "draft" | "ended_sold" | "ended_unsold" | "cancelled"
  /** For ended_sold: final price (RON) and winner key. */
  sold?: { price: number; winner: string }
}

export const SEED_AUCTIONS: SeedAuction[] = [
  // ── Electronice ──
  {
    seller: "andrei",
    category: "telefoane",
    title: "iPhone 14 Pro 128GB, Deep Purple",
    description:
      "Telefon în stare foarte bună, folosit cu husă și folie de la cumpărare. Baterie 89%. Vine cu cutia originală și cablul. Fără zgârieturi vizibile pe ecran.",
    condition: "ca_nou",
    start: 2400,
    increment: 50,
    reserve: 3000,
    buyNow: 3600,
    courier: 20,
    endsInHours: 2.5,
    durationDays: 7,
  },
  {
    seller: "andrei",
    category: "laptopuri-pc",
    title: "Laptop Lenovo ThinkPad T480, i5, 16GB RAM",
    description:
      "ThinkPad robust, perfect pentru birou sau facultate. SSD 512GB, tastatură iluminată, baterie nouă înlocuită anul trecut. Windows 11 instalat.",
    condition: "folosit",
    start: 1200,
    increment: 20,
    courier: 25,
    endsInHours: 30,
    durationDays: 5,
  },
  {
    seller: "andrei",
    category: "console-jocuri",
    title: "PlayStation 5 cu 2 controlere și 3 jocuri",
    description:
      "Consolă PS5 cu unitate de disc, două controlere DualSense și jocurile: Spider-Man 2, FIFA 24, Gran Turismo 7. Funcționează impecabil.",
    condition: "ca_nou",
    start: 1800,
    increment: 50,
    buyNow: 2700,
    courier: 30,
    endsInHours: 0.6,
    durationDays: 3,
  },
  {
    seller: "radu",
    category: "foto-video",
    title: "Aparat foto Sony A6400 + obiectiv 16-50mm",
    description:
      "Aparat mirrorless excelent pentru vlog și călătorii. Aproximativ 8.000 de cadre. Include două baterii, încărcător și geantă.",
    condition: "folosit",
    start: 2200,
    increment: 50,
    reserve: 2800,
    courier: 25,
    endsInHours: 70,
    durationDays: 7,
  },
  {
    seller: "ioana",
    category: "audio",
    title: "Căști Sony WH-1000XM4, anulare zgomot",
    description:
      "Căști wireless cu anulare activă a zgomotului, sunet excelent. Pernițele au fost înlocuite recent. Cutie de transport inclusă.",
    condition: "folosit",
    start: 450,
    increment: 10,
    buyNow: 750,
    courier: 15,
    endsInHours: 18,
    durationDays: 3,
  },
  {
    seller: "andrei",
    category: "telefoane",
    title: "Samsung Galaxy S21 pentru piese, ecran spart",
    description:
      "Telefonul pornește, dar ecranul e spart și touch-ul nu funcționează. Placa de bază e ok. Ideal pentru piese sau reparație.",
    condition: "pentru_piese",
    start: 150,
    increment: 5,
    courier: 15,
    endsInHours: 120,
    durationDays: 7,
  },

  // ── Auto & Moto ──
  {
    seller: "radu",
    category: "piese-auto",
    title: 'Set 4 jante aliaj 17" VW/Skoda 5x112',
    description:
      "Jante originale VW, fără fisuri, recondiționate anul trecut. Potrivite pentru Golf, Passat, Octavia. Fără anvelope.",
    condition: "folosit",
    start: 900,
    increment: 20,
    reserve: 1200,
    endsInHours: 44,
    durationDays: 5,
  },
  {
    seller: "mihai",
    category: "accesorii-auto",
    title: "Cutie portbagaj Thule Motion XT M, 400L",
    description:
      "Cutie de plafon spațioasă, deschidere pe ambele părți. Folosită în trei concedii. Include cheile și sistemul de prindere.",
    condition: "ca_nou",
    start: 1600,
    increment: 50,
    courier: 60,
    endsInHours: 96,
    durationDays: 7,
  },
  {
    seller: "radu",
    category: "motociclete",
    title: "Scuter Piaggio Liberty 125, 2019",
    description:
      "Scuter întreținut la reprezentanță, 9.800 km. Acte la zi, ITP valabil. Ideal pentru oraș. Doar predare personală în Brașov.",
    condition: "folosit",
    start: 6500,
    increment: 100,
    reserve: 8000,
    endsInHours: 200,
    durationDays: 10,
  },

  // ── Casă & Grădină ──
  {
    seller: "cristina",
    category: "mobila",
    title: "Fotoliu vintage tapițat, anii '70",
    description:
      "Fotoliu retro restaurat, tapițerie nouă din catifea verde. Structura din lemn masiv. Un accent superb pentru living.",
    condition: "ca_nou",
    start: 600,
    increment: 20,
    endsInHours: 5,
    durationDays: 3,
  },
  {
    seller: "cristina",
    category: "decoratiuni",
    title: "Oglindă decorativă cu ramă aurie, 80x60 cm",
    description:
      "Oglindă baroc cu ramă sculptată, ușor patinată. Perfectă pentru hol sau dormitor.",
    condition: "folosit",
    start: 180,
    increment: 10,
    courier: 35,
    endsInHours: 52,
    durationDays: 5,
  },
  {
    seller: "elena",
    category: "electrocasnice",
    title: "Robot de bucătărie KitchenAid Artisan, roșu",
    description:
      "Mixer planetar 4,8L, folosit de câteva ori. Include toate accesoriile originale: tel, cârlig, paletă.",
    condition: "ca_nou",
    start: 1100,
    increment: 20,
    buyNow: 1700,
    courier: 40,
    endsInHours: 26,
    durationDays: 3,
  },
  {
    seller: "mihai",
    category: "gradina",
    title: "Mașină de tuns iarba Bosch electrică",
    description:
      "Mașină de tuns iarba 1.400W, lățime de tăiere 37 cm, coș de 40L. Funcționează perfect, cuțit ascuțit recent.",
    condition: "folosit",
    start: 250,
    increment: 10,
    endsInHours: 140,
    durationDays: 7,
  },

  // ── Modă ──
  {
    seller: "ioana",
    category: "ceasuri-bijuterii",
    title: "Ceas Seiko Presage automatic, cadran albastru",
    description:
      "Ceas automatic elegant, purtat ocazional. Brățară din piele nouă plus brățara metalică originală. Cutie și certificat.",
    condition: "ca_nou",
    start: 1300,
    increment: 50,
    reserve: 1600,
    courier: 20,
    endsInHours: 12,
    durationDays: 5,
  },
  {
    seller: "elena",
    category: "incaltaminte",
    title: "Ghete Dr. Martens 1460, mărimea 38",
    description: "Ghete negre din piele, purtate de câteva ori. Aproape ca noi, talpa fără uzură.",
    condition: "ca_nou",
    start: 280,
    increment: 10,
    courier: 18,
    endsInHours: 60,
    durationDays: 5,
  },
  {
    seller: "cristina",
    category: "genti-accesorii",
    title: "Geantă din piele lucrată manual, coniac",
    description:
      "Geantă de umăr din piele naturală, realizată de un meșteșugar din Sibiu. Spațioasă, cu buzunar interior.",
    condition: "nou",
    start: 320,
    increment: 10,
    buyNow: 520,
    courier: 18,
    endsInHours: 85,
    durationDays: 7,
  },
  {
    seller: "elena",
    category: "imbracaminte",
    title: "Geacă de iarnă Columbia, damă, mărimea M",
    description:
      "Geacă impermeabilă cu tehnologie Omni-Heat, foarte călduroasă. Purtată o singură iarnă.",
    condition: "folosit",
    start: 220,
    increment: 10,
    courier: 18,
    endsInHours: 9,
    durationDays: 3,
  },

  // ── Sport ──
  {
    seller: "mihai",
    category: "biciclete",
    title: "Bicicletă de oraș Pegas Strada, cadru 52",
    description:
      "Bicicleta românească clasică, recondiționată: frâne noi, lanț nou, cauciucuri noi. Coș față și suport spate incluse.",
    condition: "ca_nou",
    start: 450,
    increment: 10,
    reserve: 600,
    endsInHours: 1.2,
    durationDays: 7,
  },
  {
    seller: "mihai",
    category: "biciclete",
    title: 'Mountain bike Merida Big.Nine 100, 29"',
    description:
      'MTB cu roți de 29", frâne hidraulice Shimano, furcă cu blocare. Mărimea L. Întreținută regulat.',
    condition: "folosit",
    start: 1500,
    increment: 50,
    buyNow: 2300,
    endsInHours: 110,
    durationDays: 7,
  },
  {
    seller: "radu",
    category: "sporturi-iarna",
    title: "Schiuri Atomic Redster 170 cm + clăpari",
    description:
      "Schiuri all-mountain cu legături reglate, plus clăpari Atomic mărimea 27.5. Ascuțite și cerate la început de sezon.",
    condition: "folosit",
    start: 800,
    increment: 20,
    endsInHours: 36,
    durationDays: 5,
  },
  {
    seller: "radu",
    category: "camping",
    title: "Cort 3 persoane Coleman, impermeabil",
    description: "Cort ușor de montat, folosit în 5 drumeții. Vine cu husă, țăruși și prelată.",
    condition: "folosit",
    start: 200,
    increment: 10,
    courier: 25,
    endsInHours: 170,
    durationDays: 10,
  },
  {
    seller: "elena",
    category: "fitness",
    title: "Set gantere reglabile 2 x 24 kg",
    description:
      "Gantere reglabile cu sistem rapid de schimbare a greutății. Economisesc mult spațiu. Ca noi.",
    condition: "ca_nou",
    start: 700,
    increment: 20,
    endsInHours: 22,
    durationDays: 3,
  },

  // ── Colecții & Artă ──
  {
    seller: "ioana",
    category: "monede",
    title: "Monedă 100 lei 1932, argint, Carol al II-lea",
    description: "Monedă de argint în stare foarte bună, patină naturală. Garantez autenticitatea.",
    condition: "folosit",
    start: 150,
    increment: 5,
    courier: 12,
    endsInHours: 3.5,
    durationDays: 5,
  },
  {
    seller: "cristina",
    category: "arta",
    title: "Tablou ulei pe pânză — peisaj din Deltă, 60x40",
    description:
      "Pictură originală semnată, peisaj cu bărci în Delta Dunării. Ramă din lemn inclusă.",
    condition: "nou",
    start: 500,
    increment: 20,
    reserve: 800,
    courier: 40,
    endsInHours: 75,
    durationDays: 7,
  },
  {
    seller: "cristina",
    category: "antichitati",
    title: "Gramofon vechi cu pâlnie, funcțional",
    description:
      "Gramofon decorativ cu pâlnie din alamă. Mecanismul funcționează, pick-up-ul trebuie înlocuit.",
    condition: "pentru_piese",
    start: 350,
    increment: 10,
    endsInHours: 150,
    durationDays: 10,
  },

  // ── Copii ──
  {
    seller: "elena",
    category: "jucarii",
    title: "Set LEGO Technic Porsche 911 GT3 RS",
    description:
      "Set complet, construit o singură dată și expus. Toate piesele și cartea de instrucțiuni.",
    condition: "ca_nou",
    start: 900,
    increment: 20,
    buyNow: 1400,
    courier: 25,
    endsInHours: 48,
    durationDays: 5,
  },
  {
    seller: "elena",
    category: "carucioare",
    title: "Cărucior 3 în 1 Cybex Balios S Lux",
    description:
      "Cărucior complet: landou, sport și scoică auto. Folosit pentru un copil, foarte bine întreținut.",
    condition: "folosit",
    start: 1200,
    increment: 50,
    endsInHours: 100,
    durationDays: 7,
  },

  // ── Cărți & Muzică ──
  {
    seller: "ioana",
    category: "viniluri-cd",
    title: "Colecție 12 viniluri Phoenix și Sfinx",
    description:
      "Discuri Electrecord originale, majoritatea în stare foarte bună. Lista completă la cerere.",
    condition: "folosit",
    start: 400,
    increment: 10,
    reserve: 550,
    courier: 20,
    endsInHours: 16,
    durationDays: 3,
  },
  {
    seller: "ioana",
    category: "carti-reviste",
    title: "Serie completă Harry Potter, ediția Arthur",
    description: "Toate cele 7 volume în limba română, ediție cartonată. Citite o singură dată.",
    condition: "ca_nou",
    start: 180,
    increment: 5,
    courier: 15,
    endsInHours: 58,
    durationDays: 5,
  },
  {
    seller: "mihai",
    category: "instrumente-muzicale",
    title: "Chitară acustică Yamaha F310",
    description: "Chitară ideală pentru începători, sună foarte bine. Include husă și capodastru.",
    condition: "folosit",
    start: 250,
    increment: 10,
    courier: 30,
    endsInHours: 90,
    durationDays: 7,
  },

  // ── Other states ──
  {
    seller: "andrei",
    category: "telefoane",
    title: "Google Pixel 7, 128GB, alb",
    description: "Ciornă — încă fac poze bune pentru anunț. Telefon în stare excelentă.",
    condition: "ca_nou",
    start: 1300,
    increment: 50,
    endsInHours: 0,
    durationDays: 7,
    state: "draft",
  },
  {
    seller: "cristina",
    category: "mobila",
    title: "Masă extensibilă din lemn masiv, 6 persoane",
    description:
      "Masă din stejar masiv, se extinde de la 140 la 200 cm. Câteva urme de folosire normale.",
    condition: "folosit",
    start: 900,
    increment: 20,
    endsInHours: -30,
    durationDays: 7,
    state: "ended_unsold",
  },
  {
    seller: "radu",
    category: "camping",
    title: "Rucsac de tură Deuter 40L",
    description: "Rucsac comod cu spate ventilat și husă de ploaie. Folosit două sezoane.",
    condition: "folosit",
    start: 200,
    increment: 10,
    endsInHours: -60,
    durationDays: 5,
    state: "ended_sold",
    sold: { price: 285, winner: "mihai" },
  },
  {
    seller: "ioana",
    category: "carti-reviste",
    title: "Colecție reviste Știință și Tehnică 1975–1985",
    description: "Peste 100 de numere, legate pe ani. Stare bună pentru vârsta lor.",
    condition: "folosit",
    start: 300,
    increment: 10,
    endsInHours: -10,
    durationDays: 3,
    state: "ended_sold",
    sold: { price: 460, winner: "andrei" },
  },
  {
    seller: "elena",
    category: "jucarii",
    title: "Căsuță de păpuși din lemn",
    description: "Anulată — am decis să o păstrăm pentru familie.",
    condition: "folosit",
    start: 250,
    increment: 10,
    endsInHours: 40,
    durationDays: 7,
    state: "cancelled",
  },
]
