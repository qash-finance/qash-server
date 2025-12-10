import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PayrollRepository, PayrollWithInvoices } from './payroll.repository';
import { EmployeeRepository } from '../employee/repositories/employee.repository';
import {
  CreatePayrollDto,
  UpdatePayrollDto,
  PayrollQueryDto,
  PayrollStatsDto,
} from './payroll.dto';
import {
  PayrollCreateInput,
  PayrollModel,
  PayrollUpdateInput,
} from 'src/database/generated/models';
import { Payroll, PayrollStatusEnum } from 'src/database/generated/client';
import { handleError } from 'src/common/utils/errors';
import { PrismaService } from 'src/database/prisma.service';
import { ErrorCompanyContact, ErrorPayroll } from 'src/common/constants/errors';
import { JsonValue } from '@prisma/client/runtime/client';
import { PaginatedResult } from 'src/database/base.repository';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private readonly payrollRepository: PayrollRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly prisma: PrismaService,
  ) {}

  //#region GET METHODS
  // *************************************************
  // **************** GET METHODS ********************
  // *************************************************
  /**
   * Get all payrolls with pagination
   */
  async getPayrolls(
    companyId: number,
    query: PayrollQueryDto,
  ): Promise<{
    payrolls: PayrollModel[];
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
        employeeId: query.employeeId,
        contractTerm: query.contractTerm,
        search: query.search,
      };

      const result: PaginatedResult<Payroll> =
        await this.payrollRepository.findManyPaginated(
          filters,
          {
            page: query.page || 1,
            limit: query.limit || 10,
            orderBy: {
              createdAt: 'desc',
            },
          },
          {
            include: {
              employee: true,
            },
          },
        );

      return {
        payrolls: result.data,
        pagination: {
          page: result.pagination.page,
          limit: result.pagination.limit,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching payrolls:', error);
      handleError(error, this.logger);
    }
  }

  /**
   * Get payroll details with payment history
   */
  async getPayrollDetails(
    id: number,
    companyId: number,
  ): Promise<PayrollModel> {
    try {
      const payroll = await this.payrollRepository.findById(id, companyId);

      if (!payroll) {
        throw new NotFoundException('Payroll not found');
      }

      return payroll;
    } catch (error) {
      this.logger.error(`Error fetching payroll ${id}:`, error);
      handleError(error, this.logger);
    }
  }

  /**
   * Get payroll statistics
   */
  async getPayrollStats(companyId: number): Promise<PayrollStatsDto> {
    try {
      return await this.payrollRepository.getStats(companyId);
    } catch (error) {
      this.logger.error('Error fetching payroll stats:', error);
      handleError(error, this.logger);
    }
  }

  /**
   * Get payrolls due for payment (for scheduled jobs)
   */
  async getPayrollsDue(date?: Date): Promise<PayrollModel[]> {
    try {
      const dueDate = date || new Date();
      return await this.payrollRepository.findDuePayrolls(dueDate);
    } catch (error) {
      this.logger.error('Error fetching due payrolls:', error);
      handleError(error, this.logger);
    }
  }

  //#endregion GET METHODS

  //#region POST METHODS
  // *************************************************
  // **************** POST METHODS *******************
  // *************************************************
  /**
   * Create new payroll
   */
  async createPayroll(
    companyId: number,
    dto: CreatePayrollDto,
  ): Promise<PayrollModel> {
    return this.prisma.executeInTransaction(async (tx) => {
      // Make sure employee exists and belongs to company
      const employee = await this.employeeRepository.findOne(
        { id: dto.employeeId, companyId },
        tx,
      );

      if (!employee) {
        throw new NotFoundException(ErrorCompanyContact.ContactNotFound);
      }

      // Check if employee already has an active payroll
      const existingPayrolls = await this.payrollRepository.findByEmployeeId(
        dto.employeeId,
        companyId,
        tx,
      );

      const activePayroll = existingPayrolls.find(
        (p) => p.status === PayrollStatusEnum.ACTIVE,
      );

      if (activePayroll) {
        throw new ConflictException(ErrorPayroll.HaveActivePayroll);
      }

      // Calculate contract dates
      const payStartDate = new Date(dto.payStartDate);
      const payEndDate = new Date(dto.payEndDate);
      const joiningDate = new Date(dto.joiningDate);
      payEndDate.setMonth(payEndDate.getMonth() + dto.payrollCycle);

      // Pay start date must be after joining date
      if (payStartDate < joiningDate) {
        throw new BadRequestException(
          ErrorPayroll.PayStartDateBeforeJoiningDate,
        );
      }

      // Pay start date should not be in the past
      if (payStartDate < new Date()) {
        throw new BadRequestException(ErrorPayroll.PayStartDateInThePast);
      }

      // Pay end date should > pay start date
      if (payEndDate <= payStartDate) {
        throw new BadRequestException(
          ErrorPayroll.PayEndDateBeforePayStartDate,
        );
      }

      const payrollData: PayrollCreateInput = {
        company: {
          connect: {
            id: companyId,
          },
        },
        employee: {
          connect: {
            id: dto.employeeId,
          },
        },
        network: dto.network as unknown as JsonValue,
        token: dto.token as unknown as JsonValue,
        amount: dto.amount,
        contractTerm: dto.contractTerm,
        payrollCycle: dto.payrollCycle,
        joiningDate: joiningDate,
        payStartDate: payStartDate,
        payEndDate: payEndDate,
        note: dto.note,
        metadata: dto.metadata,
      };

      const payroll = await this.payrollRepository.create(payrollData, tx);

      return payroll;
    }, 'createPayroll');
  }

  //#endregion POST METHODS

  //#region PUT METHODS
  // *************************************************
  // **************** PUT METHODS ********************
  // *************************************************

  /**
   * Update payroll
   */
  async updatePayroll(
    id: number,
    companyId: number,
    dto: UpdatePayrollDto,
  ): Promise<PayrollModel> {
    return this.prisma.executeInTransaction(async (tx) => {
      const existingPayroll = await this.payrollRepository.findOne(
        { id, companyId },
        tx,
      );

      if (!existingPayroll) {
        throw new NotFoundException(ErrorPayroll.PayrollNotFound);
      }

      let payEndDate = existingPayroll.payEndDate;
      if (dto.payrollCycle) {
        payEndDate = new Date(existingPayroll.payStartDate);
        payEndDate.setMonth(payEndDate.getMonth() + dto.payrollCycle);
      }

      const updateData: PayrollUpdateInput = {
        ...dto,
        network: dto.network as unknown as JsonValue,
        token: dto.token as unknown as JsonValue,
        ...(dto.payrollCycle && { payEndDate }),
        ...(dto.payStartDate && { payStartDate: new Date(dto.payStartDate) }),
      };

      const updatedPayroll = await this.payrollRepository.update(
        { id, companyId },
        updateData,
        tx,
      );

      return updatedPayroll;
    }, 'updatePayroll');
  }
  //#endregion PUT METHODS

  //#region PATCH METHODS
  // *************************************************
  // **************** PATCH METHODS ******************
  // *************************************************
  async pausePayroll(id: number, companyId: number): Promise<PayrollModel> {
    return this.updatePayrollStatus(id, companyId, PayrollStatusEnum.PAUSED);
  }

  /**
   * Resume payroll
   */
  async resumePayroll(id: number, companyId: number): Promise<PayrollModel> {
    return this.updatePayrollStatus(id, companyId, PayrollStatusEnum.ACTIVE);
  }

  /**
   * Delete payroll
   */
  async deletePayroll(id: number, companyId: number): Promise<void> {
    try {
      const payroll: PayrollWithInvoices =
        await this.payrollRepository.findById(id, companyId);

      if (!payroll) {
        throw new NotFoundException('Payroll not found');
      }

      // Only allow deletion if no invoices have been generated
      if (payroll.invoices && payroll.invoices.length > 0) {
        throw new ConflictException(
          'Cannot delete payroll with existing invoices. Please cancel instead.',
        );
      }

      await this.payrollRepository.delete({ id, companyId });

      this.logger.log(`Deleted payroll ${id} from company ${companyId}`);
    } catch (error) {
      this.logger.error(`Error deleting payroll ${id}:`, error);
      handleError(error, this.logger);
    }
  }
  //#endregion PATCH METHODS
  /**
   * Pause payroll
   */

  /**
   * Private helper to update payroll status
   */
  private async updatePayrollStatus(
    id: number,
    companyId: number,
    status: PayrollStatusEnum,
  ): Promise<PayrollModel> {
    return this.prisma.executeInTransaction(async (tx) => {
      const payroll = await this.payrollRepository.findById(id, companyId, tx);

      if (!payroll) {
        throw new NotFoundException('Payroll not found');
      }

      const updatedPayroll = await this.payrollRepository.update(
        { id, companyId },
        { status },
        tx,
      );

      return updatedPayroll;
    }, 'updatePayrollStatus');
  }
}
