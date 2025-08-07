import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../cache';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const result = await this.prisma.category.create({
      data: createCategoryDto,
    });

    // Invalidate categories cache
    await this.invalidateCategoriesCache();

    return result;
  }

  async findAll() {
    const cacheKey = this.cacheService.generateKey(CACHE_KEYS.CATEGORIES_LIST, {
      active: false,
    });

    // Try to get from cache first
    const cachedResult = await this.cacheService.get(cacheKey, {
      logHitMiss: true,
    });

    if (cachedResult) {
      return cachedResult;
    }

    // If not in cache, fetch from database
    const result = await this.prisma.category.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Cache the result
    await this.cacheService.set(cacheKey, result, {
      ttl: CACHE_TTL.CATEGORIES_LIST,
      logHitMiss: true,
    });

    return result;
  }

  async findOne(id: number) {
    return this.prisma.category.findUnique({
      where: { id },
    });
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    const result = await this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });

    // Invalidate categories cache
    await this.invalidateCategoriesCache();

    return result;
  }

  async remove(id: number) {
    const result = await this.prisma.category.delete({
      where: { id },
    });

    // Invalidate categories cache
    await this.invalidateCategoriesCache();

    return result;
  }

  async findActive() {
    const cacheKey = this.cacheService.generateKey(CACHE_KEYS.CATEGORIES_LIST, {
      active: true,
    });

    // Try to get from cache first
    const cachedResult = await this.cacheService.get(cacheKey, {
      logHitMiss: true,
    });

    if (cachedResult) {
      return cachedResult;
    }

    // If not in cache, fetch from database
    const result = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: {
        name: 'asc',
      },
    });

    // Cache the result
    await this.cacheService.set(cacheKey, result, {
      ttl: CACHE_TTL.CATEGORIES_LIST,
      logHitMiss: true,
    });

    return result;
  }

  private async invalidateCategoriesCache() {
    // Invalidate all categories cache keys (both active and non-active)
    await this.cacheService.delPattern(`${CACHE_KEYS.CATEGORIES_LIST}:*`);
  }
}
