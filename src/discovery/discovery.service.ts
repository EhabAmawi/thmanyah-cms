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

    if (searchDto.q) {
      whereConditions.OR = [
        {
          name: {
            contains: searchDto.q,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: searchDto.q,
            mode: 'insensitive',
          },
        },
      ];
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
