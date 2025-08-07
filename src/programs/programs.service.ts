import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService, CACHE_KEYS } from '../cache';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { Language, MediaType, Status, SourceType } from '@prisma/client';

@Injectable()
export class ProgramsService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  async create(createProgramDto: CreateProgramDto) {
    const result = await this.prisma.program.create({
      data: {
        ...createProgramDto,
        releaseDate: new Date(createProgramDto.releaseDate),
        language: createProgramDto.language || Language.ENGLISH,
        mediaType: createProgramDto.mediaType || MediaType.VIDEO,
        status: createProgramDto.status || Status.DRAFT,
        sourceType: SourceType.MANUAL,
        sourceUrl: null,
        externalId: null,
      },
      include: {
        category: true,
      },
    });

    // Invalidate discovery cache if the program is published
    if (result.status === Status.PUBLISHED) {
      await this.invalidateDiscoveryCache();
    }

    return result;
  }

  async findAll() {
    return this.prisma.program.findMany({
      include: {
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.program.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });
  }

  async update(id: number, updateProgramDto: UpdateProgramDto) {
    const updateData: any = { ...updateProgramDto };

    if (updateProgramDto.releaseDate) {
      updateData.releaseDate = new Date(updateProgramDto.releaseDate);
    }

    // Get the old program to check status changes
    const oldProgram = await this.prisma.program.findUnique({
      where: { id },
      select: { status: true },
    });

    const result = await this.prisma.program.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });

    // Invalidate discovery cache if program was or is now published
    if (
      oldProgram?.status === Status.PUBLISHED ||
      result.status === Status.PUBLISHED
    ) {
      await this.invalidateDiscoveryCache();
      // Also invalidate specific program cache
      await this.invalidateProgramCache(id);
    }

    return result;
  }

  async remove(id: number) {
    // Get the program to check if it was published
    const program = await this.prisma.program.findUnique({
      where: { id },
      select: { status: true },
    });

    const result = await this.prisma.program.delete({
      where: { id },
    });

    // Invalidate discovery cache if program was published
    if (program?.status === Status.PUBLISHED) {
      await this.invalidateDiscoveryCache();
      await this.invalidateProgramCache(id);
    }

    return result;
  }

  async findByLanguage(language: Language) {
    return this.prisma.program.findMany({
      where: { language },
      include: {
        category: true,
      },
      orderBy: {
        releaseDate: 'desc',
      },
    });
  }

  async findByMediaType(mediaType: MediaType) {
    return this.prisma.program.findMany({
      where: { mediaType },
      include: {
        category: true,
      },
      orderBy: {
        releaseDate: 'desc',
      },
    });
  }

  async findByStatus(status: Status) {
    return this.prisma.program.findMany({
      where: { status },
      include: {
        category: true,
      },
      orderBy: {
        releaseDate: 'desc',
      },
    });
  }

  async findByCategory(categoryId: number) {
    return this.prisma.program.findMany({
      where: { categoryId },
      include: {
        category: true,
      },
      orderBy: {
        releaseDate: 'desc',
      },
    });
  }

  async findRecent(limit: number = 10) {
    return this.prisma.program.findMany({
      take: limit,
      include: {
        category: true,
      },
      orderBy: {
        releaseDate: 'desc',
      },
    });
  }

  // Enhanced methods that leverage composite indexes for better performance
  
  async findPublishedPrograms(options?: {
    categoryId?: number;
    language?: Language;
    mediaType?: MediaType;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {
      status: Status.PUBLISHED,
    };

    if (options?.categoryId) {
      where.categoryId = options.categoryId;
    }
    if (options?.language) {
      where.language = options.language;
    }
    if (options?.mediaType) {
      where.mediaType = options.mediaType;
    }

    return this.prisma.program.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: {
        releaseDate: 'desc',
      },
      take: options?.limit,
      skip: options?.offset,
    });
  }

  async searchPrograms(query: string, options?: {
    categoryId?: number;
    language?: Language;
    mediaType?: MediaType;
    limit?: number;
  }) {
    if (!query || query.trim().length === 0) {
      return this.findPublishedPrograms(options);
    }

    // Use PostgreSQL full-text search for better performance and relevance
    const searchQuery = query.trim().replace(/[^\w\s]/gi, ' ').split(/\s+/).filter(word => word.length > 0).join(' & ');
    
    if (!searchQuery) {
      return this.findPublishedPrograms(options);
    }

    // Build WHERE conditions for additional filters
    let additionalWhere = '';
    const params: any[] = [searchQuery];
    
    if (options?.categoryId) {
      additionalWhere += ' AND p.category_id = $' + (params.length + 1);
      params.push(options.categoryId);
    }
    if (options?.language) {
      additionalWhere += ' AND p.language = $' + (params.length + 1);
      params.push(options.language);
    }
    if (options?.mediaType) {
      additionalWhere += ' AND p.media_type = $' + (params.length + 1);
      params.push(options.mediaType);
    }

    let limitClause = '';
    if (options?.limit) {
      limitClause = ' LIMIT $' + (params.length + 1);
      params.push(options.limit);
    }

    const programs = await this.prisma.$queryRawUnsafe(`
      SELECT p.id, p.name, p.description, p.language, p.duration_sec as "durationSec", 
             p.release_date as "releaseDate", p.media_url as "mediaUrl", 
             p.media_type as "mediaType", p.status, p.created_at as "createdAt", 
             p.updated_at as "updatedAt", p.source_type as "sourceType",
             p.source_url as "sourceUrl", p.external_id as "externalId",
             c.id as "categoryId", c.name as "categoryName", c.description as "categoryDescription"
      FROM programs p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'PUBLISHED'
        AND (
          to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')) 
          @@ plainto_tsquery('english', $1)
        )
        ${additionalWhere}
      ORDER BY 
        ts_rank(
          to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')), 
          plainto_tsquery('english', $1)
        ) DESC,
        p.release_date DESC
      ${limitClause}
    `, ...params) as any[];

    // Transform the raw result to match expected format
    return programs.map((program: any) => ({
      ...program,
      category: {
        id: program.categoryId,
        name: program.categoryName,
        description: program.categoryDescription,
      },
    }));
  }

  async getPublishedProgramsByCategory(categoryId: number, options?: { limit?: number; offset?: number }) {
    return this.prisma.program.findMany({
      where: {
        status: Status.PUBLISHED,
        categoryId,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: {
        releaseDate: 'desc',
      },
      take: options?.limit,
      skip: options?.offset,
    });
  }

  async getRecentPublishedPrograms(limit: number = 10) {
    return this.prisma.program.findMany({
      where: {
        status: Status.PUBLISHED,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: {
        releaseDate: 'desc',
      },
      take: limit,
    });
  }

  private async invalidateDiscoveryCache() {
    // Invalidate all discovery cache keys (search, browse)
    await this.cacheService.delPattern(`${CACHE_KEYS.DISCOVERY_SEARCH}:*`);
    await this.cacheService.delPattern(`${CACHE_KEYS.DISCOVERY_BROWSE}:*`);
  }

  private async invalidateProgramCache(id: number) {
    // Invalidate specific program cache
    const programCacheKey = this.cacheService.generateKey(
      CACHE_KEYS.DISCOVERY_PROGRAM,
      { id },
    );
    await this.cacheService.del(programCacheKey);
  }
}
