import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InvoiceRepository, InvoiceWithRelations } from '../invoice.repository';
import { InvoiceItemService } from './invoice-item.service';
import { PayrollRepository } from '../../payroll/payroll.repository';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceQueryDto,
  InvoiceStatsDto,
} from '../invoice.dto';
import {
  CompanyWhereInput,
  InvoiceCreateInput,
  InvoiceModel,
  InvoiceUpdateInput,
  InvoiceWhereInput,
} from 'src/database/generated/models';
import {
  InvoiceStatusEnum,
  InvoiceTypeEnum,
} from 'src/database/generated/client';
import { handleError } from 'src/common/utils/errors';
import { PrismaService } from 'src/database/prisma.service';
import { MailService } from '../../mail/mail.service';
import { JsonValue } from '@prisma/client/runtime/client';
import { ErrorPayroll } from 'src/common/constants/errors';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly invoiceItemService: InvoiceItemService,
    private readonly payrollRepository: PayrollRepository,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  //#region GET METHODS
  // *************************************************
  // **************** GET METHODS ********************
  // *************************************************
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
      const filters: InvoiceWhereInput = {
        toCompanyId: companyId,
        payrollId: query.payrollId,
        status: query.status,
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
            payroll: {},
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
   * Get invoice by invoice uuid (for employee access)
   */
  async getInvoiceByUUID(invoiceUUID: string): Promise<InvoiceWithRelations> {
    try {
      const invoice = await this.invoiceRepository.findByUUID(invoiceUUID);

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      return invoice;
    } catch (error) {
      this.logger.error(`Error fetching invoice ${invoiceUUID}:`, error);
      handleError(error, this.logger);
    }
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
  //#endregion GET METHODS

  //#region POST METHODS
  // *************************************************
  // **************** POST METHODS *******************
  // *************************************************
  /**
   * Create new invoice (usually called by scheduled job)
   */
  async createPayrollInvoice(
    dto: CreateInvoiceDto,
    companyId: number,
  ): Promise<InvoiceModel> {
    return this.prisma.executeInTransaction(async (tx) => {
      // Verify payroll exists
      const payroll = await this.payrollRepository.findById(
        dto.payrollId,
        companyId,
        tx,
      );

      if (!payroll) {
        throw new NotFoundException(ErrorPayroll.PayrollNotFound);
      }

      // Generate unique invoice number
      const invoiceNumber =
        await this.invoiceRepository.generatePayrollInvoiceNumber(
          payroll.id,
          payroll.employeeId,
          tx,
        );

      const invoiceData: InvoiceCreateInput = {
        invoiceType: InvoiceTypeEnum.EMPLOYEE,
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
        toCompany: {
          connect: {
            id: companyId,
          },
        },
        emailTo: dto.billToDetails?.email || payroll.employee.email,
        emailCc: [],
        emailBcc: [],
        fromDetails: dto.fromDetails as unknown as JsonValue,
        toDetails: dto.billToDetails as unknown as JsonValue,
        subtotal: dto.subtotal,
        taxRate: dto.taxRate,
        taxAmount: dto.taxAmount,
        discount: '0.00',
        total: dto.total,
        currency: 'USD',
        metadata: dto.metadata,
        status: InvoiceStatusEnum.SENT,
      };

      const invoice = await this.invoiceRepository.create(invoiceData, tx);

      return invoice;
    }, 'createInvoice');
  }
  //#endregion POST METHODS

  /**
   * Generate invoice from payroll (automated process)
   */
  async generateInvoiceFromPayroll(
    payrollId: number,
    companyId: number,
    options?: {
      issueDate?: Date;
      dueDate?: Date;
      isAutoGenerated?: boolean;
      autoGenerateFromPayrollId?: number;
    },
    tx?: any,
  ): Promise<InvoiceModel> {
    const executeTransaction = tx
      ? async (callback: any) => callback(tx)
      : (callback: any) =>
          this.prisma.executeInTransaction(
            callback,
            'generateInvoiceFromPayroll',
          );

    return executeTransaction(async (transactionClient: any) => {
      const payroll = await this.payrollRepository.findById(
        payrollId,
        companyId,
        transactionClient,
      );

      if (!payroll) {
        throw new NotFoundException('Payroll not found');
      }

      // Check for duplicate in same month
      const latestInvoice =
        await this.invoiceRepository.findLatestInvoiceForPayroll(
          payrollId,
          transactionClient,
        );

      if (latestInvoice) {
        const now = options?.issueDate || new Date();
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
      const invoiceNumber =
        await this.invoiceRepository.generatePayrollInvoiceNumber(
          payrollId,
          payroll.employeeId,
          transactionClient,
        );

      // Calculate dates
      const issueDate = options?.issueDate || new Date();
      const dueDate =
        options?.dueDate ||
        (() => {
          const date = new Date(issueDate);
          date.setDate(date.getDate() + 30);
          return date;
        })();

      // Build invoice data from payroll
      const fromDetails = {
        name: payroll.employee.name,
        email: payroll.employee.email,
        address1: payroll.employee.address1,
        address2: payroll.employee.address2,
        city: payroll.employee.city,
        country: payroll.employee.country,
        postalCode: payroll.employee.postalCode,
        walletAddress: payroll.employee.walletAddress,
        network: payroll.network,
        token: payroll.token,
      };

      const toDetails = {
        companyName: payroll.company.companyName,
        address1: payroll.company.address1,
        address2: payroll.company.address2,
        city: payroll.company.city,
        country: payroll.company.country,
        postalCode: payroll.company.postalCode,
        email: payroll.company.notificationEmail,
      };

      // Calculate financials
      const taxRate = '0.00';
      const subtotal = payroll.amount;
      const taxAmount = '0.00';
      const discount = '0.00';
      const total = payroll.amount;

      // Create invoice
      const invoiceData: InvoiceCreateInput = {
        invoiceType: InvoiceTypeEnum.EMPLOYEE,
        invoiceNumber,
        issueDate,
        dueDate,
        payroll: { connect: { id: payrollId } },
        employee: { connect: { id: payroll.employeeId } },
        toCompany: { connect: { id: companyId } },
        emailTo: payroll.employee.email,
        emailCc: payroll.company.notificationEmail
          ? [payroll.company.notificationEmail]
          : [],
        emailBcc: [],
        fromDetails: fromDetails as any,
        toDetails: toDetails as any,
        subtotal,
        taxRate,
        taxAmount,
        discount,
        total,
        currency: 'USD',
        status: 'SENT',
        isAutoGenerated: options?.isAutoGenerated || false,
        autoGenerateFromPayrollId: options?.autoGenerateFromPayrollId,
      };

      const invoice = await this.invoiceRepository.create(
        invoiceData,
        transactionClient,
      );

      // Create invoice items
      await this.invoiceItemService.createItems(
        invoice.uuid,
        companyId,
        [
          {
            description: `Salary for ${issueDate.toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}`,
            quantity: '1',
            unitPrice: payroll.amount,
            unit: 'month',
            taxRate: '0.00',
            discount: '0.00',
            order: 0,
          },
        ],
        transactionClient,
      );

      this.logger.log(
        `Generated invoice ${invoice.invoiceNumber} from payroll ${payrollId}`,
      );

      return invoice;
    });
  }

  /**
   * Find latest invoice for payroll (used by scheduler)
   */
  async findLatestInvoiceForPayroll(
    payrollId: number,
    tx?: any,
  ): Promise<InvoiceModel | null> {
    return this.invoiceRepository.findLatestInvoiceForPayroll(payrollId, tx);
  }

  //#region PATCH METHODS
  // *************************************************
  // **************** PATCH METHODS ******************
  // *************************************************
  /**
   * Update invoice (employee can update their details)
   */
  async updateInvoice(
    invoiceUUID: string,
    dto: UpdateInvoiceDto,
    employeeEmail?: string,
  ): Promise<InvoiceModel> {
    return this.prisma.executeInTransaction(async (tx) => {
      const invoice = await this.invoiceRepository.findByUUID(invoiceUUID, tx);

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

      // transform dto to InvoiceUpdateInput (exclude items - handled separately)
      const { items, ...dtoWithoutItems } = dto;
      const updateData: InvoiceUpdateInput = {
        ...dtoWithoutItems,
        fromDetails: dto.fromDetails as unknown as JsonValue,
      };

      const updatedInvoice = await this.invoiceRepository.update(
        { uuid: invoiceUUID },
        updateData,
        tx,
      );

      return updatedInvoice;
    }, 'updateInvoice');
  }

  /**
   * Send invoice to employee
   */
  async sendInvoice(
    invoiceUUID: string,
    companyId: number,
  ): Promise<InvoiceModel> {
    return this.prisma.executeInTransaction(async (tx) => {
      const invoice = await this.invoiceRepository.findByUUID(invoiceUUID, tx);

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
        { uuid: invoiceUUID },
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
    invoiceUUID: string,
    employeeEmail: string,
  ): Promise<InvoiceModel> {
    return this.prisma.executeInTransaction(async (tx) => {
      const invoice = await this.invoiceRepository.findByUUID(invoiceUUID, tx);

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
        { uuid: invoiceUUID },
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
    invoiceUUID: string,
    employeeEmail: string,
  ): Promise<InvoiceModel> {
    return this.prisma.executeInTransaction(async (tx) => {
      const invoice = await this.invoiceRepository.findByUUID(invoiceUUID, tx);

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
        { uuid: invoiceUUID },
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
  async cancelInvoice(
    invoiceUUID: string,
    companyId: number,
  ): Promise<InvoiceModel> {
    return this.prisma.executeInTransaction(async (tx) => {
      const invoice = await this.invoiceRepository.findByUUID(invoiceUUID, tx);

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
        { uuid: invoiceUUID },
        { status: InvoiceStatusEnum.CANCELLED },
        tx,
      );

      this.logger.log(`Cancelled invoice ${invoice.invoiceNumber}`);

      return updatedInvoice;
    }, 'cancelInvoice');
  }
  //#region PATCH METHODS
}
