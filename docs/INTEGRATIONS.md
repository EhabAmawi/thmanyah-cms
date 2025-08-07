# Integrations

## Overview

The Thmanyah CMS supports multiple content source integrations through a unified import system, enabling automated content aggregation from various platforms.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                Import Service                   │
├─────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ YouTube  │  │  Vimeo   │  │   RSS    │     │
│  │ Strategy │  │ Strategy │  │ Strategy │     │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘     │
│       └─────────────┼─────────────┘            │
│                     ▼                           │
│            ┌─────────────────┐                  │
│            │  Import Engine  │                  │
│            └────────┬────────┘                  │
│                     ▼                           │
│            ┌─────────────────┐                  │
│            │  Data Mapper    │                  │
│            └────────┬────────┘                  │
└─────────────────────┼───────────────────────────┘
                      ▼
              ┌───────────────┐
              │   Database    │
              │  (Programs)   │
              └───────────────┘
```

## Source Types

### Supported Integrations

```typescript
enum SourceType {
  MANUAL   = 'MANUAL',   // Direct CMS input
  YOUTUBE  = 'YOUTUBE',  // YouTube videos
  VIMEO    = 'VIMEO',    // Vimeo videos
  RSS      = 'RSS',      // RSS/Atom feeds
  API      = 'API'       // Generic API integration
}
```

## YouTube Integration

### Configuration

```typescript
// YouTube API configuration
export class YouTubeConfig {
  apiKey: string = process.env.YOUTUBE_API_KEY;
  apiVersion: string = 'v3';
  baseUrl: string = 'https://www.googleapis.com/youtube/v3';
  quotaLimit: number = 10000; // Daily quota
}
```

### Implementation

```typescript
@Injectable()
export class YouTubeImportStrategy implements ImportStrategy {
  constructor(
    private readonly youtube: google.youtube_v3.Youtube,
    private readonly prisma: PrismaService
  ) {}

  async importVideo(videoId: string, categoryId: number): Promise<Program> {
    // Fetch video details
    const response = await this.youtube.videos.list({
      part: ['snippet', 'contentDetails', 'statistics'],
      id: [videoId]
    });

    const video = response.data.items[0];
    
    // Parse duration from ISO 8601
    const duration = this.parseDuration(video.contentDetails.duration);
    
    // Create or update program
    return await this.prisma.program.upsert({
      where: {
        externalId_sourceType: {
          externalId: videoId,
          sourceType: SourceType.YOUTUBE
        }
      },
      update: {
        name: video.snippet.title,
        description: video.snippet.description,
        releaseDate: new Date(video.snippet.publishedAt),
        mediaUrl: `https://www.youtube.com/watch?v=${videoId}`,
        durationSec: duration,
        categoryId: categoryId
      },
      create: {
        name: video.snippet.title,
        description: video.snippet.description,
        language: this.detectLanguage(video.snippet.title),
        durationSec: duration,
        releaseDate: new Date(video.snippet.publishedAt),
        mediaUrl: `https://www.youtube.com/watch?v=${videoId}`,
        mediaType: MediaType.VIDEO,
        status: Status.DRAFT,
        categoryId: categoryId,
        sourceType: SourceType.YOUTUBE,
        externalId: videoId,
        sourceUrl: `https://www.youtube.com/watch?v=${videoId}`
      }
    });
  }

  async importChannel(channelId: string, categoryId: number): Promise<void> {
    let pageToken: string | undefined;
    
    do {
      // Fetch channel videos
      const response = await this.youtube.search.list({
        part: ['id'],
        channelId: channelId,
        type: ['video'],
        maxResults: 50,
        pageToken: pageToken
      });

      // Import each video
      for (const item of response.data.items) {
        await this.importVideo(item.id.videoId, categoryId);
      }

      pageToken = response.data.nextPageToken;
    } while (pageToken);
  }

  async importPlaylist(playlistId: string, categoryId: number): Promise<void> {
    let pageToken: string | undefined;
    
    do {
      const response = await this.youtube.playlistItems.list({
        part: ['contentDetails'],
        playlistId: playlistId,
        maxResults: 50,
        pageToken: pageToken
      });

      for (const item of response.data.items) {
        await this.importVideo(item.contentDetails.videoId, categoryId);
      }

      pageToken = response.data.nextPageToken;
    } while (pageToken);
  }

  private parseDuration(isoDuration: string): number {
    // Convert ISO 8601 duration to seconds
    const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  private detectLanguage(text: string): Language {
    // Simple Arabic detection
    const arabicPattern = /[\u0600-\u06FF]/;
    return arabicPattern.test(text) ? Language.ARABIC : Language.ENGLISH;
  }
}
```

### Quota Management

```typescript
@Injectable()
export class YouTubeQuotaManager {
  private quotaUsed: number = 0;
  private quotaResetTime: Date;

  constructor(
    private readonly redis: Redis,
    private readonly config: YouTubeConfig
  ) {
    this.quotaResetTime = this.getNextResetTime();
  }

  async checkQuota(cost: number): Promise<boolean> {
    await this.loadQuotaFromCache();
    
    if (this.quotaUsed + cost > this.config.quotaLimit) {
      throw new Error(`YouTube API quota exceeded. Resets at ${this.quotaResetTime}`);
    }
    
    return true;
  }

  async consumeQuota(cost: number): Promise<void> {
    this.quotaUsed += cost;
    await this.saveQuotaToCache();
  }

  private async loadQuotaFromCache(): Promise<void> {
    const cached = await this.redis.get('youtube:quota:used');
    if (cached) {
      this.quotaUsed = parseInt(cached);
    }
  }

  private async saveQuotaToCache(): Promise<void> {
    const ttl = Math.floor((this.quotaResetTime.getTime() - Date.now()) / 1000);
    await this.redis.setex('youtube:quota:used', ttl, this.quotaUsed);
  }

  private getNextResetTime(): Date {
    const now = new Date();
    const reset = new Date(now);
    reset.setUTCHours(7, 0, 0, 0); // YouTube quota resets at 07:00 UTC
    if (reset <= now) {
      reset.setDate(reset.getDate() + 1);
    }
    return reset;
  }
}
```

## Vimeo Integration

### Configuration

```typescript
export class VimeoConfig {
  accessToken: string = process.env.VIMEO_ACCESS_TOKEN;
  clientId: string = process.env.VIMEO_CLIENT_ID;
  clientSecret: string = process.env.VIMEO_CLIENT_SECRET;
  baseUrl: string = 'https://api.vimeo.com';
}
```

### Implementation

```typescript
@Injectable()
export class VimeoImportStrategy implements ImportStrategy {
  private client: Vimeo;

  constructor(
    private readonly config: VimeoConfig,
    private readonly prisma: PrismaService
  ) {
    this.client = new Vimeo(
      config.clientId,
      config.clientSecret,
      config.accessToken
    );
  }

  async importVideo(videoId: string, categoryId: number): Promise<Program> {
    return new Promise((resolve, reject) => {
      this.client.request({
        path: `/videos/${videoId}`,
        query: {
          fields: 'uri,name,description,duration,release_time,link,language'
        }
      }, (error, body) => {
        if (error) {
          reject(error);
          return;
        }

        this.prisma.program.upsert({
          where: {
            externalId_sourceType: {
              externalId: videoId,
              sourceType: SourceType.VIMEO
            }
          },
          update: {
            name: body.name,
            description: body.description,
            durationSec: body.duration,
            releaseDate: new Date(body.release_time),
            mediaUrl: body.link
          },
          create: {
            name: body.name,
            description: body.description,
            language: this.mapLanguage(body.language),
            durationSec: body.duration,
            releaseDate: new Date(body.release_time),
            mediaUrl: body.link,
            mediaType: MediaType.VIDEO,
            status: Status.DRAFT,
            categoryId: categoryId,
            sourceType: SourceType.VIMEO,
            externalId: videoId,
            sourceUrl: body.link
          }
        }).then(resolve).catch(reject);
      });
    });
  }

  async importUserVideos(userId: string, categoryId: number): Promise<void> {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const videos = await this.fetchUserVideos(userId, page);
      
      for (const video of videos.data) {
        const videoId = video.uri.split('/').pop();
        await this.importVideo(videoId, categoryId);
      }

      hasMore = videos.paging.next !== null;
      page++;
    }
  }

  private mapLanguage(vimeoLanguage: string): Language {
    const arabicCodes = ['ar', 'ara', 'ar-SA'];
    return arabicCodes.includes(vimeoLanguage) ? Language.ARABIC : Language.ENGLISH;
  }
}
```

## RSS Feed Integration

### Implementation

```typescript
import * as Parser from 'rss-parser';

@Injectable()
export class RSSImportStrategy implements ImportStrategy {
  private parser: Parser;

  constructor(private readonly prisma: PrismaService) {
    this.parser = new Parser({
      customFields: {
        item: [
          ['media:content', 'media'],
          ['enclosure', 'enclosure'],
          ['itunes:duration', 'duration']
        ]
      }
    });
  }

  async importFeed(feedUrl: string, categoryId: number): Promise<void> {
    const feed = await this.parser.parseURL(feedUrl);
    
    for (const item of feed.items) {
      await this.importItem(item, feed, categoryId, feedUrl);
    }
  }

  private async importItem(
    item: any,
    feed: any,
    categoryId: number,
    feedUrl: string
  ): Promise<Program> {
    const mediaUrl = this.extractMediaUrl(item);
    const duration = this.parseDuration(item.duration || item.itunes?.duration);
    const mediaType = this.detectMediaType(mediaUrl);
    
    return await this.prisma.program.upsert({
      where: {
        externalId_sourceType: {
          externalId: item.guid || item.link,
          sourceType: SourceType.RSS
        }
      },
      update: {
        name: item.title,
        description: item.content || item.description,
        releaseDate: new Date(item.pubDate || item.isoDate),
        mediaUrl: mediaUrl,
        durationSec: duration
      },
      create: {
        name: item.title,
        description: item.content || item.description,
        language: this.detectLanguage(item.title + ' ' + item.description),
        durationSec: duration,
        releaseDate: new Date(item.pubDate || item.isoDate),
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        status: Status.DRAFT,
        categoryId: categoryId,
        sourceType: SourceType.RSS,
        externalId: item.guid || item.link,
        sourceUrl: item.link || feedUrl
      }
    });
  }

  private extractMediaUrl(item: any): string {
    // Check various RSS media fields
    if (item.enclosure?.url) return item.enclosure.url;
    if (item.media?.url) return item.media.url;
    if (item['media:content']?.url) return item['media:content'].url;
    if (item.link) return item.link;
    
    throw new Error('No media URL found in RSS item');
  }

  private detectMediaType(url: string): MediaType {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];
    
    const extension = url.toLowerCase().match(/\.[^.]+$/)?.[0];
    
    if (videoExtensions.includes(extension)) return MediaType.VIDEO;
    if (audioExtensions.includes(extension)) return MediaType.AUDIO;
    
    // Default to video if uncertain
    return MediaType.VIDEO;
  }

  private parseDuration(durationStr: string): number {
    if (!durationStr) return 0;
    
    // Handle HH:MM:SS format
    const parts = durationStr.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    
    return parseInt(durationStr) || 0;
  }
}
```

## Generic API Integration

### Custom API Adapter

```typescript
interface APIAdapter {
  fetchContent(params: any): Promise<any[]>;
  mapToProgram(item: any): Partial<Program>;
}

@Injectable()
export class CustomAPIImportStrategy implements ImportStrategy {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService
  ) {}

  async importFromAPI(
    config: APIConfig,
    adapter: APIAdapter,
    categoryId: number
  ): Promise<void> {
    const items = await adapter.fetchContent(config.params);
    
    for (const item of items) {
      const programData = adapter.mapToProgram(item);
      
      await this.prisma.program.upsert({
        where: {
          externalId_sourceType: {
            externalId: programData.externalId,
            sourceType: SourceType.API
          }
        },
        update: programData,
        create: {
          ...programData,
          categoryId: categoryId,
          sourceType: SourceType.API,
          status: Status.DRAFT
        }
      });
    }
  }
}

// Example adapter for a podcast API
class PodcastAPIAdapter implements APIAdapter {
  async fetchContent(params: any): Promise<any[]> {
    const response = await fetch(`https://api.podcast.com/episodes?${params}`);
    const data = await response.json();
    return data.episodes;
  }

  mapToProgram(episode: any): Partial<Program> {
    return {
      name: episode.title,
      description: episode.description,
      durationSec: episode.duration,
      releaseDate: new Date(episode.publishedAt),
      mediaUrl: episode.audioUrl,
      mediaType: MediaType.AUDIO,
      externalId: episode.id,
      sourceUrl: episode.permalink
    };
  }
}
```

## Import Queue System

### Background Processing

```typescript
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('import')
export class ImportProcessor {
  constructor(
    private readonly youtubeStrategy: YouTubeImportStrategy,
    private readonly vimeoStrategy: VimeoImportStrategy,
    private readonly rssStrategy: RSSImportStrategy
  ) {}

  @Process('youtube-video')
  async processYouTubeVideo(job: Job<{ videoId: string; categoryId: number }>) {
    const { videoId, categoryId } = job.data;
    
    try {
      await this.youtubeStrategy.importVideo(videoId, categoryId);
      return { success: true, videoId };
    } catch (error) {
      throw new Error(`Failed to import YouTube video ${videoId}: ${error.message}`);
    }
  }

  @Process('youtube-channel')
  async processYouTubeChannel(job: Job<{ channelId: string; categoryId: number }>) {
    const { channelId, categoryId } = job.data;
    
    await job.progress(0);
    await this.youtubeStrategy.importChannel(channelId, categoryId);
    await job.progress(100);
    
    return { success: true, channelId };
  }

  @Process('rss-feed')
  async processRSSFeed(job: Job<{ feedUrl: string; categoryId: number }>) {
    const { feedUrl, categoryId } = job.data;
    
    await this.rssStrategy.importFeed(feedUrl, categoryId);
    return { success: true, feedUrl };
  }
}
```

### Import Scheduling

```typescript
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ImportScheduler {
  constructor(
    @InjectQueue('import') private importQueue: Queue,
    private readonly prisma: PrismaService
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async scheduleImports() {
    // Get all active import sources
    const sources = await this.prisma.importSource.findMany({
      where: { isActive: true }
    });

    for (const source of sources) {
      await this.importQueue.add(
        `${source.type.toLowerCase()}-${source.importType}`,
        {
          ...source.config,
          categoryId: source.categoryId
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000
          }
        }
      );
    }
  }
}
```

## Webhook Integration

### Incoming Webhooks

```typescript
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly importService: ImportService) {}

  @Post('youtube')
  async handleYouTubeWebhook(
    @Headers('X-Hub-Signature') signature: string,
    @Body() payload: any
  ) {
    // Verify webhook signature
    if (!this.verifySignature(signature, payload)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Process new video notification
    if (payload.type === 'video.published') {
      await this.importService.importYouTubeVideo(
        payload.videoId,
        payload.categoryId
      );
    }

    return { received: true };
  }

  private verifySignature(signature: string, payload: any): boolean {
    const secret = process.env.WEBHOOK_SECRET;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    const expectedSignature = `sha256=${hmac.digest('hex')}`;
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}
```

## Import Monitoring

### Metrics and Analytics

```typescript
@Injectable()
export class ImportMetricsService {
  private readonly metrics = {
    totalImports: new Counter({
      name: 'import_total',
      help: 'Total number of imports',
      labelNames: ['source', 'status']
    }),
    importDuration: new Histogram({
      name: 'import_duration_seconds',
      help: 'Import duration in seconds',
      labelNames: ['source'],
      buckets: [0.1, 0.5, 1, 5, 10, 30, 60]
    }),
    importErrors: new Counter({
      name: 'import_errors_total',
      help: 'Total number of import errors',
      labelNames: ['source', 'error_type']
    })
  };

  recordImport(source: string, status: 'success' | 'failure', duration: number) {
    this.metrics.totalImports.inc({ source, status });
    this.metrics.importDuration.observe({ source }, duration);
    
    if (status === 'failure') {
      this.metrics.importErrors.inc({ source, error_type: 'general' });
    }
  }
}
```

## Implementation Best Practices

### Duplicate Prevention

The system uses composite unique constraints to prevent duplicate imports:

```typescript
// Prisma schema constraint
@@unique([externalId, sourceType], name: "external_source_unique")
```

### Rate Limiting Compliance

All external API integrations respect rate limits:

```typescript
class RateLimiter {
  async throttle(key: string, limit: number, window: number) {
    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, window);
    }
    if (current > limit) {
      throw new Error('Rate limit exceeded');
    }
  }
}
```

### Error Recovery Strategy

Robust retry logic with exponential backoff ensures reliability:

```typescript
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  },
  removeOnComplete: true,
  removeOnFail: false
}
```

### Data Validation

All imported content is validated before storage:

```typescript
class ImportValidator {
  validate(data: any): boolean {
    return !!(
      data.name &&
      data.mediaUrl &&
      data.durationSec > 0 &&
      data.releaseDate
    );
  }
}
```

## Related Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [API Documentation](./API.md)
- [Database Design](./DATABASE.md)
- [Configuration](./CONFIGURATION.md)