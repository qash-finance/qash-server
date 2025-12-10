import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InvoiceRepository, InvoiceWithRelations } from './invoice.repository';
import { PayrollRepository } from '../payroll/payroll.repository';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceQueryDto,
  InvoiceStatsDto,
} from './invoice.dto';
import {
  InvoiceCreateInput,
  InvoiceModel,
  InvoiceUpdateInput,
} from 'src/database/generated/models';
import { InvoiceStatusEnum } from 'src/database/generated/client';
import { handleError } from 'src/common/utils/errors';
import { PrismaService } from 'src/database/prisma.service';
import { MailService } from '../mail/mail.service';
import { JsonValue } from '@prisma/client/runtime/client';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly payrollRepository: PayrollRepository,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Create new invoice (usually called by scheduled job)
   */
  async createInvoice(dto: CreateInvoiceDto): Promise<InvoiceModel> {
    return this.prisma.executeInTransaction(async (tx) => {
      // Verify payroll exists - we'll get companyId from the payroll
      const payroll = await this.payrollRepository.findById(
        dto.payrollId,
        1, // We'll validate company ownership later
        tx,
      );

      if (!payroll) {
        throw new NotFoundException('Payroll not found');
      }

      // Generate unique invoice number
      const invoiceNumber = await this.invoiceRepository.generateInvoiceNumber(
        payroll.companyId,
        tx,
      );

      const invoiceData: InvoiceCreateInput = {
        invoiceNumber,
        issueDate: new Date(),
        dueDate: new Date(dto.dueDate),
        payroll: {
          connect: {
            id: payroll.id,
          },
        },
        employee: {
          connect: {
            id: payroll.employeeId,
          },
        },
        fromDetails: dto.fromDetails as unknown as JsonValue,
        billToDetails: dto.billToDetails as unknown as JsonValue,
        items: dto.items as unknown as JsonValue,
        subtotal: dto.subtotal,
        taxRate: dto.taxRate,
        taxAmount: dto.taxAmount,
        total: dto.total,
        metadata: dto.metadata,
      };

      const invoice = await this.invoiceRepository.create(invoiceData, tx);

      return invoice;
    }, 'createInvoice');
  }

  /**
   * Generate invoice from payroll (automated process)
   */
  async generateInvoiceFromPayroll(
    payrollId: number,
    companyId: number,
  ): Promise<InvoiceModel> {
    return this.prisma.executeInTransaction(async (tx) => {
      const payroll = await this.payrollRepository.findById(
        payrollId,
        companyId,
        tx,
      );

      if (!payroll) {
        throw new NotFoundException('Payroll not found');
      }

      const latestInvoice = (
        await this.invoiceRepository.findMany(
          { payrollId },
          { orderBy: { issueDate: 'desc' }, take: 1 },
          tx,
        )
      )?.[0];

      if (latestInvoice) {
        const now = new Date();
        const sameMonth =
          latestInvoice.issueDate.getUTCFullYear() === now.getUTCFullYear() &&
          latestInvoice.issueDate.getUTCMonth() === now.getUTCMonth();
        if (sameMonth) {
          throw new ConflictException(
            'An invoice for this payroll already exists this month',
          );
        }
      }

      // Generate invoice number
      const invoiceNumber = await this.invoiceRepository.generateInvoiceNumber(
        companyId,
        tx,
      );

      // Calculate due date (typically 30 days from issue)
      const issueDate = new Date();
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + 30);

      // Build invoice data from payroll
      const fromDetails = {
        name: payroll.employee.name,
        email: payroll.employee.email,
        companyName: payroll.company.companyName,
        address1: payroll.employee.address1,
        address2: payroll.employee.address2,
        city: payroll.employee.city,
        country: payroll.employee.country,
        postalCode: payroll.employee.postalCode,
        walletAddress: payroll.employee.walletAddress,
        network: payroll.network,
        token: payroll.token,
      };

      const billToDetails = {
        companyName: payroll.company.companyName,
        address1: payroll.company.address1,
        address2: payroll.company.address2,
        city: payroll.company.city,
        country: payroll.company.country,
        postalCode: payroll.company.postalCode,
      };

      const items = [
        {
          description: `Salary for ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
          quantity: 1,
          pricePerUnit: payroll.amount,
          total: payroll.amount,
        },
      ];

      const taxRate = '0.00';
      const subtotal = payroll.amount;
      const taxAmount = '0.00';
      const total = payroll.amount;

      const invoiceData = {
        invoiceNumber,
        issueDate,
        dueDate,
        payrollId,
        employeeId: payroll.employeeId,
        fromDetails,
        billToDetails,
        items,
        subtotal,
        taxRate,
        taxAmount,
        total,
      };

      const invoice = await this.invoiceRepository.create(invoiceData, tx);

      return invoice;
    }, 'generateInvoiceFromPayroll');
  }

  /**
   * Get invoices (for company dashboard)
   */
  async getInvoices(
    companyId: number,
    query: InvoiceQueryDto,
  ): Promise<{
    invoices: InvoiceModel[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const filters = {
        companyId,
        payrollId: query.payrollId,
        status: query.status,
        search: query.search,
      };

      const result = await this.invoiceRepository.findManyPaginated(
        filters,
        {
          page: query.page || 1,
          limit: query.limit || 10,
          orderBy: { createdAt: 'desc' },
        },
        {
          include: {
            payroll: {
              include: {
                employee: true,
                company: true,
              },
            },
            employee: true,
            fromCompany: true,
            toCompany: true,
          },
        },
      );

      return {
        invoices: result.data,
        pagination: {
          page: query.page || 1,
          limit: query.limit || 10,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching invoices:', error);
      handleError(error, this.logger);
    }
  }

  /**
   * Get invoices for employee (by email)
   */
  async getEmployeeInvoices(email: string): Promise<InvoiceModel[]> {
    try {
      return await this.invoiceRepository.findByEmployeeEmail(email);
    } catch (error) {
      this.logger.error(
        `Error fetching invoices for employee ${email}:`,
        error,
      );
      handleError(error, this.logger);
    }
  }

  /**
   * Get invoice details
   */
  async getInvoiceDetails(id: number): Promise<InvoiceModel> {
    try {
      const invoice = await this.invoiceRepository.findById(id);

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      return invoice;
    } catch (error) {
      this.logger.error(`Error fetching invoice ${id}:`, error);
      handleError(error, this.logger);
    }
  }

  /**
   * Get invoice by invoice number (for employee access)
   */
  async getInvoiceByNumber(
    invoiceNumber: string,
  ): Promise<InvoiceWithRelations> {
    try {
      const invoice =
        await this.invoiceRepository.findByInvoiceNumber(invoiceNumber);

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      return invoice;
    } catch (error) {
      this.logger.error(`Error fetching invoice ${invoiceNumber}:`, error);
      handleError(error, this.logger);
    }
  }

  /**
   * Update invoice (employee can update their details)
   */
  async updateInvoice(
    id: number,
    dto: UpdateInvoiceDto,
    employeeEmail?: string,
  ): Promise<InvoiceModel> {
    return this.prisma.executeInTransaction(async (tx) => {
      const invoice = await this.invoiceRepository.findById(id, tx);

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      // If employee email is provided, verify they own this invoice
      if (employeeEmail && invoice.employee.email !== employeeEmail) {
        throw new ForbiddenException('You can only update your own invoices');
      }

      // Only allow updates if invoice is in SENT or REVIEWED status
      const updatableStatuses: InvoiceStatusEnum[] = [
        InvoiceStatusEnum.SENT,
        InvoiceStatusEnum.REVIEWED,
      ];
      if (!updatableStatuses.includes(invoice.status)) {
        throw new BadRequestException(
          'Invoice can only be updated when in SENT or REVIEWED status',
        );
      }

      // transform dto to InvoiceUpdateInput
      const updateData: InvoiceUpdateInput = {
        ...dto,
        fromDetails: dto.fromDetails as unknown as JsonValue,
        billToDetails: dto.billToDetails as unknown as JsonValue,
        items: dto.items as unknown as JsonValue,
      };

      const updatedInvoice = await this.invoiceRepository.update(
        { id },
        updateData,
        tx,
      );

      this.logger.log(`Updated invoice ${id}`);

      return updatedInvoice;
    }, 'updateInvoice');
  }

  /**
   * Send invoice to employee
   */
  async sendInvoice(id: number, companyId: number): Promise<InvoiceModel> {
    return this.prisma.executeInTransaction(async (tx) => {
      const invoice = await this.invoiceRepository.findById(id, tx);

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      if (invoice.payroll.companyId !== companyId) {
        throw new ForbiddenException('Access denied');
      }

      if (invoice.status !== InvoiceStatusEnum.DRAFT) {
        throw new BadRequestException('Only draft invoices can be sent');
      }

      const updatedInvoice = await this.invoiceRepository.update(
        { id },
        {
          status: InvoiceStatusEnum.SENT,
          sentAt: new Date(),
        },
        tx,
      );

      // Send email to employee
      try {
        await this.mailService.sendInvoiceNotification(
          invoice.employee.email,
          invoice.invoiceNumber,
          invoice.dueDate,
        );
      } catch (emailError) {
        this.logger.error('Failed to send invoice email:', emailError);
        // Don't fail the transaction, just log the error
      }

      this.logger.log(
        `Sent invoice ${invoice.invoiceNumber} to ${invoice.employee.email}`,
      );

      return updatedInvoice;
    }, 'sendInvoice');
  }

  /**
   * Employee reviews invoice
   */
  async reviewInvoice(
    id: number,
    employeeEmail: string,
  ): Promise<InvoiceModel> {
    return this.prisma.executeInTransaction(async (tx) => {
      const invoice = await this.invoiceRepository.findById(id, tx);

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      if (invoice.employee.email !== employeeEmail) {
        throw new ForbiddenException('You can only review your own invoices');
      }

      if (invoice.status !== InvoiceStatusEnum.SENT) {
        throw new BadRequestException('Only sent invoices can be reviewed');
      }

      const updatedInvoice = await this.invoiceRepository.update(
        { id },
        {
          status: InvoiceStatusEnum.REVIEWED,
          reviewedAt: new Date(),
        },
        tx,
      );

      this.logger.log(
        `Invoice ${invoice.invoiceNumber} reviewed by ${employeeEmail}`,
      );

      return updatedInvoice;
    }, 'reviewInvoice');
  }

  /**
   * Employee confirms invoice
   */
  async confirmInvoice(
    id: number,
    employeeEmail: string,
  ): Promise<InvoiceModel> {
    return this.prisma.executeInTransaction(async (tx) => {
      const invoice = await this.invoiceRepository.findById(id, tx);

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      if (invoice.employee.email !== employeeEmail) {
        throw new ForbiddenException('You can only confirm your own invoices');
      }

      if (invoice.status !== InvoiceStatusEnum.REVIEWED) {
        throw new BadRequestException(
          'Only reviewed invoices can be confirmed',
        );
      }

      const updatedInvoice = await this.invoiceRepository.update(
        { id },
        {
          status: InvoiceStatusEnum.CONFIRMED,
          confirmedAt: new Date(),
        },
        tx,
      );

      // Send notification to company
      try {
        await this.mailService.sendInvoiceConfirmationNotification(
          invoice.payroll.company.notificationEmail,
          invoice.invoiceNumber,
          invoice.employee.name,
        );
      } catch (emailError) {
        this.logger.error('Failed to send confirmation email:', emailError);
      }

      this.logger.log(
        `Invoice ${invoice.invoiceNumber} confirmed by ${employeeEmail}`,
      );

      return updatedInvoice;
    }, 'confirmInvoice');
  }

  /**
   * Cancel invoice
   */
  async cancelInvoice(id: number, companyId: number): Promise<InvoiceModel> {
    return this.prisma.executeInTransaction(async (tx) => {
      const invoice = await this.invoiceRepository.findById(id, tx);

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      if (invoice.payroll.companyId !== companyId) {
        throw new ForbiddenException('Access denied');
      }

      if (invoice.status === InvoiceStatusEnum.CONFIRMED) {
        throw new BadRequestException('Cannot cancel confirmed invoices');
      }

      const updatedInvoice = await this.invoiceRepository.update(
        { id },
        { status: InvoiceStatusEnum.CANCELLED },
        tx,
      );

      this.logger.log(`Cancelled invoice ${invoice.invoiceNumber}`);

      return updatedInvoice;
    }, 'cancelInvoice');
  }

  /**
   * Get invoice statistics
   */
  async getInvoiceStats(companyId: number): Promise<InvoiceStatsDto> {
    try {
      return await this.invoiceRepository.getStats(companyId);
    } catch (error) {
      this.logger.error('Error fetching invoice stats:', error);
      handleError(error, this.logger);
    }
  }

  /**
   * Get overdue invoices (for scheduled notifications)
   */
  async getOverdueInvoices(date?: Date): Promise<InvoiceModel[]> {
    try {
      const overdueDate = date || new Date();
      return await this.invoiceRepository.findDueInvoices(overdueDate);
    } catch (error) {
      this.logger.error('Error fetching overdue invoices:', error);
      handleError(error, this.logger);
    }
  }
}
