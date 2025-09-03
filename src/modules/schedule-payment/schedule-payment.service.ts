import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateSchedulePaymentDto,
  UpdateSchedulePaymentDto,
  SchedulePaymentQueryDto,
} from './schedule-payment.dto';
import {
  SchedulePaymentStatusEnum,
  SchedulePaymentFrequencyEnum,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SchedulePaymentRepository } from './schedule-payment.repository';
import { handleError } from '../../common/utils/errors';
import {
  validateAddress,
  validateAmount,
  validateMessage,
  validateDifferentAddresses,
  normalizeAddress,
  sanitizeString,
} from '../../common/utils/validation.util';
import { ErrorSchedulePayment } from 'src/common/constants/errors';

@Injectable()
export class SchedulePaymentService {
  private readonly logger = new Logger(SchedulePaymentService.name);

  constructor(
    private readonly schedulePaymentRepository: SchedulePaymentRepository,
    private readonly prisma: PrismaService, // Keep for complex operations not yet in repository
  ) {}

  // *************************************************
  // **************** CREATE METHODS ****************
  // *************************************************

  async createSchedulePayment(dto: CreateSchedulePaymentDto) {
    try {
      // Validate all inputs
      validateAddress(dto.payer, 'payer');
      validateAddress(dto.payee, 'payee');
      validateAmount(dto.amount, 'amount');

      if (dto.message) {
        validateMessage(dto.message, 'message');
      }

      // Normalize addresses
      const normalizedPayer = normalizeAddress(dto.payer);
      const normalizedPayee = normalizeAddress(dto.payee);

      // Check if payer and payee are different
      validateDifferentAddresses(
        normalizedPayer,
        normalizedPayee,
        'payer',
        'payee',
      );

      // Sanitize message if provided
      const sanitizedMessage = dto.message ? sanitizeString(dto.message) : null;

      // Validate dates
      const nextExecutionDate = new Date(dto.nextExecutionDate);
      const endDate = dto.endDate ? new Date(dto.endDate) : null;

      if (nextExecutionDate <= new Date()) {
        throw new BadRequestException(
          ErrorSchedulePayment.InvalidNextExecutionDate,
        );
      }

      if (endDate && endDate < nextExecutionDate) {
        throw new BadRequestException(ErrorSchedulePayment.InvalidEndDate);
      }

      // Validate max executions
      if (dto.maxExecutions !== undefined && dto.maxExecutions < 1) {
        throw new BadRequestException(
          ErrorSchedulePayment.InvalidMaxExecutions,
        );
      }

      if (!dto.transactionIds || dto.transactionIds.length === 0) {
        throw new BadRequestException(
          ErrorSchedulePayment.InvalidTransactionIds,
        );
      }

      const tokens = dto.tokens.map((token) => ({ ...token }));

      return await this.schedulePaymentRepository.createWithTransactions(
        {
          payer: normalizedPayer,
          payee: normalizedPayee,
          amount: dto.amount,
          tokens: tokens,
          message: sanitizedMessage,
          frequency: dto.frequency,
          endDate: endDate,
          nextExecutionDate: nextExecutionDate,
          maxExecutions: dto.maxExecutions || null,
          executionCount: 0,
        },
        dto.transactionIds,
      );
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  // *************************************************
  // **************** GET METHODS ******************
  // *************************************************

  async getSchedulePayments(
    userAddress: string,
    query?: SchedulePaymentQueryDto,
  ) {
    try {
      validateAddress(userAddress, 'userAddress');
      const normalizedUserAddress = normalizeAddress(userAddress);

      const where: any = {
        OR: [
          { payer: normalizedUserAddress },
          { payee: normalizedUserAddress },
        ],
      };

      // Apply filters
      if (query?.status) {
        where.status = query.status;
      }

      if (query?.payer) {
        validateAddress(query.payer, 'payer');
        where.payer = normalizeAddress(query.payer);
      }

      if (query?.payee) {
        validateAddress(query.payee, 'payee');
        where.payee = normalizeAddress(query.payee);
      }

      return await this.schedulePaymentRepository.findByUser(
        normalizedUserAddress,
        {
          status: query?.status,
          payer: query?.payer ? normalizeAddress(query.payer) : undefined,
          payee: query?.payee ? normalizeAddress(query.payee) : undefined,
          includeTransactions: true,
        },
      );
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async getSchedulePaymentById(id: number, userAddress: string) {
    try {
      if (!id || id <= 0) {
        throw new BadRequestException(ErrorSchedulePayment.InvalidId);
      }

      validateAddress(userAddress, 'userAddress');
      const normalizedUserAddress = normalizeAddress(userAddress);

      const schedulePayment =
        await this.schedulePaymentRepository.findByIdAndUserWithTransactions(
          id,
          normalizedUserAddress,
        );

      if (!schedulePayment) {
        throw new NotFoundException(ErrorSchedulePayment.NotFound);
      }

      return schedulePayment;
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async getActiveSchedulePayments() {
    try {
      const now = new Date();

      return await this.schedulePaymentRepository.findActiveReadyForExecution();
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  // *************************************************
  // **************** UPDATE METHODS ****************
  // *************************************************

  async updateSchedulePayment(
    id: number,
    userAddress: string,
    dto: UpdateSchedulePaymentDto,
  ) {
    try {
      if (!id || id <= 0) {
        throw new BadRequestException(ErrorSchedulePayment.InvalidId);
      }

      validateAddress(userAddress, 'userAddress');
      const normalizedUserAddress = normalizeAddress(userAddress);

      const schedulePayment =
        await this.schedulePaymentRepository.findByIdAndPayer(
          id,
          normalizedUserAddress,
        );

      if (!schedulePayment) {
        throw new NotFoundException(ErrorSchedulePayment.NotFound);
      }

      // Validate dates if provided
      if (dto.nextExecutionDate) {
        const nextExecutionDate = new Date(dto.nextExecutionDate);
        if (nextExecutionDate <= new Date()) {
          throw new BadRequestException(
            ErrorSchedulePayment.InvalidNextExecutionDate,
          );
        }
      }

      if (dto.endDate) {
        const endDate = new Date(dto.endDate);
        const nextExecution = dto.nextExecutionDate
          ? new Date(dto.nextExecutionDate)
          : schedulePayment.nextExecutionDate;

        if (nextExecution && endDate < nextExecution) {
          throw new BadRequestException(ErrorSchedulePayment.InvalidEndDate);
        }
      }

      // Validate max executions
      if (dto.maxExecutions !== undefined && dto.maxExecutions < 1) {
        throw new BadRequestException(
          ErrorSchedulePayment.InvalidMaxExecutions,
        );
      }

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (dto.status !== undefined) updateData.status = dto.status;
      if (dto.frequency !== undefined) updateData.frequency = dto.frequency;
      if (dto.endDate !== undefined)
        updateData.endDate = dto.endDate ? new Date(dto.endDate) : null;
      if (dto.nextExecutionDate !== undefined)
        updateData.nextExecutionDate = new Date(dto.nextExecutionDate);
      if (dto.maxExecutions !== undefined)
        updateData.maxExecutions = dto.maxExecutions;

      return await this.schedulePaymentRepository.update({ id }, updateData);
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async pauseSchedulePayment(id: number, userAddress: string) {
    try {
      return await this.updateSchedulePayment(id, userAddress, {
        status: SchedulePaymentStatusEnum.PAUSED,
      });
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async resumeSchedulePayment(id: number, userAddress: string) {
    try {
      return await this.updateSchedulePayment(id, userAddress, {
        status: SchedulePaymentStatusEnum.ACTIVE,
      });
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async cancelSchedulePayment(id: number, userAddress: string) {
    try {
      return await this.updateSchedulePayment(id, userAddress, {
        status: SchedulePaymentStatusEnum.CANCELLED,
      });
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async updatePayment(transactionId: number) {
    try {
      const schedulePayment =
        await this.schedulePaymentRepository.findByTransactionId(transactionId);

      if (!schedulePayment) {
        throw new NotFoundException(ErrorSchedulePayment.NotFound);
      }

      const newExecutionCount = schedulePayment.executionCount + 1;

      if (newExecutionCount === schedulePayment.maxExecutions) {
        return await this.schedulePaymentRepository.updateExecution(
          schedulePayment.id,
          newExecutionCount,
          null,
          SchedulePaymentStatusEnum.COMPLETED,
        );
      }

      const nextExecutionDate = this.calculateNextExecutionDate(
        schedulePayment.nextExecutionDate!,
        schedulePayment.frequency!,
      );

      return await this.schedulePaymentRepository.updateExecution(
        schedulePayment.id,
        newExecutionCount,
        nextExecutionDate,
      );
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  // *************************************************
  // **************** EXECUTION METHODS **************
  // *************************************************

  async markExecuted(schedulePaymentId: number) {
    try {
      const schedulePayment = await this.prisma.schedulePayment.findUnique({
        where: { id: schedulePaymentId },
      });

      if (!schedulePayment) {
        throw new NotFoundException(ErrorSchedulePayment.NotFound);
      }

      const newExecutionCount = schedulePayment.executionCount + 1;
      const nextExecutionDate = this.calculateNextExecutionDate(
        schedulePayment.nextExecutionDate!,
        schedulePayment.frequency!,
      );

      let status = schedulePayment.status;
      let finalNextExecutionDate = nextExecutionDate;

      // Check if we should complete the schedule
      const shouldComplete = this.shouldCompleteSchedule(
        schedulePayment,
        newExecutionCount,
        nextExecutionDate,
      );

      if (shouldComplete) {
        status = SchedulePaymentStatusEnum.COMPLETED;
        finalNextExecutionDate = null;
      }

      return await this.schedulePaymentRepository.updateExecution(
        schedulePaymentId,
        newExecutionCount,
        finalNextExecutionDate,
        status,
      );
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  async markFailed(schedulePaymentId: number) {
    try {
      return await this.schedulePaymentRepository.markFailed(schedulePaymentId);
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  // *************************************************
  // **************** DELETE METHODS ****************
  // *************************************************

  async deleteSchedulePayment(id: number, userAddress: string) {
    try {
      if (!id || id <= 0) {
        throw new BadRequestException(ErrorSchedulePayment.InvalidId);
      }

      validateAddress(userAddress, 'userAddress');
      const normalizedUserAddress = normalizeAddress(userAddress);

      const schedulePayment =
        await this.schedulePaymentRepository.findByIdAndPayer(
          id,
          normalizedUserAddress,
        );

      if (!schedulePayment) {
        throw new NotFoundException(ErrorSchedulePayment.NotFound);
      }

      // Only allow deletion if not active or has no executions yet
      if (
        schedulePayment.status === SchedulePaymentStatusEnum.ACTIVE &&
        schedulePayment.executionCount > 0
      ) {
        throw new BadRequestException(
          ErrorSchedulePayment.CannotDeleteActiveWithExecutions,
        );
      }

      await this.schedulePaymentRepository.delete({ id });

      return { message: 'Schedule payment deleted successfully' };
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  // *************************************************
  // **************** HELPER METHODS ****************
  // *************************************************

  private calculateNextExecutionDate(
    currentDate: Date,
    frequency: SchedulePaymentFrequencyEnum,
  ): Date {
    const nextDate = new Date(currentDate);

    switch (frequency) {
      case SchedulePaymentFrequencyEnum.DAILY:
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case SchedulePaymentFrequencyEnum.WEEKLY:
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case SchedulePaymentFrequencyEnum.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      default:
        throw new BadRequestException(ErrorSchedulePayment.InvalidFrequency);
    }

    return nextDate;
  }

  private shouldCompleteSchedule(
    schedulePayment: any,
    newExecutionCount: number,
    nextExecutionDate: Date,
  ): boolean {
    // Check max executions
    if (
      schedulePayment.maxExecutions &&
      newExecutionCount >= schedulePayment.maxExecutions
    ) {
      return true;
    }

    // Check end date
    if (
      schedulePayment.endDate &&
      nextExecutionDate > schedulePayment.endDate
    ) {
      return true;
    }

    return false;
  }
}
