import { Module } from '@nestjs/common';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './services/invoice.service';
import { InvoiceRepository } from './repositories/invoice.repository';
import { InvoiceItemRepository } from './repositories/invoice-item.repository';
import { InvoiceItemService } from './services/invoice-item.service';
import { InvoiceScheduleRepository } from './repositories/invoice-schedule.repository';
import { InvoiceScheduleService } from './services/invoice-schedule.service';
import { InvoiceSchedulerService } from './services/invoice-scheduler.service';
import { PdfService } from './services/pdf.service';
import { PrismaModule } from '../../database/prisma.module';
import { PayrollModule } from '../payroll/payroll.module';
import { MailModule } from '../mail/mail.module';
import { AuthModule } from '../auth/auth.module';
import { CompanyModule } from '../company/company.module';

@Module({
  imports: [PrismaModule, PayrollModule, MailModule, AuthModule, CompanyModule],
  controllers: [InvoiceController],
  providers: [
    InvoiceService,
    InvoiceRepository,
    InvoiceItemRepository,
    InvoiceItemService,
    InvoiceScheduleRepository,
    InvoiceScheduleService,
    InvoiceSchedulerService,
    PdfService,
  ],
  exports: [
    InvoiceService,
    InvoiceRepository,
    InvoiceItemRepository,
    InvoiceItemService,
    InvoiceScheduleRepository,
    InvoiceScheduleService,
    PdfService,
  ],
})
export class InvoiceModule {}
