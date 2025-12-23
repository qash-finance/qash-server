import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Client, Prisma, PrismaClient } from 'src/database/generated/client';
import {
  BaseRepository,
  PrismaTransactionClient,
} from '../../../database/base.repository';

@Injectable()
export class ClientRepository extends BaseRepository<
  Client,
  Prisma.ClientWhereInput,
  Prisma.ClientCreateInput,
  Prisma.ClientUpdateInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getModel(tx?: PrismaTransactionClient): PrismaClient['client'] {
    return tx ? tx.client : this.prisma.client;
  }

  protected getModelName(): string {
    return 'Client';
  }
}

