import { Injectable } from '@nestjs/common';
import { Language } from '@prisma/client';

@Injectable()
export class LanguageService {
  private malayalamRegex = /[ഀ-ൿ]/g;
  private manglishPatterns = /\b(anu|oru|njan|njal|nalla|illa|undo|alle|aano|enth|enthanu|evide|engane|ningal|avide|ippo|athu|ithu|ethu|cheythu|paranju|pokum|varum|kanum)\b/gi;
  private englishRegex = /^[a-zA-Z\s\d.,!?'"()-]+$/;

  detectLanguage(text: string): Language {
    const malayalamMatches = text.match(this.malayalamRegex) || [];
    const malayalamRatio = malayalamMatches.length / text.length;

    if (malayalamRatio > 0.3) {
      return 'MALAYALAM';
    }

    if (this.isManglish(text)) {
      return 'MANGLISH';
    }

    if (this.englishRegex.test(text.trim())) {
      return 'ENGLISH';
    }

    return 'MIXED';
  }

  isManglish(text: string): boolean {
    const matches = text.match(this.manglishPatterns) || [];
    return matches.length >= 2;
  }

  normalizeText(text: string): string {
    return text.normalize('NFC');
  }

  processContent(text: string): { originalText: string; normalizedText: string; language: Language; isManglish: boolean } {
    const originalText = text;
    const normalizedText = this.normalizeText(originalText);
    const language = this.detectLanguage(originalText);
    const isManglish = language === 'MANGLISH';

    return { originalText, normalizedText, language, isManglish };
  }
}
