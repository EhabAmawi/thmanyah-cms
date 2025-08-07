import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache';
import { SearchProgramsDto } from './dto/search-programs.dto';
import { BrowseProgramsDto } from './dto/browse-programs.dto';
import { ProgramDiscoveryDto } from './dto/program-discovery.dto';
import { Status } from '@prisma/client';

@Injectable()
export class DiscoveryService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  async searchPrograms(
    searchDto: SearchProgramsDto,
  ): Promise<ProgramDiscoveryDto[]> {
    const cacheKey = this.cacheService.generateKey(
      CACHE_KEYS.DISCOVERY_SEARCH,
      searchDto,
    );

    // Try to get from cache first
    const cachedResult = await this.cacheService.get<ProgramDiscoveryDto[]>(
      cacheKey,
      { logHitMiss: true },
    );

    if (cachedResult) {
      return cachedResult;
    }

    // If not in cache, fetch from database
    const whereConditions: any = {
      status: Status.PUBLISHED,
    };

    let programs;
    
    if (searchDto.q) {
      // Use PostgreSQL full-text search for better performance and relevance
      // Escape the search query for safe use in SQL
      const searchQuery = searchDto.q.trim().replace(/[^\w\s]/gi, ' ').split(/\s+/).filter(word => word.length > 0).join(' & ');
      
      if (searchQuery) {
        // Use raw SQL with full-text search for optimal performance
        programs = await this.prisma.$queryRaw<any[]>`
          SELECT p.id, p.name, p.description, p.language, p.duration_sec as "durationSec", 
                 p.release_date as "releaseDate", p.media_url as "mediaUrl", 
                 p.media_type as "mediaType", p.status, p.created_at as "createdAt", 
                 p.updated_at as "updatedAt",
                 c.id as "categoryId", c.name as "categoryName", c.description as "categoryDescription"
          FROM programs p
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE p.status = 'PUBLISHED'
            AND (
              to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')) 
              @@ plainto_tsquery('english', ${searchQuery})
            )
          ORDER BY 
            ts_rank(
              to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')), 
              plainto_tsquery('english', ${searchQuery})
            ) DESC,
            p.release_date DESC
        `;
        
        // Transform the raw result to match expected format
        programs = programs.map((program: any) => ({
          ...program,
          category: {
            id: program.categoryId,
            name: program.categoryName,
            description: program.categoryDescription,
          },
          // Remove the individual category fields
          categoryId: undefined,
          categoryName: undefined,
          categoryDescription: undefined,
        }));
      } else {
        // Empty search query, fallback to regular query
        programs = await this.prisma.program.findMany({
          where: whereConditions,
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
        });
      }
    } else {
      // No search query, use regular indexed query
      programs = await this.prisma.program.findMany({
        where: whereConditions,
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
      });
    }

    const result = programs.map(this.mapToDiscoveryDto);

    // Cache the result
    await this.cacheService.set(cacheKey, result, {
      ttl: CACHE_TTL.DISCOVERY_SEARCH,
      logHitMiss: true,
    });

    return result;
  }

  async browsePrograms(
    browseDto: BrowseProgramsDto,
  ): Promise<ProgramDiscoveryDto[]> {
    const cacheKey = this.cacheService.generateKey(
      CACHE_KEYS.DISCOVERY_BROWSE,
      browseDto,
    );

    // Try to get from cache first
    const cachedResult = await this.cacheService.get<ProgramDiscoveryDto[]>(
      cacheKey,
      { logHitMiss: true },
    );

    if (cachedResult) {
      return cachedResult;
    }

    // If not in cache, fetch from database
    const whereConditions: any = {
      status: Status.PUBLISHED,
    };

    if (browseDto.categoryId) {
      whereConditions.categoryId = browseDto.categoryId;
    }

    if (browseDto.language) {
      whereConditions.language = browseDto.language;
    }

    if (browseDto.mediaType) {
      whereConditions.mediaType = browseDto.mediaType;
    }

    const programs = await this.prisma.program.findMany({
      where: whereConditions,
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
    });

    const result = programs.map(this.mapToDiscoveryDto);

    // Cache the result
    await this.cacheService.set(cacheKey, result, {
      ttl: CACHE_TTL.DISCOVERY_BROWSE,
      logHitMiss: true,
    });

    return result;
  }

  async getProgram(id: number): Promise<ProgramDiscoveryDto> {
    const cacheKey = this.cacheService.generateKey(
      CACHE_KEYS.DISCOVERY_PROGRAM,
      { id },
    );

    // Try to get from cache first
    const cachedResult = await this.cacheService.get<ProgramDiscoveryDto>(
      cacheKey,
      { logHitMiss: true },
    );

    if (cachedResult) {
      return cachedResult;
    }

    // If not in cache, fetch from database
    const program = await this.prisma.program.findFirst({
      where: {
        id,
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
    });

    if (!program) {
      throw new NotFoundException(`Published program with ID ${id} not found`);
    }

    const result = this.mapToDiscoveryDto(program);

    // Cache the result
    await this.cacheService.set(cacheKey, result, {
      ttl: CACHE_TTL.DISCOVERY_PROGRAM,
      logHitMiss: true,
    });

    return result;
  }

  private mapToDiscoveryDto(program: any): ProgramDiscoveryDto {
    return {
      id: program.id,
      name: program.name,
      description: program.description,
      language: program.language,
      durationSec: program.durationSec,
      releaseDate: program.releaseDate,
      mediaUrl: program.mediaUrl,
      mediaType: program.mediaType,
      status: program.status,
      category: program.category,
      createdAt: program.createdAt,
      updatedAt: program.updatedAt,
    };
  }
}
