import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { BillRepository, BillWithInvoice } from './bill.repository';
import { InvoiceRepository } from '../invoice/repositories/invoice.repository';
import {
  BillQueryDto,
  BillStatsDto,
  PayBillsDto,
  BillTimelineDto,
  BatchPaymentResultDto,
} from './bill.dto';
import { BillCreateInput, BillModel } from 'src/database/generated/models';
import {
  BillStatusEnum,
  InvoiceStatusEnum,
} from 'src/database/generated/client';
import { handleError } from 'src/common/utils/errors';
import { PrismaService } from 'src/database/prisma.service';
import { PrismaTransactionClient } from 'src/database/base.repository';
import { ErrorBill, ErrorInvoice } from 'src/common/constants/errors';

@Injectable()
export class BillService {
  private readonly logger = new Logger(BillService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly billRepository: BillRepository,
    private readonly invoiceRepository: InvoiceRepository,
  ) {}

  //#region GET METHODS
  // *************************************************
  // **************** GET METHODS ********************
  // *************************************************
  /**
   * Get all bills with pagination and filters
   */
  async getBills(
    companyId: number,
    query: BillQueryDto,
  ): Promise<{
    bills: BillModel[];
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
        status: query.status,
        groupId: query.groupId,
        search: query.search,
      };

      const result = await this.billRepository.findManyPaginated(
        filters,
        {
          page: query.page || 1,
          limit: query.limit || 10,
          orderBy: { createdAt: 'desc' },
        },
        {
          include: {
            invoice: {
              include: {
                employee: {
                  include: {
                    group: true,
                  },
                },
              },
            },
            company: true,
          },
        },
      );

      return {
        bills: result.data,
        pagination: {
          page: query.page || 1,
          limit: query.limit || 10,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching bills:', error);
      handleError(error, this.logger);
    }
  }

  /**
   * Get bill details with timeline
   */
  async getBillDetails(
    uuid: string,
    companyId: number,
  ): Promise<{
    bill: BillWithInvoice;
    timeline: BillTimelineDto[];
  }> {
    try {
      const bill = await this.billRepository.findByUUIDWithInvoice(
        uuid,
        companyId,
      );

      if (!bill) {
        throw new NotFoundException(ErrorBill.BillNotFound);
      }

      // Build timeline
      const timeline: BillTimelineDto[] = [];

      // Invoice created
      timeline.push({
        event: 'invoice_created',
        timestamp: bill.invoice.createdAt,
      });

      // Invoice sent
      if (bill.invoice.sentAt) {
        timeline.push({
          event: 'invoice_sent',
          timestamp: bill.invoice.sentAt,
        });
      }

      // Invoice confirmed
      if (bill.invoice.confirmedAt) {
        timeline.push({
          event: 'invoice_confirmed',
          timestamp: bill.invoice.confirmedAt,
        });
      }

      // Bill created
      if (bill.createdAt) {
        timeline.push({
          event: 'bill_created',
          timestamp: bill.createdAt,
        });
      }

      // Bill paid
      if (bill.paidAt) {
        timeline.push({
          event: 'bill_paid',
          timestamp: bill.paidAt,
        });
      }

      // Sort timeline by timestamp
      timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      return {
        bill: bill,
        timeline: timeline,
      };
    } catch (error) {
      this.logger.error(`Error fetching bill details ${uuid}:`, error);
      handleError(error, this.logger);
    }
  }

  /**
   * Get overdue bills (for notifications)
   */
  async getOverdueBills(date?: Date): Promise<BillModel[]> {
    try {
      const overdueDate = date || new Date();
      return await this.billRepository.findOverdueBills(overdueDate);
    } catch (error) {
      this.logger.error('Error fetching overdue bills:', error);
      handleError(error, this.logger);
    }
  }

  /**
   * Get bill statistics
   */
  async getBillStats(companyId: number): Promise<BillStatsDto> {
    try {
      return await this.billRepository.getStats(companyId);
    } catch (error) {
      this.logger.error('Error fetching bill stats:', error);
      handleError(error, this.logger);
    }
  }
  //#endregion GET METHODS

  //#region POST METHODS
  // *************************************************
  // **************** POST METHODS *******************
  // *************************************************

  /**
   * Create bill from confirmed invoice
   */
  async createBillFromInvoice(
    invoiceUUID: string,
    companyId: number,
    tx: PrismaTransactionClient,
  ): Promise<BillModel> {
    // Verify invoice exists and is confirmed
    const invoice = await this.invoiceRepository.findByUUID(invoiceUUID, tx);

    if (!invoice) {
      throw new NotFoundException(ErrorInvoice.InvoiceNotFound);
    }

    if (invoice.payroll.companyId !== companyId) {
      throw new BadRequestException(ErrorInvoice.InvoiceNotBelongsToCompany);
    }

    if (invoice.status !== InvoiceStatusEnum.CONFIRMED) {
      throw new BadRequestException(ErrorInvoice.InvoiceNotConfirmed);
    }

    // Check if bill already exists for this invoice
    if (invoice.bill) {
      throw new ConflictException(ErrorBill.BillAlreadyExists);
    }

    const billData: BillCreateInput = {
      company: {
        connect: {
          id: companyId,
        },
      },
      invoice: {
        connect: {
          uuid: invoiceUUID,
        },
      },
      status: BillStatusEnum.PENDING,
      metadata: {},
    };

    const bill = await this.billRepository.create(billData, tx);

    return bill;
  }

  /**
   * Pay multiple bills in batch
   */
  async payBills(
    companyId: number,
    dto: PayBillsDto,
  ): Promise<BatchPaymentResultDto> {
    return await this.prisma.$transaction(async (tx) => {
      // Fetch all bills to validate with invoice included
      const bills = (await this.billRepository.findMany(
        {
          uuid: { in: dto.billUUIDs.map((uuid) => uuid.toString()) },
          companyId,
        },
        {
          include: {
            invoice: true,
          },
        },
        tx,
      )) as BillWithInvoice[];

      const foundBillIds = bills.map((bill) => bill.uuid);
      const notFoundBillIds = dto.billUUIDs.filter(
        (uuid) => !foundBillIds.includes(uuid.toString()),
      );

      if (notFoundBillIds.length > 0) {
        throw new NotFoundException(ErrorBill.BillsNotFoundOrNotPayable);
      }

      // Calculate total amount
      const totalAmount = bills
        .reduce((sum, bill) => sum + parseFloat(bill.invoice.total), 0)
        .toFixed(2);

      const paidAt = new Date();

      // Update all bills to paid status
      await this.billRepository.updateMultiple(
        dto.billUUIDs.map((uuid) => uuid.toString()),
        companyId,
        {
          status: BillStatusEnum.PAID,
          paidAt,
          transactionHash: dto.transactionHash,
        },
        tx,
      );

      // Update invoice status to paid
      await this.invoiceRepository.updateMultiple(
        bills.map((bill) => bill.invoice.uuid.toString()),
        InvoiceStatusEnum.PAID,
        paidAt,
        tx,
      );

      return {
        totalAmount,
      };
    });
  }

  /**
   * Mark overdue bills (scheduled job)
   */
  async markOverdueBills(date?: Date): Promise<number> {
    try {
      const overdueDate = date || new Date();
      const count = await this.billRepository.markOverdueBills(overdueDate);

      return count;
    } catch (error) {
      this.logger.error('Error marking overdue bills:', error);
      handleError(error, this.logger);
    }
  }

  //#endregion POST METHODS

  //#region PUT METHODS
  // *************************************************
  // **************** PUT METHODS *******************
  // *************************************************

  /**
   * Update bill status manually
   */
  async updateBillStatus(
    id: number,
    companyId: number,
    status: BillStatusEnum,
  ): Promise<BillModel> {
    return await this.prisma.$transaction(async (tx) => {
      const bill = await this.billRepository.findOne({ id, companyId }, tx);

      if (!bill) {
        throw new NotFoundException(ErrorBill.BillNotFound);
      }

      const updateData: any = { status };

      // If marking as paid, set paidAt
      if (status === BillStatusEnum.PAID && !bill.paidAt) {
        updateData.paidAt = new Date();
      }

      const updatedBill = await this.billRepository.update(
        { id, companyId },
        updateData,
        tx,
      );

      return updatedBill;
    });
  }

  //#endregion PUT METHODS

  //#region DELETE METHODS
  // *************************************************
  // **************** DELETE METHODS ****************
  // *************************************************
  /**
   * Delete bill
   */
  async deleteBill(uuid: string, companyId: number): Promise<void> {
    try {
      await this.prisma.$transaction(async (_tx: PrismaTransactionClient) => {
        const bill = await this.billRepository.findOne({ uuid, companyId });

        if (!bill) {
          throw new NotFoundException(ErrorBill.BillNotFound);
        }

        if (bill.status === BillStatusEnum.PAID) {
          throw new BadRequestException(ErrorBill.CannotDeletePaidBills);
        }

        await this.billRepository.delete({ uuid, companyId });
      });
    } catch (error) {
      this.logger.error(`Error deleting bill ${uuid}:`, error);
      handleError(error, this.logger);
    }
  }
  //#endregion DELETE METHODS
}
