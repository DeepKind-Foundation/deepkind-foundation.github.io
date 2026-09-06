import contentPl from '@data/content';
import contentEn from '@data/content.en.json';

export type Language = 'pl' | 'en';

export function getContent(lang: Language = 'pl') {
  return lang === 'en' ? contentEn : contentPl;
}
