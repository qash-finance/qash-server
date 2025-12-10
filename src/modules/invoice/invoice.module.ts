import { Module } from '@nestjs/common';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { InvoiceRepository } from './invoice.repository';
import { PdfService } from './pdf.service';
import { PrismaModule } from '../../database/prisma.module';
import { PayrollModule } from '../payroll/payroll.module';
import { MailModule } from '../mail/mail.module';
import { AuthModule } from '../auth/auth.module';
import { CompanyModule } from '../company/company.module';

@Module({
  imports: [PrismaModule, PayrollModule, MailModule, AuthModule, CompanyModule],
  controllers: [InvoiceController],
  providers: [InvoiceService, InvoiceRepository, PdfService],
  exports: [InvoiceService, InvoiceRepository, PdfService],
})
export class InvoiceModule {}
