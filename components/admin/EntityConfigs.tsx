import type { EntityConfig } from './EntityEditor';

// ── Entity configs (v1.8.0 Step 11) ──────────────────────────────────────────
// One config per entity type. The EntityEditor reads this and renders the
// form, list, and detail modal. All three share the same component + the
// same trilingual EN/ES/PT field pattern.

export const EXPERIENCES_CONFIG: EntityConfig = {
  name:        { EN: 'Experiences',  ES: 'Experiencias', PT: 'Experiências' },
  nameSingular:{ EN: 'Experience',   ES: 'Experiencia',  PT: 'Experiência'  },
  apiBase:     '/api/experiences',
  idKey:       'id',
  defaultSort: { key: 'display_order', order: 'asc' },
  filters: [
    { value: 'ALL',       label: { EN: 'All',        ES: 'Todos',       PT: 'Todos' } },
    { value: 'PUBLISHED', label: { EN: 'Published',  ES: 'Publicado',   PT: 'Publicado' } },
    { value: 'DRAFT',     label: { EN: 'Draft',      ES: 'Borrador',    PT: 'Rascunho' } },
    { value: 'ARCHIVED',  label: { EN: 'Archived',   ES: 'Archivado',   PT: 'Arquivado' } },
  ],
  fields: [
    { kind: 'text',   key: 'id',     label: { EN: 'Slug',  ES: 'Slug',  PT: 'Slug'  }, required: true,
      placeholder: { EN: 'cartagena-week', ES: 'cartagena-week', PT: 'cartagena-week' } },
    { kind: 'trilingual', key: 'title', label: { EN: 'Title', ES: 'Título', PT: 'Título' }, subKind: 'text', required: true, maxLength: 80 },
    { kind: 'trilingual', key: 'eyebrow', label: { EN: 'Eyebrow', ES: 'Etiqueta', PT: 'Etiqueta' }, subKind: 'text', maxLength: 60 },
    { kind: 'trilingual', key: 'summary', label: { EN: 'Summary (50 words)', ES: 'Resumen (50 palabras)', PT: 'Resumo (50 palavras)' }, subKind: 'textarea', maxLength: 500 },
    { kind: 'trilingual', key: 'description', label: { EN: 'Full Description', ES: 'Descripción Completa', PT: 'Descrição Completa' }, subKind: 'textarea', maxLength: 2000, rows: 5 },
    { kind: 'multiselect', key: 'pillars', label: { EN: 'Pillars', ES: 'Pilares', PT: 'Pilares' }, required: true,
      options: [
        { value: 'AVIATION',  label: { EN: 'Aviation',   ES: 'Aviación',    PT: 'Aviação' } },
        { value: 'YACHTS',    label: { EN: 'Yachts',     ES: 'Yates',       PT: 'Iates' } },
        { value: 'LODGING',   label: { EN: 'Lodging',    ES: 'Alojamiento', PT: 'Hospedagem' } },
        { value: 'STAFF',     label: { EN: 'Staff',      ES: 'Personal',    PT: 'Equipe' } },
        { value: 'TRANSPORT', label: { EN: 'Transport',  ES: 'Transporte',  PT: 'Transporte' } },
      ] },
    { kind: 'number',  key: 'days',       label: { EN: 'Days', ES: 'Días', PT: 'Dias' }, min: 1, max: 30, required: true },
    { kind: 'number',  key: 'price_from', label: { EN: 'Price From (USD)', ES: 'Precio Desde (USD)', PT: 'Preço A Partir De (USD)' }, min: 0, step: 500, required: true },
    { kind: 'image',   key: 'hero_image', label: { EN: 'Hero Image', ES: 'Imagen Principal', PT: 'Imagem Principal' }, multiple: false },
    { kind: 'image',   key: 'gallery',    label: { EN: 'Gallery', ES: 'Galería', PT: 'Galeria' }, multiple: true, max: 5 },
    { kind: 'itinerary', key: 'itinerary', label: { EN: 'Itinerary', ES: 'Itinerario', PT: 'Roteiro' } },
    { kind: 'select',  key: 'status',     label: { EN: 'Status', ES: 'Estado', PT: 'Estado' },
      options: [
        { value: 'DRAFT',     label: { EN: 'Draft',     ES: 'Borrador',  PT: 'Rascunho' } },
        { value: 'PUBLISHED', label: { EN: 'Published', ES: 'Publicado', PT: 'Publicado' } },
        { value: 'ARCHIVED',  label: { EN: 'Archived',  ES: 'Archivado', PT: 'Arquivado' } },
      ] },
    { kind: 'boolean', key: 'featured',   label: { EN: 'Featured', ES: 'Destacado', PT: 'Destaque' } },
    { kind: 'number',  key: 'display_order', label: { EN: 'Display Order', ES: 'Orden', PT: 'Ordem' }, min: 0 },
  ],
};

export const SUPPLIERS_CONFIG: EntityConfig = {
  name:        { EN: 'Suppliers',  ES: 'Socios',    PT: 'Parceiros' },
  nameSingular:{ EN: 'Supplier',   ES: 'Socio',     PT: 'Parceiro'  },
  apiBase:     '/api/suppliers',
  idKey:       'id',
  defaultSort: { key: 'created_at', order: 'desc' },
  filters: [
    { value: 'ALL',       label: { EN: 'All',        ES: 'Todos',       PT: 'Todos' } },
    { value: 'APPROVED',  label: { EN: 'Approved',   ES: 'Aprobados',   PT: 'Aprovados' } },
    { value: 'PENDING',   label: { EN: 'Pending',    ES: 'Pendientes',  PT: 'Pendentes' } },
    { value: 'REJECTED',  label: { EN: 'Rejected',   ES: 'Rechazados',  PT: 'Rejeitados' } },
  ],
  fields: [
    { kind: 'trilingual', key: 'business_name', label: { EN: 'Business Name', ES: 'Nombre', PT: 'Nome' }, subKind: 'text', required: true, maxLength: 120 },
    { kind: 'text',    key: 'contact_name',    label: { EN: 'Contact Name', ES: 'Contacto', PT: 'Contato' } },
    { kind: 'text',    key: 'email',           label: { EN: 'Email', ES: 'Correo', PT: 'E-mail' } },
    { kind: 'text',    key: 'whatsapp',        label: { EN: 'WhatsApp', ES: 'WhatsApp', PT: 'WhatsApp' } },
    { kind: 'text',    key: 'location',        label: { EN: 'Location', ES: 'Ubicación', PT: 'Localização' } },
    { kind: 'select',  key: 'asset_type',      label: { EN: 'Pillar', ES: 'Pilar', PT: 'Pilar' },
      options: [
        { value: 'AVIATION',  label: { EN: 'Aviation',   ES: 'Aviación',   PT: 'Aviação' } },
        { value: 'YACHTS',    label: { EN: 'Yachts',     ES: 'Yates',      PT: 'Iates' } },
        { value: 'LODGING',   label: { EN: 'Lodging',    ES: 'Alojamiento',PT: 'Hospedagem' } },
        { value: 'STAFF',     label: { EN: 'Staff',      ES: 'Personal',   PT: 'Equipe' } },
        { value: 'TRANSPORT', label: { EN: 'Transport',  ES: 'Transporte', PT: 'Transporte' } },
      ] },
    { kind: 'trilingual', key: 'description', label: { EN: 'Description', ES: 'Descripción', PT: 'Descrição' }, subKind: 'textarea', maxLength: 2000, rows: 4 },
    { kind: 'image',   key: 'photo_url',       label: { EN: 'Photo', ES: 'Foto', PT: 'Foto' }, multiple: false },
    { kind: 'select',  key: 'status',          label: { EN: 'Status', ES: 'Estado', PT: 'Estado' },
      options: [
        { value: 'PENDING',  label: { EN: 'Pending',  ES: 'Pendiente', PT: 'Pendente' } },
        { value: 'APPROVED', label: { EN: 'Approved', ES: 'Aprobado',  PT: 'Aprovado' } },
        { value: 'REJECTED', label: { EN: 'Rejected', ES: 'Rechazado', PT: 'Rejeitado' } },
      ] },
  ],
};

export const ASSETS_CONFIG: EntityConfig = {
  name:        { EN: 'Services',   ES: 'Servicios', PT: 'Serviços' },
  nameSingular:{ EN: 'Service',    ES: 'Servicio',  PT: 'Serviço'   },
  apiBase:     '/api/assets',
  idKey:       'id',
  defaultSort: { key: 'created_at', order: 'desc' },
  filters: [
    { value: 'ALL',        label: { EN: 'All',         ES: 'Todos',        PT: 'Todos' } },
    { value: 'AVAILABLE',  label: { EN: 'Available',   ES: 'Disponibles',  PT: 'Disponíveis' } },
    { value: 'BOOKED',     label: { EN: 'Booked',      ES: 'Reservados',   PT: 'Reservados' } },
    { value: 'MAINTENANCE',label: { EN: 'Maintenance', ES: 'Mantenimiento',PT: 'Manutenção' } },
    { value: 'RETIRED',    label: { EN: 'Retired',     ES: 'Retirados',    PT: 'Retirados' } },
  ],
  fields: [
    { kind: 'trilingual', key: 'name', label: { EN: 'Name', ES: 'Nombre', PT: 'Nome' }, subKind: 'text', required: true, maxLength: 120 },
    { kind: 'select',  key: 'supplier_id', label: { EN: 'Supplier', ES: 'Socio', PT: 'Parceiro' },
      options: 'dynamic:/api/suppliers?status=APPROVED' },
    { kind: 'select',  key: 'asset_type', label: { EN: 'Pillar', ES: 'Pilar', PT: 'Pilar' },
      options: [
        { value: 'AVIATION',  label: { EN: 'Aviation',   ES: 'Aviación',   PT: 'Aviação' } },
        { value: 'YACHTS',    label: { EN: 'Yachts',     ES: 'Yates',      PT: 'Iates' } },
        { value: 'LODGING',   label: { EN: 'Lodging',    ES: 'Alojamiento',PT: 'Hospedagem' } },
        { value: 'STAFF',     label: { EN: 'Staff',      ES: 'Personal',   PT: 'Equipe' } },
        { value: 'TRANSPORT', label: { EN: 'Transport',  ES: 'Transporte', PT: 'Transporte' } },
      ] },
    { kind: 'trilingual', key: 'description', label: { EN: 'Description', ES: 'Descripción', PT: 'Descrição' }, subKind: 'textarea', maxLength: 2000, rows: 4 },
    { kind: 'number',  key: 'price_per_night', label: { EN: 'Per Night (USD)', ES: 'Por Noche (USD)', PT: 'Por Noite (USD)' }, min: 0 },
    { kind: 'number',  key: 'price_per_day',   label: { EN: 'Per Day (USD)',   ES: 'Por Día (USD)',   PT: 'Por Dia (USD)' },   min: 0 },
    { kind: 'number',  key: 'price_per_hour',  label: { EN: 'Per Hour (USD)',  ES: 'Por Hora (USD)',  PT: 'Por Hora (USD)' },  min: 0 },
    { kind: 'number',  key: 'capacity',        label: { EN: 'Capacity', ES: 'Capacidad', PT: 'Capacidade' }, min: 1 },
    { kind: 'text',    key: 'location',        label: { EN: 'Location', ES: 'Ubicación', PT: 'Localização' } },
    { kind: 'image',   key: 'photos',          label: { EN: 'Photos', ES: 'Fotos', PT: 'Fotos' }, multiple: true, max: 8 },
    { kind: 'select',  key: 'status',          label: { EN: 'Status', ES: 'Estado', PT: 'Estado' },
      options: [
        { value: 'AVAILABLE',   label: { EN: 'Available',   ES: 'Disponible',   PT: 'Disponível' } },
        { value: 'BOOKED',      label: { EN: 'Booked',      ES: 'Reservado',    PT: 'Reservado' } },
        { value: 'MAINTENANCE', label: { EN: 'Maintenance', ES: 'Mantenimiento',PT: 'Manutenção' } },
        { value: 'RETIRED',     label: { EN: 'Retired',     ES: 'Retirado',     PT: 'Retirado' } },
      ] },
  ],
};
