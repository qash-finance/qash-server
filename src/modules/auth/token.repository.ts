import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma, Tokens, Users } from '@prisma/client';
import { TokenCreateDto } from './auth.dto';

@Injectable()
export class TokenRepository {
  private readonly logger = new Logger(TokenRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findOne(
    where: Prisma.TokensWhereInput,
    options?: Prisma.TokensFindFirstArgs,
  ): Promise<(Tokens & { users?: Users }) | null> {
    const row = await this.prisma.tokens.findFirst({
      where,
      include: options?.include ?? { users: { include: { otherUsers: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return row ?? null;
  }

  public async create(dto: TokenCreateDto): Promise<Tokens> {
    const now = new Date();
    const row = await this.prisma.tokens.create({
      data: {
        createdAt: now,
        updatedAt: now,
        tokenType: dto.tokenType,
        userId: dto.user.id,
      },
    });
    return row;
  }

  public async delete(where: Prisma.TokensWhereInput): Promise<number> {
    const result = await this.prisma.tokens.deleteMany({ where });
    return result.count;
  }
}
