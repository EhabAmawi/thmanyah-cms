import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { Language, MediaType, Status } from '@prisma/client';

@Injectable()
export class ProgramsService {
  constructor(private prisma: PrismaService) {}

  async create(createProgramDto: CreateProgramDto) {
    return this.prisma.program.create({
      data: {
        ...createProgramDto,
        releaseDate: new Date(createProgramDto.releaseDate),
        language: createProgramDto.language || Language.ENGLISH,
        mediaType: createProgramDto.mediaType || MediaType.VIDEO,
        status: createProgramDto.status || Status.DRAFT,
      },
      include: {
        category: true,
      },
    });
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

    return this.prisma.program.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });
  }

  async remove(id: number) {
    return this.prisma.program.delete({
      where: { id },
    });
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
}
