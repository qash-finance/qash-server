import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  CreatePaymentLinkDto,
  UpdatePaymentLinkDto,
  PaymentLinkRecordDto,
  PaymentLinkOrderDto,
  DeletePaymentLinksDto,
} from './payment-link.dto';
import { handleError } from '../../common/utils/errors';
import {
  validateAddress,
  validateAmount,
  normalizeAddress,
  sanitizeString,
} from '../../common/utils/validation.util';
import { ErrorPaymentLink } from '../../common/constants/errors';
import {
  PaymentLinkRepository,
  PaymentLinkRecordRepository,
} from './payment-link.repository';
import { randomBytes } from 'crypto';
import { PaymentLinkStatusEnum } from 'src/database/generated/enums';
import { PaymentLink } from 'src/database/generated/client';

@Injectable()
export class PaymentLinkService {
  private readonly logger = new Logger(PaymentLinkService.name);

  constructor(
    private readonly paymentLinkRepository: PaymentLinkRepository,
    private readonly paymentLinkRecordRepository: PaymentLinkRecordRepository,
  ) {}

  // *************************************************
  // **************** GET METHODS ******************
  // *************************************************

  /**
   * Get all payment links for a payee
   */
  async getPaymentLinks(payeeAddress: string) {
    try {
      validateAddress(payeeAddress, 'payeeAddress');
      const normalizedPayeeAddress = normalizeAddress(payeeAddress);

      const links = await this.paymentLinkRepository.findByPayeeWithRecords(
        normalizedPayeeAddress,
      );

      return links;
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  /**
   * Get payment link by code
   */
  async getPaymentLinkByCode(code: string) {
    try {
      if (!code || typeof code !== 'string') {
        throw new BadRequestException(ErrorPaymentLink.InvalidCode);
      }

      const sanitizedCode = sanitizeString(code);
      const link =
        await this.paymentLinkRepository.findByCodeWithRecords(sanitizedCode);

      if (!link) {
        throw new BadRequestException(ErrorPaymentLink.NotFound);
      }

      return link;
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  /**
   * Get payment link by code for payee (with ownership check)
   */
  async getPaymentLinkByCodeForPayee(code: string, payeeAddress: string) {
    try {
      if (!code || typeof code !== 'string') {
        throw new BadRequestException(ErrorPaymentLink.InvalidCode);
      }

      validateAddress(payeeAddress, 'payeeAddress');
      const normalizedPayeeAddress = normalizeAddress(payeeAddress);
      const sanitizedCode = sanitizeString(code);

      const link =
        await this.paymentLinkRepository.findByCodeWithRecords(sanitizedCode);

      if (!link) {
        throw new BadRequestException(ErrorPaymentLink.NotFound);
      }

      // Check ownership
      if (normalizeAddress(link.payee) !== normalizedPayeeAddress) {
        throw new BadRequestException(ErrorPaymentLink.NotOwner);
      }

      return link;
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  // *************************************************
  // **************** POST METHODS ******************
  // *************************************************

  /**
   * Create a new payment link
   */
  async createPaymentLink(dto: CreatePaymentLinkDto) {
    try {
      // Validate inputs
      validateAddress(dto.payee, 'payee');
      validateAmount(dto.amount, 'amount');

      if (!dto.title || dto.title.trim().length === 0) {
        throw new BadRequestException(ErrorPaymentLink.InvalidTitle);
      }

      if (!dto.description || dto.description.trim().length === 0) {
        throw new BadRequestException(ErrorPaymentLink.InvalidDescription);
      }

      // Normalize and sanitize
      const normalizedPayee = normalizeAddress(dto.payee);
      const sanitizedTitle = sanitizeString(dto.title);
      const sanitizedDescription = sanitizeString(dto.description);

      // Generate unique code
      const code = await this.generateUniqueCode();

      const now = new Date();
      const link = await this.paymentLinkRepository.create({
        code,
        title: sanitizedTitle,
        description: sanitizedDescription,
        amount: dto.amount,
        payee: normalizedPayee,
        status: PaymentLinkStatusEnum.ACTIVE,
        acceptedTokens: dto.acceptedTokens
          ? (dto.acceptedTokens as any)
          : undefined,
        acceptedChains: dto.acceptedChains
          ? (dto.acceptedChains as any)
          : undefined,
        createdAt: now,
        updatedAt: now,
      });

      return link;
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  /**
   * Record a payment to a payment link
   */
  async recordPayment(code: string, paymentDto: PaymentLinkRecordDto) {
    try {
      if (!code || typeof code !== 'string') {
        throw new BadRequestException(ErrorPaymentLink.InvalidCode);
      }

      validateAddress(paymentDto.payer, 'payer');
      const sanitizedCode = sanitizeString(code);
      const normalizedPayer = normalizeAddress(paymentDto.payer);

      // Find the payment link
      const link = await this.paymentLinkRepository.findByCode(sanitizedCode);

      if (!link) {
        throw new BadRequestException(ErrorPaymentLink.NotFound);
      }

      // Check if payment link is active
      if (link.status !== PaymentLinkStatusEnum.ACTIVE) {
        throw new BadRequestException(ErrorPaymentLink.AlreadyDeactivated);
      }

      // Create payment record
      const now = new Date();
      const paymentRecord = await this.paymentLinkRecordRepository.create({
        payer: normalizedPayer,
        txid: paymentDto.txid,
        token: paymentDto.token ? (paymentDto.token as any) : undefined,
        chain: paymentDto.chain ? (paymentDto.chain as any) : undefined,
        PaymentLink: { connect: { id: link.id } },
        createdAt: now,
        updatedAt: now,
      });

      return paymentRecord;
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  // *************************************************
  // **************** PUT METHODS ******************
  // *************************************************

  /**
   * Update a payment link
   */
  async updatePaymentLink(
    code: string,
    payeeAddress: string,
    dto: UpdatePaymentLinkDto,
  ) {
    try {
      if (!code || typeof code !== 'string') {
        throw new BadRequestException(ErrorPaymentLink.InvalidCode);
      }

      validateAddress(payeeAddress, 'payeeAddress');
      const normalizedPayeeAddress = normalizeAddress(payeeAddress);
      const sanitizedCode = sanitizeString(code);

      // Find the payment link
      const link = await this.paymentLinkRepository.findByCode(sanitizedCode);

      if (!link) {
        throw new BadRequestException(ErrorPaymentLink.NotFound);
      }

      // Check ownership
      if (normalizeAddress(link.payee) !== normalizedPayeeAddress) {
        throw new BadRequestException(ErrorPaymentLink.NotOwner);
      }

      // Validate and sanitize update data
      const updateData: any = {};

      if (dto.title !== undefined) {
        if (!dto.title || dto.title.trim().length === 0) {
          throw new BadRequestException(ErrorPaymentLink.InvalidTitle);
        }
        updateData.title = sanitizeString(dto.title);
      }

      if (dto.description !== undefined) {
        if (!dto.description || dto.description.trim().length === 0) {
          throw new BadRequestException(ErrorPaymentLink.InvalidDescription);
        }
        updateData.description = sanitizeString(dto.description);
      }

      if (dto.amount !== undefined) {
        validateAmount(dto.amount, 'amount');
        updateData.amount = dto.amount;
      }

      if (dto.status !== undefined) {
        updateData.status = dto.status;
      }

      if (dto.acceptedTokens !== undefined) {
        updateData.acceptedTokens = dto.acceptedTokens as any;
      }

      if (dto.acceptedChains !== undefined) {
        updateData.acceptedChains = dto.acceptedChains as any;
      }

      // Update the payment link
      const updatedLink = await this.paymentLinkRepository.update(
        { code: sanitizedCode },
        updateData,
      );

      return updatedLink;
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  /**
   * Deactivate a payment link
   */
  async deactivatePaymentLink(code: string, payeeAddress: string) {
    try {
      if (!code || typeof code !== 'string') {
        throw new BadRequestException(ErrorPaymentLink.InvalidCode);
      }

      validateAddress(payeeAddress, 'payeeAddress');
      const normalizedPayeeAddress = normalizeAddress(payeeAddress);
      const sanitizedCode = sanitizeString(code);

      // Find the payment link
      const link = await this.paymentLinkRepository.findByCode(sanitizedCode);

      if (!link) {
        throw new BadRequestException(ErrorPaymentLink.NotFound);
      }

      // Check ownership
      if (normalizeAddress(link.payee) !== normalizedPayeeAddress) {
        throw new BadRequestException(ErrorPaymentLink.NotOwner);
      }

      // Check if already deactivated
      if (link.status === PaymentLinkStatusEnum.DEACTIVATED) {
        throw new BadRequestException(ErrorPaymentLink.AlreadyDeactivated);
      }

      // Deactivate the payment link
      const updatedLink = await this.paymentLinkRepository.updateStatus(
        sanitizedCode,
        PaymentLinkStatusEnum.DEACTIVATED,
      );

      return updatedLink;
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  /**
   * Activate a payment link
   */
  async activatePaymentLink(code: string, payeeAddress: string) {
    try {
      if (!code || typeof code !== 'string') {
        throw new BadRequestException(ErrorPaymentLink.InvalidCode);
      }

      validateAddress(payeeAddress, 'payeeAddress');
      const normalizedPayeeAddress = normalizeAddress(payeeAddress);
      const sanitizedCode = sanitizeString(code);

      // Find the payment link
      const link = await this.paymentLinkRepository.findByCode(sanitizedCode);

      if (!link) {
        throw new BadRequestException(ErrorPaymentLink.NotFound);
      }

      // Check ownership
      if (normalizeAddress(link.payee) !== normalizedPayeeAddress) {
        throw new BadRequestException(ErrorPaymentLink.NotOwner);
      }

      // Check if already active
      if (link.status === PaymentLinkStatusEnum.ACTIVE) {
        throw new BadRequestException(ErrorPaymentLink.AlreadyActive);
      }

      // Activate the payment link
      const updatedLink = await this.paymentLinkRepository.updateStatus(
        sanitizedCode,
        PaymentLinkStatusEnum.ACTIVE,
      );

      return updatedLink;
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  /**
   * Update payment record with txid
   */
  async updatePaymentTxid(
    paymentId: number,
    txid: string,
    payeeAddress: string,
  ) {
    try {
      if (!paymentId || paymentId <= 0) {
        throw new BadRequestException(ErrorPaymentLink.PaymentRecordNotFound);
      }

      if (!txid || typeof txid !== 'string') {
        throw new BadRequestException('Invalid transaction ID');
      }

      validateAddress(payeeAddress, 'payeeAddress');
      const normalizedPayeeAddress = normalizeAddress(payeeAddress);

      // Find the payment record
      const paymentRecord =
        await this.paymentLinkRecordRepository.findById(paymentId);

      if (!paymentRecord) {
        throw new BadRequestException(ErrorPaymentLink.PaymentRecordNotFound);
      }

      // Verify ownership through payment link
      const link = await this.paymentLinkRepository.findOne({
        id: paymentRecord.paymentLinkId,
      });

      if (!link) {
        throw new BadRequestException(ErrorPaymentLink.NotFound);
      }

      if (normalizeAddress(link.payee) !== normalizedPayeeAddress) {
        throw new BadRequestException(ErrorPaymentLink.NotOwner);
      }

      // Update txid
      const updatedPayment = await this.paymentLinkRecordRepository.updateTxid(
        paymentId,
        txid,
      );

      return updatedPayment;
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  // *************************************************
  // **************** PATCH METHODS *****************
  // *************************************************

  /**
   * Update payment link order
   */
  async updatePaymentLinkOrder(
    dto: PaymentLinkOrderDto,
    payeeAddress: string,
  ): Promise<PaymentLink[]> {
    try {
      // Validate user address
      validateAddress(payeeAddress, 'payeeAddress');
      const normalizedPayeeAddress = normalizeAddress(payeeAddress);

      // Validate that all link IDs are provided
      if (!dto.linkIds || dto.linkIds.length === 0) {
        throw new BadRequestException('Link IDs array cannot be empty');
      }

      // Check if all links belong to the user
      const userLinks = await this.paymentLinkRepository.findByPayee(
        normalizedPayeeAddress,
      );
      const userLinkIds = userLinks.map((link) => link.id);

      const invalidIds = dto.linkIds.filter((id) => !userLinkIds.includes(id));
      if (invalidIds.length > 0) {
        throw new BadRequestException(
          `Invalid link IDs: ${invalidIds.join(', ')}`,
        );
      }

      // Check if all user links are included
      const missingIds = userLinkIds.filter((id) => !dto.linkIds.includes(id));
      if (missingIds.length > 0) {
        throw new BadRequestException(
          `Missing link IDs: ${missingIds.join(', ')}`,
        );
      }

      return this.paymentLinkRepository.updateLinkOrder(
        normalizedPayeeAddress,
        dto.linkIds,
      );
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  // *************************************************
  // **************** DELETE METHODS ****************
  // *************************************************

  /**
   * Delete payment links (supports both single and multiple)
   */
  async deletePaymentLinks(dto: DeletePaymentLinksDto, payeeAddress: string) {
    try {
      validateAddress(payeeAddress, 'payeeAddress');
      const normalizedPayeeAddress = normalizeAddress(payeeAddress);

      // Validate that all codes are provided
      if (!dto.codes || dto.codes.length === 0) {
        throw new BadRequestException('Codes array cannot be empty');
      }

      // Sanitize all codes
      const sanitizedCodes = dto.codes.map((code) => sanitizeString(code));

      // Find all payment links for ownership validation
      const links = await this.paymentLinkRepository.findByCodes(
        sanitizedCodes,
        normalizedPayeeAddress,
      );

      // Check if all links belong to the user
      const foundCodes = links.map((link) => link.code);
      const invalidCodes = sanitizedCodes.filter(
        (code) => !foundCodes.includes(code),
      );

      if (invalidCodes.length > 0) {
        throw new BadRequestException(
          `Invalid or unauthorized codes: ${invalidCodes.join(', ')}`,
        );
      }

      // Check if all requested codes were found
      const missingCodes = sanitizedCodes.filter(
        (code) => !foundCodes.includes(code),
      );
      if (missingCodes.length > 0) {
        throw new BadRequestException(
          `Payment links not found: ${missingCodes.join(', ')}`,
        );
      }

      // Delete all payment links
      const result =
        await this.paymentLinkRepository.deleteByCodes(sanitizedCodes);

      return {
        message: `${result.count} payment link(s) deleted successfully`,
        deletedCount: result.count,
        deletedCodes: sanitizedCodes,
      };
    } catch (error) {
      handleError(error, this.logger);
    }
  }

  // *************************************************
  // **************** HELPER METHODS ****************
  // *************************************************

  /**
   * Generate a unique code for payment link
   */
  private async generateUniqueCode(): Promise<string> {
    let code: string;
    let exists = true;
    let attempts = 0;
    const maxAttempts = 10;

    while (exists && attempts < maxAttempts) {
      // Generate a random 8-character alphanumeric code
      code = randomBytes(4).toString('hex').toUpperCase();

      // Check if code already exists
      const existing = await this.paymentLinkRepository.findByCode(code);
      exists = !!existing;
      attempts++;
    }

    if (exists) {
      throw new BadRequestException('Failed to generate unique code');
    }

    return code!;
  }
}
