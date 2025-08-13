import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PrismaClient, Users } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async updateOne(
    where: Prisma.UsersWhereInput,
    data: Prisma.UsersUpdateInput,
    include?: Prisma.UsersInclude,
  ): Promise<Users> {
    const existing = await this.prisma.users.findFirst({ where });
    if (!existing) {
      this.logger.error('User not found for updateOne');
      throw new Error('User not found');
    }
    const row = await this.prisma.users.update({
      where: { id: existing.id },
      data: { ...data, updatedAt: new Date() },
      include,
    });
    return row;
  }

  public async findOne(
    where: Prisma.UsersWhereInput,
    options?: Prisma.UsersFindFirstArgs,
  ): Promise<Users | null> {
    const row = await this.prisma.users.findFirst({
      where,
      include: options?.include,
      orderBy: { createdAt: 'desc' },
    });
    return row ?? null;
  }

  public async find(
    where: Prisma.UsersWhereInput,
    options?: Prisma.UsersFindManyArgs,
  ): Promise<Users[]> {
    const rows = await this.prisma.users.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: options?.include,
      skip: options?.skip,
      take: options?.take,
    });
    return rows;
  }

  public async create(
    data: Omit<Prisma.UsersCreateInput, 'createdAt' | 'updatedAt'>,
  ): Promise<Users> {
    const row = await this.prisma.users.create({
      data: {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return row;
  }

  public async updateById(
    id: number,
    data: Prisma.UsersUpdateInput,
    include?: Prisma.UsersInclude,
  ): Promise<Users> {
    const row = await this.prisma.users.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include,
    });
    return row;
  }
}
