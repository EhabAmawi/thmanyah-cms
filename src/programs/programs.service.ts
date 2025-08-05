import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { Language, MediaType } from '@prisma/client';

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
      },
    });
  }

  async findAll() {
    return this.prisma.program.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.program.findUnique({
      where: { id },
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
      orderBy: {
        releaseDate: 'desc',
      },
    });
  }

  async findByMediaType(mediaType: MediaType) {
    return this.prisma.program.findMany({
      where: { mediaType },
      orderBy: {
        releaseDate: 'desc',
      },
    });
  }

  async findRecent(limit: number = 10) {
    return this.prisma.program.findMany({
      take: limit,
      orderBy: {
        releaseDate: 'desc',
      },
    });
  }
}
