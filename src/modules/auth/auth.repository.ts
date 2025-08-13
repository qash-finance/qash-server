import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Auths, Prisma } from '@prisma/client';
import { AuthCreateDto } from './auth.dto';
@Injectable()
export class AuthRepository {
  private readonly logger = new Logger(AuthRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findOne(
    where: Prisma.AuthsWhereInput,
    options?: Prisma.AuthsFindFirstArgs,
  ): Promise<Auths> {
    const row = await this.prisma.auths.findFirst({
      where,
      ...options,
      orderBy: { createdAt: 'desc' },
    });
    return row;
  }

  public async delete(where: Prisma.AuthsWhereInput): Promise<number> {
    const result = await this.prisma.auths.deleteMany({ where });
    return result.count;
  }

  public async create(dto: AuthCreateDto): Promise<Auths> {
    const now = new Date();
    const row = await this.prisma.auths.create({
      data: {
        createdAt: now,
        updatedAt: now,
        accessToken: dto.accessToken,
        refreshToken: dto.refreshToken,
        userId: dto.user.id,
      },
    });
    return row;
  }

  public async update(
    where: Prisma.AuthsWhereUniqueInput,
    data: Partial<Auths>,
  ): Promise<Auths> {
    const row = await this.prisma.auths.update({
      where,
      data: { ...data, updatedAt: new Date() },
    });
    return row;
  }
}
