import { Language, MediaType, SourceType } from '@prisma/client';
import { 
  BaseContentAdapter, 
  ImportedContent, 
  VideoImportOptions, 
  ChannelImportOptions 
} from './base.adapter';

class TestAdapter extends BaseContentAdapter {
  readonly sourceType = SourceType.YOUTUBE;
  readonly supportedDomains = ['test.com'];

  async importVideo(options: VideoImportOptions): Promise<ImportedContent> {
    return {
      name: 'Test Video',
      description: 'Test Description',
      language: Language.ENGLISH,
      durationSec: 300,
      releaseDate: new Date(),
      mediaUrl: options.url,
      mediaType: MediaType.VIDEO,
      sourceType: this.sourceType,
      sourceUrl: options.url,
      externalId: 'test123'
    };
  }

  async importChannel(options: ChannelImportOptions): Promise<ImportedContent[]> {
    return [];
  }

  extractVideoId(url: string): string | null {
    return url.includes('test.com') ? 'test123' : null;
  }

  validateUrl(url: string): boolean {
    return this.supportedDomains.some(domain => url.includes(domain));
  }
}

describe('BaseContentAdapter', () => {
  let adapter: TestAdapter;

  beforeEach(() => {
    adapter = new TestAdapter();
  });

  describe('mapLanguageFromString', () => {
    it('should map Arabic language variants to ARABIC', () => {
      expect(adapter['mapLanguageFromString']('ar')).toBe(Language.ARABIC);
      expect(adapter['mapLanguageFromString']('Arabic')).toBe(Language.ARABIC);
      expect(adapter['mapLanguageFromString']('AR')).toBe(Language.ARABIC);
      expect(adapter['mapLanguageFromString']('arabic-eg')).toBe(Language.ARABIC);
    });

    it('should map other languages to ENGLISH', () => {
      expect(adapter['mapLanguageFromString']('en')).toBe(Language.ENGLISH);
      expect(adapter['mapLanguageFromString']('English')).toBe(Language.ENGLISH);
      expect(adapter['mapLanguageFromString']('fr')).toBe(Language.ENGLISH);
      expect(adapter['mapLanguageFromString']('spanish')).toBe(Language.ENGLISH);
      expect(adapter['mapLanguageFromString']('')).toBe(Language.ENGLISH);
    });
  });

  describe('mapMediaTypeFromString', () => {
    it('should map audio types to AUDIO', () => {
      expect(adapter['mapMediaTypeFromString']('audio')).toBe(MediaType.AUDIO);
      expect(adapter['mapMediaTypeFromString']('Audio')).toBe(MediaType.AUDIO);
      expect(adapter['mapMediaTypeFromString']('podcast')).toBe(MediaType.AUDIO);
      expect(adapter['mapMediaTypeFromString']('PODCAST')).toBe(MediaType.AUDIO);
    });

    it('should map other types to VIDEO', () => {
      expect(adapter['mapMediaTypeFromString']('video')).toBe(MediaType.VIDEO);
      expect(adapter['mapMediaTypeFromString']('Video')).toBe(MediaType.VIDEO);
      expect(adapter['mapMediaTypeFromString']('movie')).toBe(MediaType.VIDEO);
      expect(adapter['mapMediaTypeFromString']('')).toBe(MediaType.VIDEO);
      expect(adapter['mapMediaTypeFromString']('unknown')).toBe(MediaType.VIDEO);
    });
  });

  describe('sanitizeDuration', () => {
    it('should handle numeric duration', () => {
      expect(adapter['sanitizeDuration'](300)).toBe(300);
      expect(adapter['sanitizeDuration'](0)).toBe(0);
      expect(adapter['sanitizeDuration'](-10)).toBe(0); // Should not allow negative
    });

    it('should parse ISO 8601 duration format', () => {
      expect(adapter['sanitizeDuration']('PT4M13S')).toBe(253); // 4*60 + 13 = 253
      expect(adapter['sanitizeDuration']('PT1H30M45S')).toBe(5445); // 1*3600 + 30*60 + 45 = 5445
      expect(adapter['sanitizeDuration']('PT2H')).toBe(7200); // 2*3600 = 7200
      expect(adapter['sanitizeDuration']('PT30M')).toBe(1800); // 30*60 = 1800
      expect(adapter['sanitizeDuration']('PT45S')).toBe(45); // 45
    });

    it('should handle invalid duration formats', () => {
      expect(adapter['sanitizeDuration']('invalid')).toBe(0);
      expect(adapter['sanitizeDuration']('')).toBe(0);
      expect(adapter['sanitizeDuration']('5 minutes')).toBe(0);
    });

    it('should handle partial ISO 8601 formats', () => {
      expect(adapter['sanitizeDuration']('PT10M')).toBe(600); // 10*60 = 600
      expect(adapter['sanitizeDuration']('PT30S')).toBe(30); // 30
      expect(adapter['sanitizeDuration']('PT2H30M')).toBe(9000); // 2*3600 + 30*60 = 9000
    });
  });

  describe('abstract methods implementation', () => {
    it('should have correct sourceType', () => {
      expect(adapter.sourceType).toBe(SourceType.YOUTUBE);
    });

    it('should have supported domains', () => {
      expect(adapter.supportedDomains).toEqual(['test.com']);
    });

    it('should implement importVideo', async () => {
      const options: VideoImportOptions = {
        url: 'https://test.com/video/123',
        categoryId: 'cat-123'
      };
      
      const result = await adapter.importVideo(options);
      
      expect(result).toBeDefined();
      expect(result.name).toBe('Test Video');
      expect(result.sourceType).toBe(SourceType.YOUTUBE);
      expect(result.mediaUrl).toBe(options.url);
    });

    it('should implement importChannel', async () => {
      const options: ChannelImportOptions = {
        channelId: 'channel123',
        limit: 5
      };
      
      const result = await adapter.importChannel(options);
      
      expect(result).toEqual([]);
    });

    it('should implement extractVideoId', () => {
      expect(adapter.extractVideoId('https://test.com/video/123')).toBe('test123');
      expect(adapter.extractVideoId('https://other.com/video/123')).toBeNull();
    });

    it('should implement validateUrl', () => {
      expect(adapter.validateUrl('https://test.com/video/123')).toBe(true);
      expect(adapter.validateUrl('https://other.com/video/123')).toBe(false);
    });
  });
});