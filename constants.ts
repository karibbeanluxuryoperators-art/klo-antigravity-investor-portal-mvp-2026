import { Destination, NavItem, Language } from './types';

// Solo Español, Inglés y Portugués
export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' }
];

export const NAV_ITEMS: NavItem[] = [
  { labelKey: 'nav.destinations', href: '#destinos' },
  { labelKey: 'nav.services', href: '#servicios' },
  { labelKey: 'nav.team', href: '#equipo' },
  { labelKey: 'nav.metrics', href: '#metricas' },
  { labelKey: 'nav.experiences', href: 'https://experiencias.karibbeanluxuryoperators.lat' },
  { labelKey: 'nav.investors', href: '#inversionistas'},
];

export const DESTINATIONS: Destination[] = [
  {
    id: '1',
    titleKey: 'dest.cartagena.title',
    descriptionKey: 'dest.cartagena.desc',
    imageUrl: '/images/destinations/pirata.jpg',
    externalLink: 'https://www.isladelpirata.co/',
  },
  {
    id: '2',
    titleKey: 'dest.santamarta.title',
    descriptionKey: 'dest.santamarta.desc',
    imageUrl: '/images/destinations/ciudad-perdida.jpg',
  },
  {
    id: '3',
    titleKey: 'dest.coffee.title',
    descriptionKey: 'dest.coffee.desc',
    imageUrl: '/images/destinations/4472.jpg',
  },
  {
    id: '4',
    titleKey: 'dest.guajira.title',
    descriptionKey: 'dest.guajira.desc',
    imageUrl: '/images/destinations/guajira.webp',
  },
  {
    id: '5',
    titleKey: 'dest.amazonas.title',
    descriptionKey: 'dest.amazonas.desc',
    imageUrl: '/images/destinations/amazonas2.webp',
  },
  {
    id: '6',
    titleKey: 'dest.bogota.title',
    descriptionKey: 'dest.bogota.desc',
    imageUrl: '/images/destinations/eldorado.webp',
  }
];

export const PREMIER_SERVICES = [
  {
    icon: "✈️",
    titleKey: "services.flights.title",
    descriptionKey: "services.flights.desc",
    imageUrl: "/images/premier-services/api-private-aviation.jpg"
  },
  {
    icon: "🏡",
    titleKey: "services.accommodation.title",
    descriptionKey: "services.accommodation.desc",
    imageUrl: "/images/premier-services/api-accomodation.jpg"
  },
  {
    icon: "🚤",
    titleKey: "services.yachts.title",
    descriptionKey: "services.yachts.desc",
    imageUrl: "/images/premier-services/yate-cartagena.webp"
  },
  {
    icon: "🚗",
    titleKey: "services.transport.title",
    descriptionKey: "services.transport.desc",
    imageUrl: "/images/premier-services/vip-transport.jpg"
  },
  {
    icon: "👨‍🍳",
    titleKey: "services.staff.title",
    descriptionKey: "services.staff.desc",
    imageUrl: "/images/premier-services/vip-staffing.jpg"
  },
  {
    icon: "✨",
    titleKey: "services.experiences.title",
    descriptionKey: "services.experiences.desc",
    imageUrl: "/images/premier-services/curated-experiences.jpg"
  }
];

export const PARTNERS = [
  { name: "NetJets", logo: "./images/partners/netjets.svg" },
  { name: "Four Seasons", logo: "./images/partners/fourseasons.svg" },
  { name: "Marriott Luxury", logo: "./images/partners/marriott.svg" },
  { name: "Flapz", logo: "" }
];

export const TEAM = [
  {
    name: "Deiby Villalobos",
    roleKey: "team.deiby.role",
    bioKey: "team.deiby.bio",
    equityKey: "team.equity"
  },
  {
    name: "Jose Fernando Angel Trucco",
    roleKey: "team.jose.role",
    bioKey: "team.jose.bio",
    equityKey: "team.equity"
  },
  {
    name: "Juan Carlos Molina Dussan",
    roleKey: "team.juan.role",
    bioKey: "team.juan.bio",
    equityKey: "team.equity"
  }
];

export const INVESTOR_ASSETS = [
  {
    id: '1',
    nameKey: 'investors.assets.mou',
    type: 'pdf',
    url: '/mou.pdf',
    fileSize: '1.2 MB'
  },
  {
    id: '2',
    nameKey: 'investors.assets.financials',
    type: 'pdf',
    url: '/financials.pdf',
    fileSize: '3.4 MB'
  },
  {
    id: '3',
    nameKey: 'investors.assets.presentation_es',
    type: 'mp4',
    url: 'https://dowdrlxfci6f5q6g.public.blob.vercel-storage.com/klo-esp.mp4',
    fileSize: '11.3 MB'
  },
  {
    id: '4',
    nameKey: 'investors.assets.presentation_en',
    type: 'mp4',
    url: 'https://dowdrlxfci6f5q6g.public.blob.vercel-storage.com/klo-eng.mp4',
    fileSize: '13.7 MB'
  }
];

export const ROADMAP = [
  {
    periodKey: "roadmap.year1.period",
    titleKey: "roadmap.year1.title",
    goalsKey: "roadmap.year1.goals"
  },
  {
    periodKey: "roadmap.year2.period",
    titleKey: "roadmap.year2.title",
    goalsKey: "roadmap.year2.goals"
  },
  {
    periodKey: "roadmap.year3.period",
    titleKey: "roadmap.year3.title",
    goalsKey: "roadmap.year3.goals"
  }
];

// ALL TRANSLATIONS
export const TRANSLATIONS = {
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
      experiences: "Experiencias",
      investors: "Inversionistas",
      contact: "Contáctanos"
    },
    services: {
      section_title: "Servicios Premier",
      section_subtitle: "Experiencias de lujo diseñadas a medida",
      flights: {
        title: "Vuelos Privados (NetJets & Flapz API)",
        desc: "Nuestra infraestructura se integra vía API con NetJets, Flapz y Charter del Caribe para ofrecer disponibilidad instantánea de aeronaves de largo alcance como Gulfstream y Bombardier."
      },
      accommodation: {
        title: "Alojamientos (Smart API)",
        desc: "Sincronización en tiempo real con inventarios globales de Four Seasons y villas privadas. Reserve con un solo clic mediante nuestro motor de reservas automatizado."
      },
      yachts: {
        title: "Yates y Veleros (Direct API)",
        desc: "Gestione el alquiler de yates Bertram y superyates exclusivos a través de nuestra API propia de logística marítima, garantizando el servicio de mayor nivel en el Caribe."
      },
      transport: {
        title: "Transporte Terrestre",
        desc: "Llegue con estilo con nuestra selección de camionetas de lujo Mercedes-Benz, vans y vehículos blindados."
      },
      staff: {
        title: "Personal Exclusivo",
        desc: "Contrate chefs profesionales, DJs, guardaespaldas, enfermeras y niñeras para su estancia de ultra lujo."
      },
      experiences: {
        title: "Experiencias Curadas",
        desc: "Elija entre paquetes prediseñados con todo incluido para una escapada de lujo sin complicaciones."
      }
    },
    experiences: {
      subtitle: "Innovación y Tecnología",
      title: "Experiencia Interactiva",
      description: "Explora nuestro portfolio de destinos y servicios con inteligencia artificial. Una experiencia inmersiva diseñada para inversores y viajeros de lujo.",
      cta: "Explorar Experiencia AI",
      feature1_title: "Asistente IA",
      feature1_desc: "Interactúa con nuestro asistente inteligente",
      feature2_title: "Destinos Virtuales",
      feature2_desc: "Explora cada ubicación en detalle",
      feature3_title: "Portafolio Premium",
      feature3_desc: "Accede a información exclusiva"
    },
    team: {
      section_title: "Nuestro Equipo",
      section_subtitle: "Líderes visionarios con experiencia comprobada",
      deiby: {
        role: "CTO & Director Administrativo",
        bio: "Arquitecto de la plataforma digital. Especialista en desarrollo de sistemas escalables, integraciones API complejas y automatización con IA."
      },
      jose: {
        role: "Director Ventas y Marketing",
        bio: "Visionario del negocio. Líder en creación de alianzas clave y relaciones con inversionistas institucionales."
      },
      juan: {
        role: "Director Operaciones",
        bio: "Visionario y Estratega comercial internacional. Experto en alianzas con brokers de aviación privada y servicios concierge de ultra lujo."
      },
      equity: "25% Equity"
    },
    investors: {
      title: "Relaciones con Inversionistas",
      subtitle: "Acceda a datos de crecimiento exclusivos, proyecciones financieras y oportunidades de asociación.",
      documents: "Documentos Estratégicos",
      presentations: "Presentaciones Ejecutivas",
      upload_cta: "Gestionar Activos",
      download: "Descargar PDF",
      assets: {
        mou: "Memorando de Entendimiento (MOU)",
        financials: "Proyecciones Financieras 2025-2029",
        presentation_es: "KLO Vision 2025 - Presentación Español",
        presentation_en: "KLO Vision 2025 - English Presentation"
      }
    },
    roadmap: {
      section_title: "Hoja de Ruta",
      section_subtitle: "Nuestro plan de crecimiento estratégico",
      year1: {
        period: "Mes 1-12 (Año 1)",
        title: "Fundación y Liderazgo",
        goals: [
          "Incorporar 35 propiedades insignia en el Caribe Colombiano",
          "Lanzar beta con 100 viajeros VIP y lograr product-market fit",
          "Desarrollar API B2B para partners y lanzar membresías premium",
          "Asegurar alianzas clave con agencias de viajes de lujo en EE.UU."
        ]
      },
      year2: {
        period: "Mes 13-24 (Año 2)",
        title: "Crecimiento y Expansión de Servicios",
        goals: [
          "Escalar a 85 propiedades y expandir base de usuarios con marketing dirigido",
          "Mejorar capacidades de IA con más datos y funciones de personalización",
          "Aumentar flujos de ingresos de API y membresías",
          "Lanzar programas de influencers y referidos para impulsar crecimiento orgánico"
        ]
      },
      year3: {
        period: "Mes 25-36 (Año 3)",
        title: "Expansión Caribeña y Escala",
        goals: [
          "Iniciar expansión a otros mercados clave del Caribe (ej. St. Barts, Turks & Caicos)",
          "Lanzamiento público con campaña internacional de PR",
          "Escalar a 150+ propiedades en todo el Caribe",
          "Meta: 35,000 usuarios, 1800 reservas, y establecer KLO como líder regional"
        ]
      }
    },
    dest: {
      section_title: "Nuestros Destinos Exclusivos",
      section_subtitle: "Explore los lugares más impresionantes de Colombia, seleccionados para una experiencia de lujo inolvidable.",
      cartagena: { 
        title: "Cartagena y Las Islas", 
        desc: "Vive el romance de la ciudad amurallada y escápate a las aguas cristalinas de las Islas del Rosario." 
      },
      santamarta: { 
        title: "Santa Marta, Tayrona y Minca", 
        desc: "La mezcla perfecta de playa, montaña y selva, desde la Sierra Nevada hasta la costa Caribe." 
      },
      coffee: { 
        title: "Eje Cafetero y Antioquia", 
        desc: "Sumérjase en paisajes exuberantes, café de clase mundial y la vibrante cultura de Antioquia." 
      },
      guajira: { 
        title: "La Guajira", 
        desc: "Explora el desierto mágico donde las arenas doradas se encuentran con el mar Caribe turquesa." 
      },
      amazonas: { 
        title: "Amazonas", 
        desc: "Aventúrese en el corazón de la selva tropical más grande del mundo para una inmersión inigualable." 
      },
      bogota: { 
        title: "Bogotá y El Dorado", 
        desc: "Descubra la vibrante capital, centro de cultura e historia, y la leyenda de El Dorado." 
      }
    },
    assistant: {
      name: "María Fernanda",
      role: "Tu Conserje Personal de IA",
      greeting: "¡Hola! Soy María Fernanda. Estoy para crear las vacaciones de tus sueños en el Caribe colombiano.",
      prompt: "¡Pregúntame cualquier cosa sobre viajes de lujo en Colombia!",
      placeholder: "Habla con María Fernanda...",
      suggestion_title: "Prueba una consulta de ejemplo",
      suggestions: ["Isla privada por una semana", "Villas en Cartagena", "Helicóptero a Tayrona"]
    },
    metrics: {
      title: "Dashboard de Crecimiento",
      subtitle: "Proyecciones estratégicas basadas en el despliegue de nuestra infraestructura de IA y P&L proyectado.",
      conservative: "Conservador",
      aggressive: "Agresivo",
      chart_label: "Proyecciones de Ingresos y Ganancias Netas (USD)",
      year1: "Año 1",
      year2: "Año 2",
      year3: "Año 3",
      year4: "Año 4",
      year5: "Año 5",
      margin: "Margem",
      revenue: "Ing",
      profit: "Ganancia",
      profit_title: "Meta de Ganancia Neta (Año 5)",
      profit_desc: "Crecimiento escalable del 364% en 5 años basado en optimización de costos operativos.",
      breakeven_title: "Confianza de Punto de Equilibrio",
      breakeven_month: "Mes 4"
    },
    footer: {
      description: "Karibbean Luxury Operators. Redefiniendo el ecosistema del turismo de ultra-lujo en Colombia a través de la tecnología y la pasión por lo extraordinario.",
      connect: "Conecta con nosotros",
      menu_title: "Menú",
      legal_title: "Legal",
      privacy: "Privacidad",
      terms: "Términos",
      cookies: "Cookies",
      tagline: "Lujo Incomparable. Colombia."
    },
    modal: {
      name_placeholder: "Tu Nombre",
      email_placeholder: "Correo electrónico"
    }
  },
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
      experiences: "Experiences",
      investors: "Investors",
      contact: "Contact Us"
    },
    services: {
      section_title: "Premier Services",
      section_subtitle: "Luxury experiences designed to perfection",
      flights: {
        title: "Private Aviation (NetJets & Flapz API)",
        desc: "Our infrastructure integrates via API with NetJets, Flapz, and Charter del Caribe to offer instant availability of long-range aircraft like Gulfstream and Bombardier."
      },
      accommodation: {
        title: "Accommodations (Smart API)",
        desc: "Real-time synchronization with global inventories of Four Seasons and private villas. Book with a single click through our automated booking engine."
      },
      yachts: {
        title: "Yachts & Sailboats (Direct API)",
        desc: "Manage rentals of Bertram yachts and exclusive superyachts through our proprietary maritime logistics API, ensuring the highest level of service in the Caribbean."
      },
      transport: {
        title: "Ground Transportation",
        desc: "Arrive in style with our selection of luxury Mercedes-Benz SUVs, vans, and armored vehicles."
      },
      staff: {
        title: "Exclusive Staff",
        desc: "Hire professional chefs, DJs, bodyguards, nurses, and nannies for your ultra-luxury stay."
      },
      experiences: {
        title: "Curated Experiences",
        desc: "Choose from pre-designed all-inclusive packages for a hassle-free luxury getaway."
      }
    },
    experiences: {
      subtitle: "Innovation & Technology",
      title: "Interactive Experience",
      description: "Explore our portfolio of destinations and services with artificial intelligence. An immersive experience designed for investors and luxury travelers.",
      cta: "Explore AI Experience",
      feature1_title: "AI Assistant",
      feature1_desc: "Interact with our intelligent assistant",
      feature2_title: "Virtual Destinations",
      feature2_desc: "Explore each location in detail",
      feature3_title: "Premium Portfolio",
      feature3_desc: "Access exclusive information"
    },
    team: {
      section_title: "Our Team",
      section_subtitle: "Visionary leaders with proven expertise",
      deiby: {
        role: "CTO & Administrative Director",
        bio: "Digital platform architect. Specialist in scalable systems development, complex API integrations, and AI automation."
      },
      jose: {
        role: "Sales & Marketing Director",
        bio: "Business visionary. Leader in creating key alliances and relationships with institutional investors."
      },
      juan: {
        role: "Operations Director",
        bio: "Visionary and international commercial strategist. Expert in alliances with private aviation brokers and ultra-luxury concierge services."
      },
      equity: "25% Equity"
    },
    investors: {
      title: "Investor Relations",
      subtitle: "Access exclusive growth data, financial projections, and partnership opportunities.",
      documents: "Strategic Documents",
      presentations: "Executive Presentations",
      upload_cta: "Manage Assets",
      download: "Download PDF",
      assets: {
        mou: "Memorandum of Understanding (MOU)",
        financials: "Financial Projections 2025-2029",
        presentation_es: "KLO Vision 2025 - Spanish Presentation",
        presentation_en: "KLO Vision 2025 - English Presentation"
      }
    },
    roadmap: {
      section_title: "Roadmap",
      section_subtitle: "Our strategic growth plan",
      year1: {
        period: "Month 1-12 (Year 1)",
        title: "Foundation & Leadership",
        goals: [
          "Onboard 35 flagship properties in Colombian Caribbean",
          "Launch beta with 100 VIP travelers & achieve product-market fit",
          "Develop B2B API for partners & launch premium memberships",
          "Secure key partnerships with luxury travel agencies in the US"
        ]
      },
      year2: {
        period: "Month 13-24 (Year 2)",
        title: "Growth & Service Expansion",
        goals: [
          "Scale to 85 properties and expand user base through targeted marketing",
          "Enhance AI capabilities with more data and personalization features",
          "Grow API and membership revenue streams",
          "Launch influencer & referral programs to boost organic growth"
        ]
      },
      year3: {
        period: "Month 25-36 (Year 3)",
        title: "Caribbean Expansion & Scale",
        goals: [
          "Initiate expansion to other key Caribbean markets (e.g., St. Barts, Turks & Caicos)",
          "Public launch with international PR push",
          "Scale to 150+ properties across the Caribbean",
          "Target: 35,000 users, 1800 bookings, and establish KLO as a top regional player"
        ]
      }
    },
    dest: {
      section_title: "Our Exclusive Destinations",
      section_subtitle: "Explore Colombia's most stunning locations, curated for an unforgettable luxury experience.",
      cartagena: { 
        title: "Cartagena & The Islands", 
        desc: "Experience the romance of the walled city and escape to the turquoise waters of the nearby Rosario Islands." 
      },
      santamarta: { 
        title: "Santa Marta, Tayrona & Minca", 
        desc: "The perfect blend of beach, mountain, and jungle, from the Sierra Nevada to the Caribbean coast." 
      },
      coffee: { 
        title: "Coffee Region & Antioquia", 
        desc: "Immerse yourself in lush landscapes, world-class coffee, and vibrant culture." 
      },
      guajira: { 
        title: "La Guajira", 
        desc: "Explore the magical desert where golden sands meet the turquoise Caribbean sea." 
      },
      amazonas: { 
        title: "Amazonas", 
        desc: "Venture into the heart of the world's largest rainforest for unmatched immersion." 
      },
      bogota: { 
        title: "Bogotá & El Dorado", 
        desc: "Discover the vibrant capital, a hub of culture, history, and the legend of El Dorado." 
      }
    },
    assistant: {
      name: "María Fernanda",
      role: "Your Personal AI Concierge",
      greeting: "Hello! I'm María Fernanda. I'm ready to create the Caribbean vacation of your dreams.",
      prompt: "Ask me anything about luxury travel in Colombia!",
      placeholder: "Talk to María Fernanda...",
      suggestion_title: "Try a sample query",
      suggestions: ["Private island for a week", "Villas in Cartagena", "Helicopter to Tayrona"]
    },
    metrics: {
      title: "Growth Dashboard",
      subtitle: "Strategic projections based on our AI infrastructure deployment and projected P&L.",
      conservative: "Conservative",
      aggressive: "Aggressive",
      chart_label: "Revenue & Net Profit Projections (USD)",
      year1: "Year 1",
      year2: "Year 2",
      year3: "Year 3",
      year4: "Year 4",
      year5: "Year 5",
      margin: "Margin",
      revenue: "Rev",
      profit: "Profit",
      profit_title: "Net Profit Target (Year 5)",
      profit_desc: "Scalable growth of 364% over 5 years based on operational cost optimization.",
      breakeven_title: "Breakeven Confidence",
      breakeven_month: "Month 4"
    },
    footer: {
      description: "Karibbean Luxury Operators. Redefining the ultra-luxury tourism ecosystem in Colombia through technology and passion for the extraordinary.",
      connect: "Connect with us",
      menu_title: "Menu",
      legal_title: "Legal",
      privacy: "Privacy",
      terms: "Terms",
      cookies: "Cookies",
      tagline: "Unparalleled Luxury. Colombia."
    },
    modal: {
      name_placeholder: "Your Name",
      email_placeholder: "Email"
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
      experiences: "Experiências",
      investors: "Investidores",
      contact: "Contate-nos"
    },
    services: {
      section_title: "Serviços Premier",
      section_subtitle: "Experiências de luxo desenhadas com perfeição",
      flights: {
        title: "Aviação Privada (NetJets & Flapz API)",
        desc: "Nossa infraestrutura integra via API com NetJets, Flapz e Charter del Caribe para oferecer disponibilidade instantânea de aeronaves de longo alcance como Gulfstream e Bombardier."
      },
      accommodation: {
        title: "Acomodações (Smart API)",
        desc: "Sincronização em tempo real com inventários globais de Four Seasons e vilas privadas. Reserve com um clique através de nosso motor de reservas automatizado."
      },
      yachts: {
        title: "Iates e Veleiros (Direct API)",
        desc: "Gerencie o aluguel de iates Bertram e superyachts exclusivos através de nossa API própria de logística marítima, garantindo o mais alto nível de serviço no Caribe."
      },
      transport: {
        title: "Transporte Terrestre",
        desc: "Chegue com estilo com nossa seleção de SUVs de luxo Mercedes-Benz, vans e veículos blindados."
      },
      staff: {
        title: "Equipe Exclusiva",
        desc: "Contrate chefs profissionais, DJs, seguranças, enfermeiras e babás para sua estadia de ultra luxo."
      },
      experiences: {
        title: "Experiências Curadas",
        desc: "Escolha entre pacotes pré-desenhados all-inclusive para uma escapada de luxo sem complicações."
      }
    },
    experiences: {
      subtitle: "Inovação e Tecnologia",
      title: "Experiência Interativa",
      description: "Explore nosso portfólio de destinos e serviços com inteligência artificial. Uma experiência imersiva projetada para investidores e viajantes de luxo.",
      cta: "Explorar Experiência AI",
      feature1_title: "Assistente IA",
      feature1_desc: "Interaja com nosso assistente inteligente",
      feature2_title: "Destinos Virtuais",
      feature2_desc: "Explore cada localização em detalhes",
      feature3_title: "Portfólio Premium",
      feature3_desc: "Acesse informações exclusivas"
    },
    team: {
      section_title: "Nossa Equipe",
      section_subtitle: "Líderes visionários com expertise comprovada",
      deiby: {
        role: "CTO & Diretor Administrativo",
        bio: "Arquiteto da plataforma digital. Especialista em desenvolvimento de sistemas escaláveis, integrações API complexas e automação com IA."
      },
      jose: {
        role: "Diretor de Vendas e Marketing",
        bio: "Visionário do negócio. Líder na criação de alianças chave e relações com investidores institucionais."
      },
      juan: {
        role: "Diretor de Operações",
        bio: "Visionário e Estrategista comercial internacional. Especialista em alianças com brokers de aviação privada e serviços de concierge de ultra luxo."
      },
      equity: "25% Equity"
    },
    investors: {
      title: "Relações com Investidores",
      subtitle: "Acesse dados exclusivos de crescimento, projeções financeiras e oportunidades.",
      documents: "Documentos Estratégicos",
      presentations: "Apresentações Executivas",
      upload_cta: "Gerenciar Ativos",
      download: "Baixar PDF",
      assets: {
        mou: "Memorando de Entendimento",
        financials: "Projeções Financeiras 2025-2029",
        presentation_es: "KLO Vision 2025 - Apresentação Espanhol",
        presentation_en: "KLO Vision 2025 - Apresentação Inglês"
      }
    },
    roadmap: {
      section_title: "Roteiro",
      section_subtitle: "Nosso plano de crescimento estratégico",
      year1: {
        period: "Mês 1-12 (Ano 1)",
        title: "Fundação e Liderança",
        goals: [
          "Incorporar 35 propriedades principais no Caribe Colombiano",
          "Lançar beta com 100 viajantes VIP e alcançar product-market fit",
          "Desenvolver API B2B para parceiros e lançar memberships premium",
          "Garantir parcerias chave com agências de viagens de luxo nos EUA"
        ]
      },
      year2: {
        period: "Mês 13-24 (Ano 2)",
        title: "Crescimento e Expansão de Serviços",
        goals: [
          "Escalar para 85 propriedades e expandir base de usuários através de marketing direcionado",
          "Melhorar capacidades de IA com mais dados e recursos de personalização",
          "Aumentar fluxos de receita de API e memberships",
          "Lançar programas de influencers e referências para impulsionar crescimento orgânico"
        ]
      },
      year3: {
        period: "Mês 25-36 (Ano 3)",
        title: "Expansão Caribenha e Escala",
        goals: [
          "Iniciar expansão para outros mercados chave do Caribe (ex. St. Barts, Turks & Caicos)",
          "Lançamento público com campanha internacional de PR",
          "Escalar para 150+ propriedades em todo o Caribe",
          "Meta: 35,000 usuários, 1800 reservas, e estabelecer KLO como líder regional"
        ]
      }
    },
    dest: {
      section_title: "Nossos Destinos Exclusivos",
      section_subtitle: "Explore os locais mais deslumbrantes da Colômbia para uma experiência de luxo inesquecível.",
      cartagena: { 
        title: "Cartagena e as Ilhas", 
        desc: "Vivencie o romance da cidade murada e escape para as águas azul-turquesa das Ilhas do Rosário." 
      },
      santamarta: { 
        title: "Santa Marta, Tayrona e Minca", 
        desc: "A mistura perfeita de praia, montanha e selva, da Sierra Nevada à costa caribenha." 
      },
      coffee: { 
        title: "Eixo Cafeeiro e Antioquia", 
        desc: "Mergulhe em paisagens exuberantes, café de classe mundial e cultura vibrante." 
      },
      guajira: { 
        title: "La Guajira", 
        desc: "Explore o deserto mágico onde as areias douradas encontram o mar Caribe turquesa." 
      },
      amazonas: { 
        title: "Amazonas", 
        desc: "Aventure-se no coração da maior floresta tropical do mundo para uma imersão incomparável." 
      },
      bogota: { 
        title: "Bogotá e El Dorado", 
        desc: "Descubra a vibrante capital, centro de cultura, história e a lenda de El Dorado." 
      }
    },
    assistant: {
      name: "María Fernanda",
      role: "Sua Concierge Pessoal de IA",
      greeting: "Olá! Sou María Fernanda. Estou pronta para criar as férias dos seus sonhos no Caribe colombiano.",
      prompt: "Pergunte-me qualquer coisa sobre viagens de luxo na Colômbia!",
      placeholder: "Fale com María Fernanda...",
      suggestion_title: "Tente uma consulta de exemplo",
      suggestions: ["Ilha privada por uma semana", "Villas em Cartagena", "Helicóptero para Tayrona"]
    },
    metrics: {
      title: "Dashboard de Crescimento",
      subtitle: "Projeções estratégicas baseadas na implantação da nossa infraestrutura de IA e P&L projetado.",
      conservative: "Conservador",
      aggressive: "Agressivo",
      chart_label: "Projeções de Receita e Lucro Líquido (USD)",
      year1: "Ano 1",
      year2: "Ano 2",
      year3: "Ano 3",
      year4: "Ano 4",
      year5: "Ano 5",
      margin: "Margem",
      revenue: "Rec",
      profit: "Lucro",
      profit_title: "Meta de Lucro Líquido (Ano 5)",
      profit_desc: "Crescimento escalável de 364% em 5 anos baseado na otimização de custos operacionais.",
      breakeven_title: "Confiança de Ponto de Equilíbrio",
      breakeven_month: "Mês 4"
    },
    footer: {
      description: "Karibbean Luxury Operators. Redefinindo o ecossistema do turismo de ultra-luxo na Colômbia através da tecnologia e paixão pelo extraordinário.",
      connect: "Conecte-se conosco",
      menu_title: "Menu",
      legal_title: "Legal",
      privacy: "Privacidade",
      terms: "Termos",
      cookies: "Cookies",
      tagline: "Luxo Incomparável. Colômbia."
    },
    modal: {
      name_placeholder: "Seu Nome",
      email_placeholder: "E-mail"
    }
  }
};

// Translation helper function - THIS GOES AT THE VERY END OF THE FILE
export const getTranslation = (key: string, lang: Language): any => {
  const keys = key.split('.');
  let value: any = TRANSLATIONS[lang];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Try fallback to Spanish
      let fallback: any = TRANSLATIONS['es'];
      for (const fk of keys) {
        if (fallback && typeof fallback === 'object' && fk in fallback) {
          fallback = fallback[fk];
        } else {
          return key; // Return key if not found anywhere
        }
      }
      return fallback;
    }
  }
  
  return value ?? key;
};
