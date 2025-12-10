import { Module } from '@nestjs/common';
import { BillController } from './bill.controller';
import { BillService } from './bill.service';
import { BillRepository } from './bill.repository';
import { PrismaModule } from '../../database/prisma.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { AuthModule } from '../auth/auth.module';
import { CompanyModule } from '../company/company.module';

@Module({
  imports: [PrismaModule, InvoiceModule, AuthModule, CompanyModule],
  controllers: [BillController],
  providers: [BillService, BillRepository],
  exports: [BillService, BillRepository],
})
export class BillModule {}
