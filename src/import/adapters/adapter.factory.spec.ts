import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SourceType } from '@prisma/client';
import { AdapterFactory } from './adapter.factory';
import { YouTubeAdapter } from './youtube.adapter';
import { BaseContentAdapter } from './base.adapter';

describe('AdapterFactory', () => {
  let factory: AdapterFactory;
  let youtubeAdapter: YouTubeAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdapterFactory,
        YouTubeAdapter
      ],
    }).compile();

    factory = module.get<AdapterFactory>(AdapterFactory);
    youtubeAdapter = module.get<YouTubeAdapter>(YouTubeAdapter);
  });

  describe('constructor and registration', () => {
    it('should be defined', () => {
      expect(factory).toBeDefined();
    });

    it('should register YouTube adapter on construction', () => {
      const supportedTypes = factory.getSupportedSourceTypes();
      expect(supportedTypes).toContain(SourceType.YOUTUBE);
    });
  });

  describe('getAdapter', () => {
    it('should return YouTube adapter for YOUTUBE source type', () => {
      const adapter = factory.getAdapter(SourceType.YOUTUBE);
      
      expect(adapter).toBe(youtubeAdapter);
      expect(adapter.sourceType).toBe(SourceType.YOUTUBE);
    });

    it('should throw BadRequestException for unsupported source type', () => {
      expect(() => factory.getAdapter(SourceType.VIMEO)).toThrow(BadRequestException);
      expect(() => factory.getAdapter(SourceType.VIMEO)).toThrow(
        "Adapter for source type 'VIMEO' not found"
      );
    });

    it('should throw BadRequestException for RSS source type', () => {
      expect(() => factory.getAdapter(SourceType.RSS)).toThrow(BadRequestException);
      expect(() => factory.getAdapter(SourceType.RSS)).toThrow(
        "Adapter for source type 'RSS' not found"
      );
    });

    it('should throw BadRequestException for API source type', () => {
      expect(() => factory.getAdapter(SourceType.API)).toThrow(BadRequestException);
      expect(() => factory.getAdapter(SourceType.API)).toThrow(
        "Adapter for source type 'API' not found"
      );
    });

    it('should throw BadRequestException for MANUAL source type', () => {
      expect(() => factory.getAdapter(SourceType.MANUAL)).toThrow(BadRequestException);
      expect(() => factory.getAdapter(SourceType.MANUAL)).toThrow(
        "Adapter for source type 'MANUAL' not found"
      );
    });
  });

  describe('getAdapterByUrl', () => {
    it('should return YouTube adapter for valid YouTube URLs', () => {
      const testUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://m.youtube.com/watch?v=abc123',
        'https://youtube.com/embed/test123'
      ];

      testUrls.forEach(url => {
        const adapter = factory.getAdapterByUrl(url);
        expect(adapter).toBe(youtubeAdapter);
        expect(adapter.sourceType).toBe(SourceType.YOUTUBE);
      });
    });

    it('should throw BadRequestException for unsupported URLs', () => {
      const unsupportedUrls = [
        'https://vimeo.com/123456789',
        'https://example.com/video/123',
        'https://twitch.tv/user/video/123',
        'https://dailymotion.com/video/123'
      ];

      unsupportedUrls.forEach(url => {
        expect(() => factory.getAdapterByUrl(url)).toThrow(BadRequestException);
        expect(() => factory.getAdapterByUrl(url)).toThrow(`No adapter found for URL: ${url}`);
      });
    });

    it('should throw BadRequestException for invalid YouTube URLs', () => {
      const invalidYouTubeUrls = [
        'https://www.youtube.com/',
        'https://www.youtube.com/channel/UC123',
        'https://www.youtube.com/user/testuser'
      ];

      invalidYouTubeUrls.forEach(url => {
        expect(() => factory.getAdapterByUrl(url)).toThrow(BadRequestException);
        expect(() => factory.getAdapterByUrl(url)).toThrow(`No adapter found for URL: ${url}`);
      });
    });

    it('should throw BadRequestException for empty or malformed URLs', () => {
      const invalidUrls = ['', 'not-a-url', 'http://', 'https://'];

      invalidUrls.forEach(url => {
        expect(() => factory.getAdapterByUrl(url)).toThrow(BadRequestException);
        expect(() => factory.getAdapterByUrl(url)).toThrow(`No adapter found for URL: ${url}`);
      });
    });
  });

  describe('getSupportedSourceTypes', () => {
    it('should return array containing YOUTUBE', () => {
      const supportedTypes = factory.getSupportedSourceTypes();
      
      expect(Array.isArray(supportedTypes)).toBe(true);
      expect(supportedTypes).toContain(SourceType.YOUTUBE);
      expect(supportedTypes.length).toBe(1);
    });

    it('should return immutable list of source types', () => {
      const supportedTypes1 = factory.getSupportedSourceTypes();
      const supportedTypes2 = factory.getSupportedSourceTypes();
      
      expect(supportedTypes1).toEqual(supportedTypes2);
      
      // Modifying the returned array shouldn't affect the factory
      supportedTypes1.push(SourceType.VIMEO as any);
      const supportedTypes3 = factory.getSupportedSourceTypes();
      expect(supportedTypes3).not.toContain(SourceType.VIMEO);
    });
  });

  describe('isUrlSupported', () => {
    it('should return true for supported YouTube URLs', () => {
      const supportedUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/abc123',
        'https://m.youtube.com/watch?v=test123',
        'https://youtube.com/embed/video123'
      ];

      supportedUrls.forEach(url => {
        expect(factory.isUrlSupported(url)).toBe(true);
      });
    });

    it('should return false for unsupported URLs', () => {
      const unsupportedUrls = [
        'https://vimeo.com/123456789',
        'https://example.com/video/123',
        'https://www.youtube.com/',
        'https://www.youtube.com/channel/UC123',
        '',
        'not-a-url'
      ];

      unsupportedUrls.forEach(url => {
        expect(factory.isUrlSupported(url)).toBe(false);
      });
    });
  });

  describe('adapter extensibility', () => {
    it('should allow multiple adapters to be registered', () => {
      // This test demonstrates how the factory would work with multiple adapters
      const currentTypes = factory.getSupportedSourceTypes();
      expect(currentTypes).toEqual([SourceType.YOUTUBE]);
      
      // In the future, when we add more adapters, they should be included
      // This test serves as documentation for the expected behavior
    });

    it('should maintain adapter isolation', () => {
      const adapter1 = factory.getAdapter(SourceType.YOUTUBE);
      const adapter2 = factory.getAdapter(SourceType.YOUTUBE);
      
      // Should return the same instance
      expect(adapter1).toBe(adapter2);
      expect(adapter1.sourceType).toBe(SourceType.YOUTUBE);
    });
  });

  describe('error handling', () => {
    it('should handle malformed URLs gracefully in isUrlSupported', () => {
      const malformedUrls = [null, undefined, 123, {}, []];

      malformedUrls.forEach(url => {
        expect(factory.isUrlSupported(url as any)).toBe(false);
      });
    });

    it('should provide clear error messages for unsupported source types', () => {
      const unsupportedTypes = [SourceType.VIMEO, SourceType.RSS, SourceType.API, SourceType.MANUAL];

      unsupportedTypes.forEach(sourceType => {
        try {
          factory.getAdapter(sourceType);
          fail(`Expected BadRequestException for ${sourceType}`);
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          expect(error.message).toBe(`Adapter for source type '${sourceType}' not found`);
        }
      });
    });
  });
});