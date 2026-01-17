
export type Language = 'en' | 'es' | 'pt' | 'it' | 'fr' | 'zh' | 'ja' | 'de';

export interface Destination {
  id: string;
  titleKey: string;
  descriptionKey: string;
  imageUrl: string;
  externalLink?: string;
}

export interface NavItem {
  labelKey: string;
  href: string;
}
