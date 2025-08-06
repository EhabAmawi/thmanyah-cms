import { Injectable, BadRequestException } from '@nestjs/common';
import { SourceType } from '@prisma/client';
import { BaseContentAdapter } from './base.adapter';
import { YouTubeAdapter } from './youtube.adapter';

@Injectable()
export class AdapterFactory {
  private readonly adapters = new Map<SourceType, BaseContentAdapter>();

  constructor(private readonly youtubeAdapter: YouTubeAdapter) {
    this.registerAdapter(youtubeAdapter);
  }

  private registerAdapter(adapter: BaseContentAdapter): void {
    this.adapters.set(adapter.sourceType, adapter);
  }

  getAdapter(sourceType: SourceType): BaseContentAdapter {
    const adapter = this.adapters.get(sourceType);
    if (!adapter) {
      throw new BadRequestException(
        `Adapter for source type '${sourceType}' not found`,
      );
    }
    return adapter;
  }

  getAdapterByUrl(url: string): BaseContentAdapter {
    for (const adapter of this.adapters.values()) {
      if (adapter.validateUrl(url)) {
        return adapter;
      }
    }
    throw new BadRequestException(`No adapter found for URL: ${url}`);
  }

  getSupportedSourceTypes(): SourceType[] {
    return Array.from(this.adapters.keys());
  }

  isUrlSupported(url: string): boolean {
    try {
      this.getAdapterByUrl(url);
      return true;
    } catch {
      return false;
    }
  }
}
