import { Destination, NavItem, Language } from './types';

export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
];

export const NAV_ITEMS: NavItem[] = [
  { labelKey: 'nav.destinations', href: '#destinos' },
  { labelKey: 'nav.services', href: '#servicios' },
  { labelKey: 'nav.team', href: '#equipo' },
  { labelKey: 'nav.metrics', href: '#metricas' },
  { labelKey: 'nav.investors', href: '#inversionistas'},
];

export const DESTINATIONS: Destination[] = [
  {
    id: '1',
    titleKey: 'dest.cartagena.title',
    descriptionKey: 'dest.cartagena.desc',
    imageUrl: '/images/destinations/pirata.jpg',
    externalLink: 'https://www.isladelpirata.co/',},
  {
    id: '2',
    titleKey: 'dest.santamarta.title',
    descriptionKey: 'dest.santamarta.desc',
    imageUrl: '/images/destinations/ciudad-perdida.jpg',},
  {
    id: '3',
    titleKey: 'dest.coffee.title',
    descriptionKey: 'dest.coffee.desc',
    imageUrl: '/images/destinations/4472.jpg',},
  {
    id: '4',
    titleKey: 'dest.guajira.title',
    descriptionKey: 'dest.guajira.desc',
    imageUrl: '/images/destinations/guajira.webp',},
  {
    id: '5',
    titleKey: 'dest.amazonas.title',
    descriptionKey: 'dest.amazonas.desc',
    imageUrl: '/images/destinations/amazonas2.webp',},
  {
    id: '6',
    titleKey: 'dest.bogota.title',
    descriptionKey: 'dest.bogota.desc',
    imageUrl: '/images/destinations/eldorado.webp',}
];
export const PREMIER_SERVICES = [
  {
    icon: "✈️",
    title: "Vuelos Privados (NetJets & Flapz API)",
    description: "Nuestra infraestructura se integra vía API con NetJets, Flapz y Charter del Caribe para ofrecer disponibilidad instantánea de aeronaves de largo alcance como Gulfstream y Bombardier.",
    imageUrl: "/images/premier-services/viptransport.jpg"},
  {
    icon: "🏡",
    title: "Alojamientos (Smart API)",
    description: "Sincronización en tiempo real con inventarios globales de Four Seasons y villas privadas. Reserve con un solo clic mediante nuestro motor de reservas automatizado.",
    imageUrl: "/images/premier-services/CuratedExperiences.jpg"},
  {
    icon: "🚤",
    title: "Yates y Veleros (Direct API)",
    description: "Gestione el alquiler de yates Bertram y superyates exclusivos a través de nuestra API propia de logística marítima, garantizando el servicio de mayor nivel en el Caribe.",
    imageUrl: "/images/premier-services/yatecartagena.webp"},
  {
    icon: "🚗",
    title: "Transporte Terrestre",
    description: "Llegue con estilo con nuestra selección de camionetas de lujo Mercedes-Benz, vans y vehículos blindados.",
    imageUrl: "/images/premier-services/viptransport.jpg"},
  {
    icon: "👨‍🍳",
    title: "Personal Exclusivo",
    description: "Contrate chefs profesionales, DJs, guardaespaldas, enfermeras y niñeras para su estancia de ultra lujo.",
    imageUrl: "/images/premier-services/VIPStaffing.jpg"},
  {
    icon: "✨",
    title: "Experiencias Curadas",
    description: "Elija entre paquetes prediseñados con todo incluido para una escapada de lujo sin complicaciones.",
    imageUrl: "/images/premier-services/CuratedExperiences.jpg"
  }
];
// Partner Logos - Using high-reliability sourced URLs (transparent PNG/SVG)
// Partner Logos - Sourced locally for reliability
export const PARTNERS = [
  {
    name: "NetJets",
    logo: "./images/partners/netjets.svg"
  },
  {
    name: "Four Seasons",
    logo: "./images/partners/fourseasons.svg"
  },
  {
    name: "Marriott Luxury",
    logo: "./images/partners/marriott.svg"
  },
  {
  name: "Flapz",
  logo: "/images/partners/flapz.svg"
}

export const TEAM = [
  {
    name: "Deiby Villalobos",
    role: "CTO & Director Administrativo",
    bio: "Arquitecto de la plataforma digital. Especialista en desarrollo de sistemas escalables, integraciones API complejas y automatización con IA.",
    equity: "25% Equity"
  },
  {
    name: "Jose Fernando Angel Trucco",
    role: "Director Ventas y Marketing",
    bio: "Visionario del negocio. Líder en creación de alianzas clave y relaciones con inversionistas institucionales.",
    equity: "25% Equity"
  },
  {
    name: "Juan Carlos Molina Dussan",
    role: "Director Operaciones",
    bio: "Visionario y Estratega comercial internacional. Experto en alianzas con brokers de aviación privada y servicios concierge de ultra lujo.",
    equity: "25% Equity"
  }
];

// Investor Assets - Centralized for easy editing
export const INVESTOR_ASSETS = [
  {
    id: '1',
    name: 'Memorandum of Understanding (MOU)',
    type: 'pdf',
    url: './mou.pdf', // Local file in public/
    fileSize: '1.2 MB'
  },
  {
    id: '2',
    name: 'Financial Projections 2025-2029',
    type: 'pdf',
    url: './financials.pdf', // Local file in public/
    fileSize: '3.4 MB'
  },
  {
    id: '3',
    name: 'KLO Vision 2025 - Executive Summary',
    type: 'mp4',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&q=80&w=800',
    fileSize: '42 MB'
  },
  {
    id: '4',
    name: 'Growth Strategy Deep Dive',
    type: 'mp4',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800',
    fileSize: '85 MB'
  }
];


export const ROADMAP = [
  {
    period: "Month 1-12 (Year 1)",
    title: "Foundation & Leadership",
    goals: [
      "Onboard 35 flagship properties in Colombian Caribbean",
      "Launch beta with 100 VIP travelers & achieve product-market fit",
      "Develop B2B API for partners & launch premium memberships",
      "Secure key partnerships with luxury travel agencies in the US"
    ]
  },
  {
    period: "Month 13-24 (Year 2)",
    title: "Growth & Service Expansion",
    goals: [
      "Scale to 85 properties and expand user base through targeted marketing",
      "Enhance AI capabilities with more data and personalization features",
      "Grow API and membership revenue streams",
      "Launch influencer & referral programs to boost organic growth"
    ]
  },
  {
    period: "Month 25-36 (Year 3)",
    title: "Caribbean Expansion & Scale",
    goals: [
      "Initiate expansion to other key Caribbean markets (e.g., St. Barts, Turks & Caicos)",
      "Public launch with international PR push",
      "Scale to 150+ properties across the Caribbean",
      "Target: 35,000 users, 1800 bookings, and establish KLO as a top regional player"
    ]
  }
];

export const TRANSLATIONS: Record<Language, any> = {
  en: {
    hero: {
      title: "Caribbean Luxury Redefined",
      subtitle: "As data-driven AI pioneers, we curate bespoke travel experiences with exclusive access to private islands, luxury villas, and yacht charters in Colombia.",
      cta: "Start Planning"
    },
    nav: {
      destinations: "Destinations",
      services: "Services",
      team: "Team",
      metrics: "Metrics",
      investors: "Investors",
      contact: "Contact Us"
    },
    investors: {
      title: "Investor Relations",
      subtitle: "Access exclusive growth data, financial projections, and partnership opportunities.",
      documents: "Strategic Documents",
      presentations: "Executive Presentations",
      upload_cta: "Manage Assets",
      financials: "Financial Statements 2025",
      mou: "Memorandum of Understanding",
      download: "Download PDF"
    },
    dest: {
      section_title: "Our Exclusive Destinations",
      section_subtitle: "Explore Colombia's most stunning locations, curated for an unforgettable luxury experience.",
      cartagena: { title: "Cartagena & The Islands", desc: "Experience the romance of the walled city and escape to the turquoise waters of the nearby Rosario Islands." },
      santamarta: { title: "Santa Marta, Tayrona & Minca", desc: "The perfect blend of beach, mountain, and jungle, from the Sierra Nevada to the Caribbean coast." },
      cano: { title: "Caño Cristales", desc: "The 'River of Five Colors', a unique natural wonder you have to see to believe." },
      agustin: { title: "San Agustín", desc: "Travel to the past in this mysterious archaeological park, a UNESCO World Heritage site." },
      coffee: { title: "Coffee Region & Antioquia", desc: "Immerse yourself in lush landscapes, world-class coffee, and vibrant culture." },
      amazonas: { title: "Amazonas", desc: "Venture into the heart of the world's largest rainforest for unmatched immersion." },
      llanos: { title: "Eastern Plains", desc: "Experience authentic 'llanera' culture in the vast, sun-drenched plains of eastern Colombia." },
      guajira: { title: "La Guajira", desc: "Explore the magical desert where golden sands meet the turquoise Caribbean sea." },
      bogota: { title: "Bogotá & El Dorado", desc: "Discover the vibrant capital, a hub of culture, history, and the legend of El Dorado." }
    },
    assistant: {
      name: "María Fernanda",
      role: "Your Personal AI Concierge",
      greeting: "Hello! I'm María Fernanda. I'm ready to create the Caribbean vacation of your dreams.",
      prompt: "Ask me anything about luxury travel in Colombia!",
      placeholder: "Talk to María Fernanda...",
      suggestion_title: "Try a sample query",
      suggestions: ["Private island for a week", "Villas in Cartagena", "Helicopter to Tayrona"]
    }
  },
  es: {
    hero: {
      title: "Elevando el Lujo en el Caribe",
      subtitle: "Como empresa data-driven y pionera en IA, nos especializamos en experiencias a medida, con acceso exclusivo a islas privadas, villas y yates en el Caribe Colombiano.",
      cta: "Empieza a Planificar"
    },
    nav: {
      destinations: "Destinos",
      services: "Servicios",
      team: "Equipo",
      metrics: "Métricas",
      investors: "Inversionistas",
      contact: "Contáctanos"
    },
    investors: {
      title: "Relaciones con Inversionistas",
      subtitle: "Acceda a datos de crecimiento exclusivos, proyecciones financieras y oportunidades de asociación.",
      documents: "Documentos Estratégicos",
      presentations: "Presentaciones Ejecutivas",
      upload_cta: "Gestionar Activos",
      financials: "Estados Financieros 2025",
      mou: "Memorando de Entendimiento (MOU)",
      download: "Descargar PDF"
    },
    dest: {
      section_title: "Nuestros Destinos Exclusivos",
      section_subtitle: "Explore los lugares más impresionantes de Colombia, seleccionados para una experiencia de lujo inolvidable.",
      cartagena: { title: "Cartagena y Las Islas", desc: "Vive el romance de la ciudad amurallada y escápate a las aguas cristalinas de las Islas del Rosario." },
      santamarta: { title: "Santa Marta, Tayrona y Minca", desc: "La mezcla perfecta de playa, montaña y selva, desde la Sierra Nevada hasta la costa Caribe." },
      cano: { title: "Caño Cristales", desc: "El 'Río de los Cinco Colores', una maravilla natural única que hay que ver para creer." },
      agustin: { title: "San Agustín", desc: "Viaje al pasado en este misterioso parque arqueológico, Patrimonio de la Humanidad por la UNESCO." },
      coffee: { title: "Eje Cafetero y Antioquia", desc: "Sumérjase en paisajes exuberantes, café de clase mundial y la vibrante cultura de Antioquia." },
      amazonas: { title: "Amazonas", desc: "Aventúrese en el corazón de la selva tropical más grande del mundo para una inmersión inigualable." },
      llanos: { title: "Llanos Orientales", desc: "Experimente la auténtica cultura llanera en las vastas y soleadas llanuras del oriente de Colombia." },
      guajira: { title: "La Guajira", desc: "Explora el desierto mágico donde las arenas doradas se encuentran con el mar Caribe turquesa." },
      bogota: { title: "Bogotá y El Dorado", desc: "Descubra la vibrante capital, centro de cultura e historia, y la leyenda de El Dorado." }
    },
    assistant: {
      name: "María Fernanda",
      role: "Tu Conserje Personal de IA",
      greeting: "¡Hola! Soy María Fernanda. Estoy lista para crear las vacaciones de tus sueños en el Caribe colombiano.",
      prompt: "¡Pregúntame cualquier cosa sobre viajes de lujo en Colombia!",
      placeholder: "Habla con María Fernanda...",
      suggestion_title: "Prueba una consulta de ejemplo",
      suggestions: ["Isla privada por una semana", "Villas en Cartagena", "Helicóptero a Tayrona"]
    }
  },
  pt: {
    hero: {
      title: "Elevando o Luxo no Caribe",
      subtitle: "Como pioneiros em dados e IA, somos especialistas em experiências sob medida, com acesso a ilhas privadas e iates exclusivos.",
      cta: "Começar Planejamento"
    },
    nav: {
      destinations: "Destinos",
      services: "Serviços",
      team: "Equipe",
      metrics: "Métricas",
      investors: "Investidores",
      contact: "Contate-nos"
    },
    investors: {
      title: "Relações com Investidores",
      subtitle: "Acesse dados exclusivos de crescimento, projeções financeiras e oportunidades.",
      documents: "Documentos Estratégicos",
      presentations: "Apresentações Executivas",
      upload_cta: "Gerenciar Ativos",
      financials: "Demonstrações Financeiras 2025",
      mou: "Memorando de Entendimento",
      download: "Baixar PDF"
    },
    dest: {
      section_title: "Nuestros Destinos Exclusivos",
      section_subtitle: "Explore os locais mais deslumbrantes da Colômbia para uma experiência de luxo inesquecível.",
      cartagena: { title: "Cartagena e as Ilhas", desc: "Vivencie o romance da cidade murada e escape para as águas azul-turquesa das Ilhas do Rosário." },
      santamarta: { title: "Santa Marta, Tayrona e Minca", desc: "A mistura perfeita de praia, montanha e selva, da Sierra Nevada à costa caribenha." },
      cano: { title: "Caño Cristales", desc: "O 'Rio das Cinco Cores', uma maravilha natural única que você precisa ver para crer." },
      agustin: { title: "San Agustín", desc: "Viagem ao passado neste misterioso parque arqueológico, Patrimônio Mundial da UNESCO." },
      coffee: { title: "Eixo Cafeeiro e Antioquia", desc: "Mergulhe em paisagens exuberantes, café de classe mundial e cultura vibrante." },
      amazonas: { title: "Amazonas", desc: "Aventure-se no coração da maior floresta tropical do mundo para uma inmersão incomparável." },
      llanos: { title: "Planícies Orientais", desc: "Experimente a autêntica cultura 'llanera' nas vastas planícies ensolaradas do leste colombiano." },
      guajira: { title: "La Guajira", desc: "Deserto mágico onde as areias douradas encontram o turquesa." },
      bogota: { title: "Bogotá e El Dorado", desc: "Descubra la vibrante capital, centro de cultura, história e a lenda de El Dorado." }
    },
    assistant: {
      name: "María Fernanda",
      role: "Sua Concierge Pessoal de IA",
      greeting: "Olá! Sou María Fernanda. Estou pronta para criar as férias dos seus sonhos no Caribe colombiano.",
      prompt: "Pergunte-me qualquer coisa sobre viagens de luxo na Colômbia!",
      placeholder: "Fale com María Fernanda...",
      suggestion_title: "Tente uma consulta de exemplo",
      suggestions: ["Ilha privada por uma semana", "Villas em Cartagena", "Helicóptero para Tayrona"]
    }
  },
  it: {
    hero: {
      title: "Elevando il Lusso ai Caraibi",
      subtitle: "Pionieri nei dati e nell'IA, creiamo esperienze su misura con accesso a isole private, ville di lusso e yacht.",
      cta: "Inizia a Pianificare"
    },
    nav: {
      destinations: "Destinazioni",
      services: "Servizi",
      team: "Team",
      metrics: "Metriche",
      investors: "Investitori",
      contact: "Contattaci"
    },
    investors: {
      title: "Relazioni con gli Investitori",
      subtitle: "Accedi a dati di crescita esclusivi e proiezioni finanziarie.",
      documents: "Documenti Strategici",
      presentations: "Presentazioni Esecutive",
      upload_cta: "Gestisci Risorse",
      financials: "Bilancio 2025",
      mou: "Protocollo d'Intesa",
      download: "Scarica PDF"
    },
    dest: {
      section_title: "Le Nostre Destinazioni Esclusive",
      section_subtitle: "Esplora i luoghi più spettacolari della Colombia per un'esperienza di lusso indimenticabile.",
      cartagena: { title: "Cartagena e le Isole", desc: "Vivi il romanticismo della città murata e fuggi nelle acque turchesi delle Isole del Rosario." },
      santamarta: { title: "Santa Marta, Tayrona e Minca", desc: "Il mix perfetto di spiaggia, montagna e giungla, dalla Sierra Nevada alla costa caraibica." },
      cano: { title: "Caño Cristales", desc: "Il 'Fiume dei Cinque Colori', una maraviglia naturale unica al mondo." },
      agustin: { title: "San Agustín", desc: "Viaggio nel passato in questo misterioso parque arqueologico, patrimonio UNESCO." },
      coffee: { title: "Regione del Caffè e Antioquia", desc: "Immergiti in paesaggi lussureggianti, caffè di classe mondiale e cultura vibrante." },
      amazonas: { title: "Amazzonia", desc: "Avventurati nel cuore della foresta pluviale più grande del mondo per un'immersione totale." },
      llanos: { title: "Pianure Orientali", desc: "Scopri l'autentica cultura 'llanera' nelle vaste pianure soleggiate della Colombia orientale." },
      guajira: { title: "La Guajira", desc: "Magico deserto dove le sabbie dorate incontrano il turchese." },
      bogota: { title: "Bogotà e El Dorado", desc: "Scopri la vibrante capitale, centro di cultura, storia e la leggenda di El Dorado." }
    },
    assistant: {
      name: "María Fernanda",
      role: "Il Tuo Concierge Personale IA",
      greeting: "Ciao! Sono María Fernanda. Sono pronta a creare la vacanza dei tuoi sogni nei Caraibi colombiani.",
      prompt: "Chiedimi qualsiasi cosa sui viaggi di lusso in Colombia!",
      placeholder: "Parla con María Fernanda...",
      suggestion_title: "Prova una domanda di esempio",
      suggestions: ["Isola privata per una settimana", "Ville a Cartagena", "Elicottero per Tayrona"]
    }
  },
  fr: {
    hero: {
      title: "L'Excellence du Luxe aux Caraïbes",
      subtitle: "Pionniers de la data et de l'IA, nous créons des expériences sur mesure : îles privées, villas de luxe et yachts.",
      cta: "Commencez à Planifier"
    },
    nav: {
      destinations: "Destinations",
      services: "Services",
      team: "Équipe",
      metrics: "Métriques",
      investors: "Investisseurs",
      contact: "Contactez-nous"
    },
    investors: {
      title: "Relations Investisseurs",
      subtitle: "Accédez à des données de croissance exclusives et des projections financières.",
      documents: "Documents Strategiques",
      presentations: "Présentations Exécutives",
      upload_cta: "Gérer les Actifs",
      financials: "États Financiers 2025",
      mou: "Protocole d'Accord",
      download: "Télécharger PDF"
    },
    dest: {
      section_title: "Nos Destinations Exclusives",
      section_subtitle: "Explorez les lieux les plus époustouflants de Colombie pour une expérience de luxe inoubliable.",
      cartagena: { title: "Carthagène et les Îles", desc: "Vivez le romantisme de la ville fortifiée et évadez-vous dans les eaux turquoise des îles Rosario." },
      santamarta: { title: "Santa Marta, Tayrona et Minca", desc: "Le mélange parfait entre plage, montagne et jungle, de la Sierra Nevada à la côte caraibe." },
      cano: { title: "Caño Cristales", desc: "La 'Rivière aux Cinq Couleurs', une merveille naturelle unique au monde." },
      agustin: { title: "San Agustín", desc: "Voyagez dans le passé dans ce mystérieux parc archéologique, classé à l'UNESCO." },
      coffee: { title: "Région du Café et Antioquia", desc: "Plongez dans des paysages luxuriants, un café de classe mondiale et une culture vibrante." },
      amazonas: { title: "Amazonie", desc: "Aventurez-vous au cœur de la plus grande forêt tropicale du monde pour une immersion totale." },
      llanos: { title: "Plaines Orientales", desc: "Découvrez l'authentique culture 'llanera' dans les vastes plaines ensoleillées de Colombie." },
      guajira: { title: "La Guajira", desc: "Désert magique où le sable doré rencontre le turquoise." },
      bogota: { title: "Bogota et l'El Dorado", desc: "Découvrez la capitale vibrante, carrefour de culture, d'histoire et de légendes." }
    },
    assistant: {
      name: "María Fernanda",
      role: "Votre Concierge IA Personnel",
      greeting: "Bonjour ! Je suis María Fernanda. Je suis prête à créer les vacances de vos rêves dans les Caraïbes colombiennes.",
      prompt: "Posez-moi vos questions sur les voyages de luxe en Colombie !",
      placeholder: "Parlez à María Fernanda...",
      suggestion_title: "Essayez une question d'exemple",
      suggestions: ["Île privée pour une semaine", "Villas à Carthagène", "Hélicoptère vers Tayrona"]
    }
  },
  de: {
    hero: {
      title: "Luxus Pur in der Karibik",
      subtitle: "Als Daten- und KI-Pionier schafften wir maßgeschneiderte Erlebnisse mit exklusivem Zugang zu Privatinseln und Yachten.",
      cta: "Planung Starten"
    },
    nav: {
      destinations: "Ziele",
      services: "Dienstleistungen",
      team: "Team",
      metrics: "Metriken",
      investors: "Investoren",
      contact: "Kontaktieren Sie uns"
    },
    investors: {
      title: "Investor Relations",
      subtitle: "Greifen Sie auf exklusive Wachstumsdaten und Finanzprognosen zu.",
      documents: "Strategische Dokumente",
      presentations: "Vorstandspräsentationen",
      upload_cta: "Vermögenswerte verwalten",
      financials: "Finanzberichte 2025",
      mou: "Absichtserklärung (MOU)",
      download: "PDF herunterladen"
    },
    dest: {
      section_title: "Unsere exklusiven Reiseziele",
      section_subtitle: "Entdecken Sie Kolumbiens atemberaubendste Orte für ein unvergessliches Luxuserlebnis.",
      cartagena: { title: "Cartagena und die Inseln", desc: "Erleben Sie die Romantik der befestigten Stadt und entfliehen Sie zum türkisfarbenen Wasser der Rosario-Inseln." },
      santamarta: { title: "Santa Marta, Tayrona und Minca", desc: "Die perfekte Mischung aus Strand, Bergen und Dschungel, von der Sierra Nevada bis zur Karibikküste." },
      cano: { title: "Caño Cristales", desc: "Der 'Fluss der fünf Farben', ein einzigartiges Naturwunder, das man gesehen haben muss." },
      agustin: { title: "San Agustín", desc: "Reisen Sie in diesem mysteriösen Archäologiepark (UNESCO-Welterbe) in die Vergangenheit." },
      coffee: { title: "Kaffeeregion und Antioquia", desc: "Tauchen Sie ein in üppige Landschaften, erstklassigen Kaffee und lebendige Kultur." },
      amazonas: { title: "Amazonas", desc: "Wagen Sie sich ins Herz des größten Regenwaldes der Welt für ein unvergleichliches Erlebnis." },
      llanos: { title: "Östliche Ebenen", desc: "Erleben Sie authentische 'Llanera'-Kultur in den weiten, sonnenverwöhnten Ebenen Ostkolumbiens." },
      guajira: { title: "La Guajira", desc: "Magische Wüste, wo goldener Sand auf Türkis trifft." },
      bogota: { title: "Bogotá und El Dorado", desc: "Entdecken Sie die pulsierende Hauptstadt, ein Zentrum für Kultur, Geschichte und die Legende von El Dorado." }
    },
    assistant: {
      name: "María Fernanda",
      role: "Ihr persönlicher KI-Concierge",
      greeting: "Hallo! Ich bin María Fernanda. Ihr persönlicher KI-Concierge, bereit, Ihren Traumurlaub in der kolumbianischen Karibik zu gestalten.",
      prompt: "Fragen Sie mich alles über Luxusreisen in Kolumbien!",
      placeholder: "Sprechen Sie mit María Fernanda...",
      suggestion_title: "Probieren Sie eine Beispielanfrage",
      suggestions: ["Privatinsel für eine Woche", "Villen in Cartagena", "Hubschrauber nach Tayrona"]
    }
  },
  zh: {
    hero: {
      title: "尊享加勒比极致奢华",
      subtitle: "作为数据驱动和人工智能的先驱，我们专注于定制旅行体验，提供私人岛屿、奢华别墅和游艇的专属使用权。",
      cta: "开始规划"
    },
    nav: {
      destinations: "目的地",
      services: "服务",
      team: "团队",
      metrics: "指标",
      investors: "投资者",
      contact: "联系我们"
    },
    investors: {
      title: "投资者关系",
      subtitle: "访问独家增长数据、财务预测和合作机会。",
      documents: "战略文档",
      presentations: "高管演示",
      upload_cta: "管理资产",
      financials: "2025年财务报表",
      mou: "合作备忘录 (MOU)",
      download: "下载 PDF"
    },
    dest: {
      section_title: "我们的专属目的地",
      section_subtitle: "探索哥伦比亚最令人惊叹的地点，为您策划难忘的奢华体验。",
      cartagena: { title: "卡塔赫纳及其群岛", desc: "体验围城中的浪漫，逃离至附近罗萨里奥群岛的青绿色海水。" },
      santamarta: { title: "圣玛尔塔、泰罗纳和明卡", desc: "从内华达山脉到加勒比海岸，海滩、高山和丛林的完美结合。" },
      cano: { title: "水晶河", desc: "“五彩之河”，必须亲眼目睹才能相信的独特自然奇观。" },
      agustin: { title: "圣奥古斯丁", desc: "在这个神秘的考古公园（联合国教科文组织世界遗产）穿越到过去。" },
      coffee: { title: "咖啡区和安蒂奥基亚", desc: "沉浸在茂密的风景、世界级的咖啡和充满活力的文化中。" },
      amazonas: { title: "亚马逊", desc: "冒险进入世界最大热带雨林的心脏，获得无与伦比的沉浸体验。" },
      llanos: { title: "东部平原", desc: "在哥伦比亚东部广阔阳光明媚的平原体验真实的“拉内拉”文化。" },
      guajira: { title: "La Guajira", desc: "金色的沙漠与青绿色的海水相遇。" },
      bogota: { title: "波哥大与黄金国", desc: "探索充满活力的首都，文化、历史和黄金国传说的中心。" }
    },
    assistant: {
      name: "玛丽亚·费尔南达",
      role: "您的专属人工智能管家",
      greeting: "您好！我是玛丽亚·费尔南达。我准备好为您打造哥伦比亚加勒比地区的梦想假期了。",
      prompt: "询问我任何关于哥伦比亚奢华旅行的问题！",
      placeholder: "与玛丽亚·费尔南达交谈...",
      suggestion_title: "尝试示例查询",
      suggestions: ["私人岛屿一周", "卡塔赫纳别墅", "直升机去泰罗纳"]
    }
  },
  ja: {
    hero: {
      title: "カリブ海の至高の贅沢 Japanese version",
      subtitle: "データ主導のAIパイオニアとして、プライベートアイランドやヨットなど、オーダーメイドの旅行体験を専門に提供しています。",
      cta: "計画を始める"
    },
    nav: {
      destinations: "目的地 Japanese",
      services: "サービス",
      team: "チーム",
      metrics: "指標",
      investors: "投資家",
      contact: "お問い合わせ"
    },
    investors: {
      title: "IR情報（投資家向け）",
      subtitle: "独占的な成長数据、財務予測、および提携機会へのアクセス。",
      documents: "戦略文書",
      presentations: "経営陣によるプレゼンテーション",
      upload_cta: "アセット管理",
      financials: "2025年度財務諸表",
      mou: "基本合意書 (MOU)",
      download: "PDFをダウンロード"
    },
    dest: {
      section_title: "厳選された目的地",
      section_subtitle: "忘れられない贅沢な体験のために、コロンビアで最も素晴らしい場所をご案内します。",
      cartagena: { title: "カルタヘナと諸島", desc: "城壁都市のロマンを体験し、近くのロサリオ諸島のエメラルドグリーンの海へ。" },
      santamarta: { title: "サンタ・マルタ、タイロナ、ミンカ", desc: "シエラネバダからカリブ海沿岸まで、ビーチ、山、ジャングルの完璧な融合。" },
      cano: { title: "カニョ・クリスタレス", desc: "「五色の川」。実際に自分の目で見なければ信じられないほどユニークな自然の驚異。" },
      agustin: { title: "サン・アグスティン", desc: "ユネスコ世界遺産の神秘的な考古学公園で、過去への旅を体験。" },
      coffee: { title: "コーヒー産地と安地王基亜", desc: "豊かな风景、世界クラスのコーヒー、および活気に満ちた文化に浸る。" },
      amazonas: { title: "アマゾン Japanese", desc: "世界最大の熱帯雨林の中心部に足を踏み入れ、比類のない没入体験を。" },
      llanos: { title: "東部平原（リャノス）", desc: "コロンビア東部の广な草原で、本物の「リャネラ」文化を体験。" },
      guajira: { title: "ラ・グアヒーラ", desc: "黄金の砂漠とターコイズブルー Japanese" },
      bogota: { title: "ボゴタとエル・ドラド", desc: "文化、历史、およびエル・ドラドの伝説の中心地である活気ある首都を探索。" }
    },
    assistant: {
      name: "マリア・フェルナンダ",
      role: "専属AIコンシェルジュ",
      greeting: "こんにちは！マリア・フェルナンダです。コロンビア・カリブ海での理想のバケーションを創るお手伝します。",
      prompt: "コロンビアのラグジュアリー旅行について、何でも聞いてください！",
      placeholder: "マリア・フェルナンダと話す...",
      suggestion_title: "クエリの例を試す",
      suggestions: ["プライベートアイランド1週間 Japanese", "カルタヘナのヴィラ", "タイロナへのヘリコプター"]
    }
  }
};










