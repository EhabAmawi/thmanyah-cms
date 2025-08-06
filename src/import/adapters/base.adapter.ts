import { Language, MediaType, SourceType } from '@prisma/client';

export interface ImportedContent {
  name: string;
  description?: string;
  language: Language;
  durationSec: number;
  releaseDate: Date;
  mediaUrl: string;
  mediaType: MediaType;
  sourceType: SourceType;
  sourceUrl: string;
  externalId: string;
}

export interface ChannelImportOptions {
  channelId: string;
  limit?: number;
  categoryId?: string;
}

export interface VideoImportOptions {
  url: string;
  categoryId?: string;
}

export interface ImportResult {
  success: boolean;
  imported: ImportedContent[];
  errors: string[];
  duplicatesSkipped: number;
}

export abstract class BaseContentAdapter {
  abstract readonly sourceType: SourceType;
  abstract readonly supportedDomains: string[];

  abstract importVideo(options: VideoImportOptions): Promise<ImportedContent>;
  abstract importChannel(
    options: ChannelImportOptions,
  ): Promise<ImportedContent[]>;
  abstract extractVideoId(url: string): string | null;
  abstract validateUrl(url: string): boolean;

  protected mapLanguageFromString(language: string): Language {
    const lang = language.toLowerCase();
    if (lang.includes('ar') || lang.includes('arabic')) {
      return Language.ARABIC;
    }
    return Language.ENGLISH;
  }

  protected mapMediaTypeFromString(type: string): MediaType {
    const mediaType = type.toLowerCase();
    if (mediaType.includes('audio') || mediaType.includes('podcast')) {
      return MediaType.AUDIO;
    }
    return MediaType.VIDEO;
  }

  protected sanitizeDuration(duration: string | number): number {
    if (typeof duration === 'number') {
      return Math.max(0, duration);
    }

    // Parse ISO 8601 duration (PT4M13S format)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (match) {
      const hours = parseInt(match[1] || '0', 10);
      const minutes = parseInt(match[2] || '0', 10);
      const seconds = parseInt(match[3] || '0', 10);
      return hours * 3600 + minutes * 60 + seconds;
    }

    return 0;
  }
}
