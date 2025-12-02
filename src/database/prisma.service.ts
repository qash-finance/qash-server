import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from './generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { AppConfigService } from '../modules/shared/config/config.service';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  public client: PrismaClient;

  constructor(private readonly appConfigService: AppConfigService) {
    const adapter = new PrismaPg({
      connectionString: appConfigService.databaseConfig.url,
    });

    this.client = new PrismaClient({ adapter });
  }

  public async onModuleInit(): Promise<void> {
    await this.client.$connect();
  }

  public async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }

  get addressBook() {
    return this.client.addressBook;
  }

  get categories() {
    return this.client.categories;
  }

  get paymentLink() {
    return this.client.paymentLink;
  }

  get paymentLinkRecord() {
    return this.client.paymentLinkRecord;
  }

  get notifications() {
    return this.client.notifications;
  }

  get $transaction() {
    return this.client.$transaction.bind(this.client);
  }

  get $connect() {
    return this.client.$connect.bind(this.client);
  }

  get $disconnect() {
    return this.client.$disconnect.bind(this.client);
  }
}
