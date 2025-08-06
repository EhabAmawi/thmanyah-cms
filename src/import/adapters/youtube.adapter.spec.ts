import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Language, MediaType, SourceType } from '@prisma/client';
import { YouTubeAdapter } from './youtube.adapter';

// Mock fetch globally
global.fetch = jest.fn();

describe('YouTubeAdapter', () => {
  let adapter: YouTubeAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [YouTubeAdapter],
    }).compile();

    adapter = module.get<YouTubeAdapter>(YouTubeAdapter);
    jest.clearAllMocks();
  });

  describe('class properties', () => {
    it('should have correct sourceType', () => {
      expect(adapter.sourceType).toBe(SourceType.YOUTUBE);
    });

    it('should have correct supported domains', () => {
      expect(adapter.supportedDomains).toEqual([
        'youtube.com',
        'youtu.be',
        'm.youtube.com'
      ]);
    });
  });

  describe('extractVideoId', () => {
    it('should extract video ID from standard YouTube URLs', () => {
      expect(adapter.extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(adapter.extractVideoId('http://youtube.com/watch?v=abc123')).toBe('abc123');
      expect(adapter.extractVideoId('https://youtube.com/watch?v=test_-123')).toBe('test_-123');
    });

    it('should extract video ID from youtu.be URLs', () => {
      expect(adapter.extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(adapter.extractVideoId('http://youtu.be/abc123')).toBe('abc123');
    });

    it('should extract video ID from embed URLs', () => {
      expect(adapter.extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(adapter.extractVideoId('https://youtube.com/embed/abc123')).toBe('abc123');
    });

    it('should extract video ID from /v/ URLs', () => {
      expect(adapter.extractVideoId('https://www.youtube.com/v/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(adapter.extractVideoId('https://youtube.com/v/abc123')).toBe('abc123');
    });

    it('should return null for invalid URLs', () => {
      expect(adapter.extractVideoId('https://vimeo.com/123456789')).toBeNull();
      expect(adapter.extractVideoId('https://example.com/video')).toBeNull();
      expect(adapter.extractVideoId('invalid-url')).toBeNull();
      expect(adapter.extractVideoId('')).toBeNull();
    });
  });

  describe('validateUrl', () => {
    it('should validate YouTube URLs with extractable video IDs', () => {
      expect(adapter.validateUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(adapter.validateUrl('https://youtu.be/abc123')).toBe(true);
      expect(adapter.validateUrl('https://m.youtube.com/watch?v=test123')).toBe(true);
    });

    it('should reject URLs from unsupported domains', () => {
      expect(adapter.validateUrl('https://vimeo.com/123456789')).toBe(false);
      expect(adapter.validateUrl('https://example.com/video')).toBe(false);
    });

    it('should reject YouTube URLs without valid video IDs', () => {
      expect(adapter.validateUrl('https://www.youtube.com/')).toBe(false);
      expect(adapter.validateUrl('https://www.youtube.com/channel/UC123')).toBe(false);
    });
  });

  describe('importVideo with mock data', () => {
    it('should import video with mock data when API key is placeholder', async () => {
      const options = {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        categoryId: 'cat-123'
      };

      const result = await adapter.importVideo(options);

      expect(result).toBeDefined();
      expect(result.name).toBe('Mock Video Title dQw4w9WgXcQ');
      expect(result.description).toBe('This is a mock video description for development purposes.');
      expect(result.language).toBe(Language.ENGLISH);
      expect(result.durationSec).toBe(253); // PT4M13S = 4*60 + 13
      expect(result.mediaUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result.mediaType).toBe(MediaType.VIDEO);
      expect(result.sourceType).toBe(SourceType.YOUTUBE);
      expect(result.sourceUrl).toBe(options.url);
      expect(result.externalId).toBe('dQw4w9WgXcQ');
      expect(result.releaseDate).toBeInstanceOf(Date);
    });

    it('should throw BadRequestException for invalid YouTube URL', async () => {
      const options = {
        url: 'https://invalid-url.com/video',
        categoryId: 'cat-123'
      };

      await expect(adapter.importVideo(options)).rejects.toThrow(BadRequestException);
      await expect(adapter.importVideo(options)).rejects.toThrow('Invalid YouTube URL');
    });
  });

  describe('importChannel with mock data', () => {
    it('should import channel videos with mock data', async () => {
      const options = {
        channelId: 'UC_test_channel',
        limit: 3,
        categoryId: 'cat-123'
      };

      const results = await adapter.importChannel(options);

      expect(results).toBeDefined();
      expect(results.length).toBe(3);

      results.forEach((result, index) => {
        expect(result.name).toBe(`Mock Channel Video ${index + 1}`);
        expect(result.description).toContain(`Mock description for video ${index + 1}`);
        expect(result.language).toBe(Language.ENGLISH);
        expect(result.mediaType).toBe(MediaType.VIDEO);
        expect(result.sourceType).toBe(SourceType.YOUTUBE);
        expect(result.externalId).toBe(`mock-video-UC_test_channel-${index + 1}`);
        expect(result.releaseDate).toBeInstanceOf(Date);
      });
    });

    it('should respect limit parameter', async () => {
      const options = {
        channelId: 'UC_test_channel',
        limit: 2
      };

      const results = await adapter.importChannel(options);

      expect(results.length).toBe(2);
    });

    it('should use default limit when not specified', async () => {
      const options = {
        channelId: 'UC_test_channel'
      };

      const results = await adapter.importChannel(options);

      expect(results.length).toBe(5); // Mock returns max 5 items
    });
  });

  describe('importVideo with real API', () => {
    let realApiAdapter: YouTubeAdapter;

    beforeEach(async () => {
      // Mock environment variable for real API key
      process.env.YOUTUBE_API_KEY = 'real_api_key';
      // Clear any previous mock implementations
      jest.clearAllMocks();
      
      // Create a fresh adapter instance with the new environment variable
      const module = await Test.createTestingModule({
        providers: [YouTubeAdapter],
      }).compile();
      realApiAdapter = module.get<YouTubeAdapter>(YouTubeAdapter);
    });

    afterEach(() => {
      // Reset to placeholder
      process.env.YOUTUBE_API_KEY = 'YOUR_YOUTUBE_API_KEY_HERE';
      jest.clearAllMocks();
    });

    it('should fetch video data from YouTube API', async () => {
      const mockApiResponse = {
        items: [{
          id: 'dQw4w9WgXcQ',
          snippet: {
            title: 'Never Gonna Give You Up',
            description: 'Rick Astley - Never Gonna Give You Up',
            publishedAt: '2009-10-25T06:57:33Z',
            channelId: 'UCuAXFkgsw1L7xaCfnd5JJOw',
            defaultLanguage: 'en'
          },
          contentDetails: {
            duration: 'PT3M33S'
          }
        }]
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockApiResponse)
      });

      const options = {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        categoryId: 'cat-123'
      };

      const result = await realApiAdapter.importVideo(options);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://www.googleapis.com/youtube/v3/videos?id=dQw4w9WgXcQ')
      );
      expect(result.name).toBe('Never Gonna Give You Up');
      expect(result.description).toBe('Rick Astley - Never Gonna Give You Up');
      expect(result.durationSec).toBe(213); // 3*60 + 33
    });

    it('should throw InternalServerErrorException when video not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue({ items: [] })
      });

      const options = {
        url: 'https://www.youtube.com/watch?v=nonexistent',
        categoryId: 'cat-123'
      };

      await expect(realApiAdapter.importVideo(options)).rejects.toThrow(InternalServerErrorException);
      await expect(realApiAdapter.importVideo(options)).rejects.toThrow('Failed to import video: Video not found');
    });
  });

  describe('importChannel with real API', () => {
    let realApiAdapter: YouTubeAdapter;

    beforeEach(async () => {
      process.env.YOUTUBE_API_KEY = 'real_api_key';
      jest.clearAllMocks();
      
      const module = await Test.createTestingModule({
        providers: [YouTubeAdapter],
      }).compile();
      realApiAdapter = module.get<YouTubeAdapter>(YouTubeAdapter);
    });

    afterEach(() => {
      process.env.YOUTUBE_API_KEY = 'YOUR_YOUTUBE_API_KEY_HERE';
      jest.clearAllMocks();
    });

    it('should fetch channel videos from YouTube API', async () => {
      const mockSearchResponse = {
        items: [
          { id: { videoId: 'video1' } },
          { id: { videoId: 'video2' } }
        ],
        nextPageToken: null
      };

      const mockDetailsResponse = {
        items: [
          {
            id: 'video1',
            snippet: {
              title: 'Video 1',
              description: 'Description 1',
              publishedAt: '2023-01-01T00:00:00Z',
              channelId: 'UC123',
              defaultLanguage: 'en'
            },
            contentDetails: { duration: 'PT5M30S' }
          },
          {
            id: 'video2',
            snippet: {
              title: 'Video 2',
              description: 'Description 2',
              publishedAt: '2023-01-02T00:00:00Z',
              channelId: 'UC123',
              defaultLanguage: 'en'
            },
            contentDetails: { duration: 'PT3M45S' }
          }
        ]
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockSearchResponse)
        })
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockDetailsResponse)
        });

      const options = {
        channelId: 'UC123',
        limit: 2
      };

      const results = await realApiAdapter.importChannel(options);

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Video 1');
      expect(results[1].name).toBe('Video 2');
      expect(results[0].durationSec).toBe(330); // 5*60 + 30
      expect(results[1].durationSec).toBe(225); // 3*60 + 45
    });
  });

  describe('transformVideoData', () => {
    it('should correctly transform YouTube video data', () => {
      const videoData = {
        id: 'test123',
        snippet: {
          title: 'Test Video',
          description: 'Test Description',
          publishedAt: '2023-01-01T12:00:00Z',
          channelId: 'UC_test',
          defaultLanguage: 'ar'
        },
        contentDetails: {
          duration: 'PT10M30S'
        }
      };

      const sourceUrl = 'https://www.youtube.com/watch?v=test123';
      const result = adapter['transformVideoData'](videoData, sourceUrl);

      expect(result.name).toBe('Test Video');
      expect(result.description).toBe('Test Description');
      expect(result.language).toBe(Language.ARABIC);
      expect(result.durationSec).toBe(630); // 10*60 + 30
      expect(result.releaseDate).toEqual(new Date('2023-01-01T12:00:00Z'));
      expect(result.mediaUrl).toBe('https://www.youtube.com/watch?v=test123');
      expect(result.mediaType).toBe(MediaType.VIDEO);
      expect(result.sourceType).toBe(SourceType.YOUTUBE);
      expect(result.sourceUrl).toBe(sourceUrl);
      expect(result.externalId).toBe('test123');
    });
  });

  describe('getMockVideoData', () => {
    it('should generate mock video data with correct structure', () => {
      const videoId = 'test123';
      const mockData = adapter['getMockVideoData'](videoId);

      expect(mockData.id).toBe(videoId);
      expect(mockData.snippet.title).toBe(`Mock Video Title ${videoId}`);
      expect(mockData.snippet.description).toBe('This is a mock video description for development purposes.');
      expect(mockData.snippet.channelId).toBe('mock-channel-id');
      expect(mockData.snippet.defaultLanguage).toBe('en');
      expect(mockData.contentDetails.duration).toBe('PT4M13S');
      expect(new Date(mockData.snippet.publishedAt)).toBeInstanceOf(Date);
    });
  });

  describe('getMockChannelData', () => {
    it('should generate mock channel data with specified count', () => {
      const channelId = 'UC_test';
      const maxResults = 3;
      const mockData = adapter['getMockChannelData'](channelId, maxResults);

      expect(mockData.items).toHaveLength(3);
      expect(mockData.nextPageToken).toBeUndefined();

      mockData.items.forEach((item, index) => {
        expect(item.id).toBe(`mock-video-${channelId}-${index + 1}`);
        expect(item.snippet.title).toBe(`Mock Channel Video ${index + 1}`);
        expect(item.snippet.channelId).toBe(channelId);
        expect(item.contentDetails.duration).toBe(`PT${3 + index + 1}M${10 + index + 1}S`);
      });
    });

    it('should limit results to maximum of 5', () => {
      const mockData = adapter['getMockChannelData']('UC_test', 10);
      expect(mockData.items).toHaveLength(5);
    });
  });
});