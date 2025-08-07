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
