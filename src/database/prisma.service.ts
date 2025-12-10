import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from './generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { AppConfigService } from '../modules/shared/config/config.service';
import { handleError } from 'src/common/utils/errors';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  public client: PrismaClient;
  private readonly logger = new Logger(PrismaService.name);

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

  get employee() {
    return this.client.employee;
  }

  get employeeGroup() {
    return this.client.employeeGroup;
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

  get user() {
    return this.client.user;
  }

  get otpCode() {
    return this.client.otpCode;
  }

  get userSession() {
    return this.client.userSession;
  }

  get company() {
    return this.client.company;
  }

  get teamMember() {
    return this.client.teamMember;
  }

  get invoice() {
    return this.client.invoice;
  }

  get bill() {
    return this.client.bill;
  }

  get payroll() {
    return this.client.payroll;
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

  public async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, any>,
  ): Promise<T> {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      this.logger.error(`Failed ${operationName} :`, error, context);
      handleError(error, this.logger);
      throw error;
    }
  }

  public async executeInTransaction<T>(
    operation: (tx: any) => Promise<T>,
    operationName: string,
    context?: Record<string, any>,
  ): Promise<T> {
    return this.executeWithErrorHandling(
      () => this.$transaction(operation),
      `${operationName} (transaction)`,
      context,
    );
  }
}
