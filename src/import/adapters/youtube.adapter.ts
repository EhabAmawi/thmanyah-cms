import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Language, MediaType, SourceType } from '@prisma/client';
import {
  BaseContentAdapter,
  ImportedContent,
  VideoImportOptions,
  ChannelImportOptions,
} from './base.adapter';

interface YouTubeVideoData {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    channelId: string;
    defaultLanguage?: string;
  };
  contentDetails: {
    duration: string;
  };
}

interface YouTubeChannelData {
  items: YouTubeVideoData[];
  nextPageToken?: string;
}

@Injectable()
export class YouTubeAdapter extends BaseContentAdapter {
  readonly sourceType = SourceType.YOUTUBE;
  readonly supportedDomains = ['youtube.com', 'youtu.be', 'm.youtube.com'];

  private readonly apiKey =
    process.env.YOUTUBE_API_KEY || 'YOUR_YOUTUBE_API_KEY_HERE';
  private readonly baseApiUrl = 'https://www.googleapis.com/youtube/v3';

  async importVideo(options: VideoImportOptions): Promise<ImportedContent> {
    const videoId = this.extractVideoId(options.url);
    if (!videoId) {
      throw new BadRequestException('Invalid YouTube URL');
    }

    try {
      const videoData = await this.fetchVideoData(videoId);
      return this.transformVideoData(videoData, options.url);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to import video: ${error.message}`,
      );
    }
  }

  async importChannel(
    options: ChannelImportOptions,
  ): Promise<ImportedContent[]> {
    try {
      const videos: ImportedContent[] = [];
      let pageToken: string | undefined;
      let fetchedCount = 0;
      const limit = options.limit || 10;

      do {
        const response = await this.fetchChannelVideos(
          options.channelId,
          Math.min(50, limit - fetchedCount),
          pageToken,
        );

        for (const video of response.items) {
          if (fetchedCount >= limit) break;

          const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
          videos.push(this.transformVideoData(video, videoUrl));
          fetchedCount++;
        }

        pageToken = response.nextPageToken;
      } while (pageToken && fetchedCount < limit);

      return videos;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to import channel: ${error.message}`,
      );
    }
  }

  extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  validateUrl(url: string): boolean {
    return (
      this.supportedDomains.some((domain) => url.includes(domain)) &&
      this.extractVideoId(url) !== null
    );
  }

  private async fetchVideoData(videoId: string): Promise<YouTubeVideoData> {
    const url = `${this.baseApiUrl}/videos?id=${videoId}&part=snippet,contentDetails&key=${this.apiKey}`;

    // Mock response for development - replace with actual API call
    if (this.apiKey === 'YOUR_YOUTUBE_API_KEY_HERE') {
      return this.getMockVideoData(videoId);
    }

    const response = await fetch(url);
    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      throw new Error('Video not found');
    }

    return data.items[0];
  }

  private async fetchChannelVideos(
    channelId: string,
    maxResults: number = 10,
    pageToken?: string,
  ): Promise<YouTubeChannelData> {
    const url = `${this.baseApiUrl}/search?channelId=${channelId}&part=snippet&order=date&type=video&maxResults=${maxResults}&key=${this.apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`;

    // Mock response for development - replace with actual API call
    if (this.apiKey === 'YOUR_YOUTUBE_API_KEY_HERE') {
      return this.getMockChannelData(channelId, maxResults);
    }

    const response = await fetch(url);
    const searchData = await response.json();

    if (!searchData.items) {
      return { items: [] };
    }

    // Fetch detailed info for each video
    const videoIds = searchData.items.map((item) => item.id.videoId).join(',');
    const detailsUrl = `${this.baseApiUrl}/videos?id=${videoIds}&part=snippet,contentDetails&key=${this.apiKey}`;

    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    return {
      items: detailsData.items || [],
      nextPageToken: searchData.nextPageToken,
    };
  }

  private transformVideoData(
    video: YouTubeVideoData,
    sourceUrl: string,
  ): ImportedContent {
    return {
      name: video.snippet.title,
      description: video.snippet.description,
      language: this.mapLanguageFromString(
        video.snippet.defaultLanguage || 'en',
      ),
      durationSec: this.sanitizeDuration(video.contentDetails.duration),
      releaseDate: new Date(video.snippet.publishedAt),
      mediaUrl: `https://www.youtube.com/watch?v=${video.id}`,
      mediaType: MediaType.VIDEO,
      sourceType: this.sourceType,
      sourceUrl,
      externalId: video.id,
    };
  }

  // Mock data for development/testing
  private getMockVideoData(videoId: string): YouTubeVideoData {
    return {
      id: videoId,
      snippet: {
        title: `Mock Video Title ${videoId}`,
        description:
          'This is a mock video description for development purposes.',
        publishedAt: new Date().toISOString(),
        channelId: 'mock-channel-id',
        defaultLanguage: 'en',
      },
      contentDetails: {
        duration: 'PT4M13S',
      },
    };
  }

  private getMockChannelData(
    channelId: string,
    maxResults: number,
  ): YouTubeChannelData {
    const items: YouTubeVideoData[] = [];

    for (let i = 1; i <= Math.min(maxResults, 5); i++) {
      items.push({
        id: `mock-video-${channelId}-${i}`,
        snippet: {
          title: `Mock Channel Video ${i}`,
          description: `Mock description for video ${i} from channel ${channelId}`,
          publishedAt: new Date(Date.now() - i * 86400000).toISOString(), // i days ago
          channelId: channelId,
          defaultLanguage: 'en',
        },
        contentDetails: {
          duration: `PT${3 + i}M${10 + i}S`,
        },
      });
    }

    return { items };
  }
}
