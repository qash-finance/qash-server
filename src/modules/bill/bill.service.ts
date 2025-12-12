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
  BillDetailsDto,
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

@Injectable()
export class BillService {
  private readonly logger = new Logger(BillService.name);

  constructor(
    private readonly billRepository: BillRepository,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create bill from confirmed invoice
   */
  async createBillFromInvoice(
    invoiceUUID: string,
    companyId: number,
  ): Promise<BillModel> {
    return this.prisma.executeInTransaction(async (tx) => {
      // Verify invoice exists and is confirmed
      const invoice = await this.invoiceRepository.findByUUID(invoiceUUID, tx);

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      if (invoice.payroll.companyId !== companyId) {
        throw new BadRequestException(
          'Invoice does not belong to this company',
        );
      }

      if (invoice.status !== InvoiceStatusEnum.CONFIRMED) {
        throw new BadRequestException(
          'Only confirmed invoices can be converted to bills',
        );
      }

      // Check if bill already exists for this invoice
      if (invoice.bill) {
        throw new ConflictException('Bill already exists for this invoice');
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
    }, 'createBill');
  }

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
            invoice: true,
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
  async getBillDetails(id: number, companyId: number): Promise<BillDetailsDto> {
    try {
      const bill = await this.billRepository.findByIdWithInvoice(id, companyId);

      if (!bill) {
        throw new NotFoundException('Bill not found');
      }

      // Build timeline
      const timeline: BillTimelineDto[] = [];

      // Invoice created
      timeline.push({
        event: 'invoice_created',
        timestamp: bill.invoice.createdAt,
        description: 'Invoice was created',
      });

      // Invoice sent
      if (bill.invoice.sentAt) {
        timeline.push({
          event: 'invoice_sent',
          timestamp: bill.invoice.sentAt,
          description: 'Invoice was sent to employee',
        });
      }

      // Invoice reviewed
      if (bill.invoice.reviewedAt) {
        timeline.push({
          event: 'invoice_reviewed',
          timestamp: bill.invoice.reviewedAt,
          description: 'Invoice was reviewed by employee',
        });
      }

      // Invoice confirmed
      if (bill.invoice.confirmedAt) {
        timeline.push({
          event: 'invoice_confirmed',
          timestamp: bill.invoice.confirmedAt,
          description: 'Invoice was confirmed by employee',
        });
      }

      // Bill created
      if (bill.createdAt) {
        timeline.push({
          event: 'bill_created',
          timestamp: bill.createdAt,
          description: 'Bill was added to company bills',
        });
      }

      // Bill paid
      if (bill.paidAt) {
        timeline.push({
          event: 'bill_paid',
          timestamp: bill.paidAt,
          description: 'Bill was paid',
          metadata: {
            transactionHash: bill.transactionHash,
          },
        });
      }

      // Sort timeline by timestamp
      timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      const billDetails: BillDetailsDto = {
        id: bill.id,
        createdAt: bill.createdAt,
        invoiceNumber: bill.invoice.invoiceNumber,
        employeeName: bill.invoice.employee.name,
        employeeEmail: bill.invoice.employee.email,
        groupName: bill.invoice.employee.group.name,
        amount: bill.invoice.total,
        dueDate: bill.invoice.dueDate,
        status: bill.status,
        timeline,
        paidAt: bill.paidAt,
        transactionHash: bill.transactionHash,
        invoice: bill.invoice,
      };

      return billDetails;
    } catch (error) {
      this.logger.error(`Error fetching bill details ${id}:`, error);
      handleError(error, this.logger);
    }
  }

  /**
   * Delete bill
   */
  async deleteBill(id: number, companyId: number): Promise<void> {
    try {
      const bill = await this.billRepository.findOne({ id, companyId });

      if (!bill) {
        throw new NotFoundException('Bill not found');
      }

      if (bill.status === BillStatusEnum.PAID) {
        throw new BadRequestException('Cannot delete paid bills');
      }

      await this.billRepository.delete({ id, companyId });

      this.logger.log(`Deleted bill ${id} from company ${companyId}`);
    } catch (error) {
      this.logger.error(`Error deleting bill ${id}:`, error);
      handleError(error, this.logger);
    }
  }

  /**
   * Pay multiple bills in batch
   */
  async payBills(
    companyId: number,
    dto: PayBillsDto,
  ): Promise<BatchPaymentResultDto> {
    return this.prisma.executeInTransaction(async (tx) => {
      // Fetch all bills to validate
      const bills = await this.billRepository.findMany(
        {
          id: { in: dto.billIds },
          companyId,
        },
        {
          include: {
            invoice: true,
          },
        },
      );

      const foundBillIds = bills.map((bill) => bill.id);
      const notFoundBillIds = dto.billIds.filter(
        (id) => !foundBillIds.includes(id),
      );

      if (notFoundBillIds.length > 0) {
        throw new NotFoundException(
          `Bills not found or not payable: ${notFoundBillIds.join(', ')}`,
        );
      }

      // Calculate total amount
      const totalAmount = bills
        .reduce(
          (sum, bill: BillWithInvoice) => sum + parseFloat(bill.invoice.total),
          0,
        )
        .toFixed(2);

      const paidAt = new Date();
      const successfulBills: number[] = [];
      const failedBills: Array<{ billId: number; error: string }> = [];

      // Update all bills to paid status
      try {
        const updateCount = await this.billRepository.updateMultiple(
          dto.billIds,
          companyId,
          {
            status: BillStatusEnum.PAID,
            paidAt,
            transactionHash: dto.transactionHash,
            metadata: dto.metadata,
          },
          tx,
        );

        if (updateCount === dto.billIds.length) {
          successfulBills.push(...dto.billIds);
        } else {
          // Some bills failed to update
          const updatedBills = await this.billRepository.findMany(
            {
              id: { in: dto.billIds },
              companyId,
            },
            {
              include: {
                invoice: true,
              },
            },
            tx,
          );
          const updatedBillIds = updatedBills
            .filter((bill) => bill.status === BillStatusEnum.PAID)
            .map((bill) => bill.id);

          successfulBills.push(...updatedBillIds);

          const failedBillIds = dto.billIds.filter(
            (id) => !updatedBillIds.includes(id),
          );
          failedBills.push(
            ...failedBillIds.map((id) => ({
              billId: id,
              error: 'Failed to update bill status',
            })),
          );
        }
      } catch (error) {
        this.logger.error('Error updating bills:', error);
        throw new BadRequestException('Failed to process payment');
      }

      const result: BatchPaymentResultDto = {
        successCount: successfulBills.length,
        failureCount: failedBills.length,
        successfulBills,
        failedBills,
        transactionHash: dto.transactionHash,
        totalAmount,
      };

      this.logger.log(
        `Batch payment completed: ${result.successCount} successful, ${result.failureCount} failed. Transaction: ${dto.transactionHash}`,
      );

      return result;
    }, 'payBills');
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

  /**
   * Mark overdue bills (scheduled job)
   */
  async markOverdueBills(date?: Date): Promise<number> {
    try {
      const overdueDate = date || new Date();
      const count = await this.billRepository.markOverdueBills(overdueDate);

      this.logger.log(`Marked ${count} bills as overdue`);

      return count;
    } catch (error) {
      this.logger.error('Error marking overdue bills:', error);
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
   * Update bill status manually
   */
  async updateBillStatus(
    id: number,
    companyId: number,
    status: BillStatusEnum,
  ): Promise<BillModel> {
    return this.prisma.executeInTransaction(async (tx) => {
      const bill = await this.billRepository.findOne({ id, companyId }, tx);

      if (!bill) {
        throw new NotFoundException('Bill not found');
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

      this.logger.log(`Updated bill ${id} status to ${status}`);

      return updatedBill;
    }, 'updateBillStatus');
  }
}
