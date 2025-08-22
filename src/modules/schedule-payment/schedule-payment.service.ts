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
import { SchedulePaymentStatus, SchedulePaymentFrequency } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { handleError } from '../../common/utils/errors';
import {
  validateAddress,
  validateAmount,
  validateMessage,
  validateDifferentAddresses,
  normalizeAddress,
  sanitizeString,
} from '../../common/utils/validation.util';

@Injectable()
export class SchedulePaymentService {
  private readonly logger = new Logger(SchedulePaymentService.name);

  constructor(private readonly prisma: PrismaService) {}

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
        throw new BadRequestException('Next execution date must be in the future');
      }

      if (endDate && endDate <= nextExecutionDate) {
        throw new BadRequestException('End date must be after next execution date');
      }

      // Validate max executions
      if (dto.maxExecutions !== undefined && dto.maxExecutions < 1) {
        throw new BadRequestException('Max executions must be at least 1');
      }
      
      if(!dto.transactionIds || dto.transactionIds.length === 0) {
        throw new BadRequestException('Transaction IDs are required');
      }

      const tokens = dto.tokens.map((token) => ({ ...token }));

      return await this.prisma.schedulePayment.create({
        data: {
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
          transactions: {
            connect: dto.transactionIds.map((id) => ({ id: id })),
          },
        },
      });
    } catch (error) {
      this.logger.error('Error creating schedule payment:', error);
      handleError(error, this.logger);
    }
  }

  // *************************************************
  // **************** GET METHODS ******************
  // *************************************************

  async getSchedulePayments(userAddress: string, query?: SchedulePaymentQueryDto) {
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

      return await this.prisma.schedulePayment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          transactions: {
            orderBy: { id: 'desc' },
          },
        },
      });
    } catch (error) {
      this.logger.error('Error getting schedule payments:', error);
      handleError(error, this.logger);
    }
  }

  async getSchedulePaymentById(id: number, userAddress: string) {
    try {
      if (!id || id <= 0) {
        throw new BadRequestException('Invalid schedule payment ID');
      }

      validateAddress(userAddress, 'userAddress');
      const normalizedUserAddress = normalizeAddress(userAddress);

      const schedulePayment = await this.prisma.schedulePayment.findFirst({
        where: {
          id,
          OR: [
            { payer: normalizedUserAddress },
            { payee: normalizedUserAddress },
          ],
        },
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!schedulePayment) {
        throw new NotFoundException('Schedule payment not found');
      }

      return schedulePayment;
    } catch (error) {
      this.logger.error('Error getting schedule payment by id:', error);
      handleError(error, this.logger);
    }
  }

  async getActiveSchedulePayments() {
    try {
      const now = new Date();
      
      return await this.prisma.schedulePayment.findMany({
        where: {
          status: SchedulePaymentStatus.ACTIVE,
          nextExecutionDate: {
            lte: now,
          },
          OR: [
            { endDate: null },
            { endDate: { gte: now } },
          ],
        },
        orderBy: { nextExecutionDate: 'asc' },
      });
    } catch (error) {
      this.logger.error('Error getting active schedule payments:', error);
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
        throw new BadRequestException('Invalid schedule payment ID');
      }

      validateAddress(userAddress, 'userAddress');
      const normalizedUserAddress = normalizeAddress(userAddress);

      const schedulePayment = await this.prisma.schedulePayment.findFirst({
        where: {
          id,
          payer: normalizedUserAddress, // Only payer can update
        },
      });

      if (!schedulePayment) {
        throw new NotFoundException('Schedule payment not found');
      }

      // Validate dates if provided
      if (dto.nextExecutionDate) {
        const nextExecutionDate = new Date(dto.nextExecutionDate);
        if (nextExecutionDate <= new Date()) {
          throw new BadRequestException('Next execution date must be in the future');
        }
      }

      if (dto.endDate) {
        const endDate = new Date(dto.endDate);
        const nextExecution = dto.nextExecutionDate 
          ? new Date(dto.nextExecutionDate)
          : schedulePayment.nextExecutionDate;
        
        if (nextExecution && endDate <= nextExecution) {
          throw new BadRequestException('End date must be after next execution date');
        }
      }

      // Validate max executions
      if (dto.maxExecutions !== undefined && dto.maxExecutions < 1) {
        throw new BadRequestException('Max executions must be at least 1');
      }

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (dto.status !== undefined) updateData.status = dto.status;
      if (dto.frequency !== undefined) updateData.frequency = dto.frequency;
      if (dto.endDate !== undefined) updateData.endDate = dto.endDate ? new Date(dto.endDate) : null;
      if (dto.nextExecutionDate !== undefined) updateData.nextExecutionDate = new Date(dto.nextExecutionDate);
      if (dto.maxExecutions !== undefined) updateData.maxExecutions = dto.maxExecutions;

      return await this.prisma.schedulePayment.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      this.logger.error('Error updating schedule payment:', error);
      handleError(error, this.logger);
    }
  }

  async pauseSchedulePayment(id: number, userAddress: string) {
    try {
      return await this.updateSchedulePayment(id, userAddress, {
        status: SchedulePaymentStatus.PAUSED,
      });
    } catch (error) {
      this.logger.error('Error pausing schedule payment:', error);
      handleError(error, this.logger);
    }
  }

  async resumeSchedulePayment(id: number, userAddress: string) {
    try {
      return await this.updateSchedulePayment(id, userAddress, {
        status: SchedulePaymentStatus.ACTIVE,
      });
    } catch (error) {
      this.logger.error('Error resuming schedule payment:', error);
      handleError(error, this.logger);
    }
  }

  async cancelSchedulePayment(id: number, userAddress: string) {
    try {
      return await this.updateSchedulePayment(id, userAddress, {
        status: SchedulePaymentStatus.CANCELLED,
      });
    } catch (error) {
      this.logger.error('Error cancelling schedule payment:', error);
      handleError(error, this.logger);
    }
  }

  async updatePayment(transactionId: number) {
    try {
      const schedulePayment = await this.prisma.schedulePayment.findFirst({
        where: {
          transactions: {
            some: {
              id: transactionId,
            },
          },
        }
      });

      if (!schedulePayment) {
        throw new NotFoundException('Schedule payment not found');
      }

      const newExecutionCount = schedulePayment.executionCount + 1;

      if(newExecutionCount === schedulePayment.maxExecutions ) {
        return await this.prisma.schedulePayment.update({
          where: { id: schedulePayment.id },
          data: {
            updatedAt: new Date(),
            nextExecutionDate: null,
            executionCount: newExecutionCount,
            status: SchedulePaymentStatus.COMPLETED,
          },
        });
      }

      const nextExecutionDate = this.calculateNextExecutionDate(
        schedulePayment.nextExecutionDate!,
        schedulePayment.frequency!,
      );

      return await this.prisma.schedulePayment.update({
        where: { id: schedulePayment.id },
        data: {
          updatedAt: new Date(),
          executionCount: newExecutionCount,
          nextExecutionDate: nextExecutionDate,
        },
      });
    } catch (error) {
      this.logger.error('Error recalling payment:', error);
      handleError(error, this.logger);
    }
  }

  // *************************************************
  // **************** EXECUTION METHODS **************
  // *************************************************

  async markExecuted(schedulePaymentId: number, transactionId: number) {
    try {
      const schedulePayment = await this.prisma.schedulePayment.findUnique({
        where: { id: schedulePaymentId },
      });

      if (!schedulePayment) {
        throw new NotFoundException('Schedule payment not found');
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
        status = SchedulePaymentStatus.COMPLETED;
        finalNextExecutionDate = null;
      }

      return await this.prisma.schedulePayment.update({
        where: { id: schedulePaymentId },
        data: {
          executionCount: newExecutionCount,
          nextExecutionDate: finalNextExecutionDate,
          status,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Error marking schedule payment as executed:', error);
      handleError(error, this.logger);
    }
  }

  async markFailed(schedulePaymentId: number, reason?: string) {
    try {
      return await this.prisma.schedulePayment.update({
        where: { id: schedulePaymentId },
        data: {
          status: SchedulePaymentStatus.FAILED,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Error marking schedule payment as failed:', error);
      handleError(error, this.logger);
    }
  }

  // *************************************************
  // **************** DELETE METHODS ****************
  // *************************************************

  async deleteSchedulePayment(id: number, userAddress: string) {
    try {
      if (!id || id <= 0) {
        throw new BadRequestException('Invalid schedule payment ID');
      }

      validateAddress(userAddress, 'userAddress');
      const normalizedUserAddress = normalizeAddress(userAddress);

      const schedulePayment = await this.prisma.schedulePayment.findFirst({
        where: {
          id,
          payer: normalizedUserAddress, // Only payer can delete
        },
      });

      if (!schedulePayment) {
        throw new NotFoundException('Schedule payment not found');
      }

      // Only allow deletion if not active or has no executions yet
      if (schedulePayment.status === SchedulePaymentStatus.ACTIVE && schedulePayment.executionCount > 0) {
        throw new BadRequestException('Cannot delete active schedule payment with executions. Cancel it instead.');
      }

      await this.prisma.schedulePayment.delete({
        where: { id },
      });

      return { message: 'Schedule payment deleted successfully' };
    } catch (error) {
      this.logger.error('Error deleting schedule payment:', error);
      handleError(error, this.logger);
    }
  }

  // *************************************************
  // **************** HELPER METHODS ****************
  // *************************************************

  private calculateNextExecutionDate(currentDate: Date, frequency: SchedulePaymentFrequency): Date {
    const nextDate = new Date(currentDate);

    switch (frequency) {
      case SchedulePaymentFrequency.DAILY:
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case SchedulePaymentFrequency.WEEKLY:
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case SchedulePaymentFrequency.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      default:
        throw new BadRequestException('Invalid frequency');
    }

    return nextDate;
  }

  private shouldCompleteSchedule(
    schedulePayment: any,
    newExecutionCount: number,
    nextExecutionDate: Date,
  ): boolean {
    // Check max executions
    if (schedulePayment.maxExecutions && newExecutionCount >= schedulePayment.maxExecutions) {
      return true;
    }

    // Check end date
    if (schedulePayment.endDate && nextExecutionDate > schedulePayment.endDate) {
      return true;
    }

    return false;
  }
}
