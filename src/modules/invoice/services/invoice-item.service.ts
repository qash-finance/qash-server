import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InvoiceItemRepository } from '../repositories/invoice-item.repository';
import { InvoiceRepository } from '../invoice.repository';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateInvoiceItemDto,
  UpdateInvoiceItemDto,
  ReorderInvoiceItemsDto,
} from '../invoice.dto';

@Injectable()
export class InvoiceItemService {
  private readonly logger = new Logger(InvoiceItemService.name);

  constructor(
    private readonly itemRepository: InvoiceItemRepository,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create invoice item
   */
  async createItem(
    invoiceUUID: string,
    companyId: number,
    dto: CreateInvoiceItemDto,
    tx?: any,
  ): Promise<any> {
    const run = tx
      ? async (cb: any) => cb(tx)
      : (cb: any) => this.prisma.executeInTransaction(cb, 'createInvoiceItem');

    return run(async (trx: any) => {
      // Verify invoice exists and belongs to company
      const invoice = await this.invoiceRepository.findByUUID(invoiceUUID, trx);

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      // Verify company access (check if invoice belongs to company)
      if (invoice.invoiceType === 'EMPLOYEE') {
        if (invoice.payroll?.companyId !== companyId) {
          throw new NotFoundException('Invoice not found');
        }
      } else if (invoice.invoiceType === 'B2B') {
        if (
          invoice.fromCompanyId !== companyId &&
          invoice.toCompanyId !== companyId
        ) {
          throw new NotFoundException('Invoice not found');
        }
      }

      // Calculate item total if not provided
      const quantity = parseFloat(dto.quantity);
      const unitPrice = parseFloat(dto.unitPrice);
      const discount = parseFloat(dto.discount || '0');
      const taxRate = parseFloat(dto.taxRate || '0');

      const subtotal = quantity * unitPrice;
      const afterDiscount = subtotal - discount;
      const tax = (afterDiscount * taxRate) / 100;
      const total = afterDiscount + tax;

      // Get current max order
      const existingItems = await this.itemRepository.findByInvoiceUuid(
        invoiceUUID,
        trx,
      );
      const maxOrder =
        existingItems.length > 0
          ? Math.max(...existingItems.map((item) => item.order))
          : -1;

      const item = await this.itemRepository.create(
        {
          invoiceUuid: invoiceUUID,
          description: dto.description,
          quantity: dto.quantity,
          unitPrice: dto.unitPrice,
          unit: dto.unit,
          taxRate: dto.taxRate || '0.00',
          discount: dto.discount || '0.00',
          total: total.toFixed(2),
          order: dto.order ?? maxOrder + 1,
          metadata: dto.metadata,
        },
        trx,
      );

      // Recalculate invoice totals
      await this.recalculateInvoiceTotals(invoiceUUID, trx);

      this.logger.log(
        `Created invoice item ${item.id} for invoice ${invoiceUUID}`,
      );

      return item;
    });
  }

  /**
   * Create multiple invoice items
   */
  async createItems(
    invoiceUUID: string,
    companyId: number,
    items: CreateInvoiceItemDto[],
    tx?: any,
  ): Promise<any[]> {
    const run = tx
      ? async (cb: any) => cb(tx)
      : (cb: any) => this.prisma.executeInTransaction(cb, 'createInvoiceItems');

    return run(async (trx: any) => {
      // Verify invoice exists and belongs to company
      const invoice = await this.invoiceRepository.findByUUID(invoiceUUID, trx);

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      // Verify company access
      if (invoice.invoiceType === 'EMPLOYEE') {
        if (invoice.payroll?.companyId !== companyId) {
          throw new NotFoundException('Invoice not found');
        }
      } else if (invoice.invoiceType === 'B2B') {
        if (
          invoice.fromCompanyId !== companyId &&
          invoice.toCompanyId !== companyId
        ) {
          throw new NotFoundException('Invoice not found');
        }
      }

      // Calculate totals for each item
      const itemsToCreate = items.map((dto, index) => {
        const quantity = parseFloat(dto.quantity);
        const unitPrice = parseFloat(dto.unitPrice);
        const discount = parseFloat(dto.discount || '0');
        const taxRate = parseFloat(dto.taxRate || '0');

        const subtotal = quantity * unitPrice;
        const afterDiscount = subtotal - discount;
        const tax = (afterDiscount * taxRate) / 100;
        const total = afterDiscount + tax;

        return {
          invoiceUuid: invoiceUUID,
          description: dto.description,
          quantity: dto.quantity,
          unitPrice: dto.unitPrice,
          unit: dto.unit,
          taxRate: dto.taxRate || '0.00',
          discount: dto.discount || '0.00',
          total: total.toFixed(2),
          order: dto.order ?? index,
          metadata: dto.metadata,
        };
      });

      await this.itemRepository.createMany(itemsToCreate, trx);

      // Recalculate invoice totals
      await this.recalculateInvoiceTotals(invoiceUUID, trx);

      this.logger.log(
        `Created ${itemsToCreate.length} items for invoice ${invoiceUUID}`,
      );

      return this.itemRepository.findByInvoiceUuid(invoiceUUID, trx);
    });
  }

  /**
   * Get all items for an invoice
   */
  async getItemsByInvoiceUuid(
    invoiceUUID: string,
    companyId: number,
  ): Promise<any[]> {
    // Verify invoice exists and belongs to company
    const invoice = await this.invoiceRepository.findByUUID(invoiceUUID);

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Verify company access
    if (invoice.invoiceType === 'EMPLOYEE') {
      if (invoice.payroll?.companyId !== companyId) {
        throw new NotFoundException('Invoice not found');
      }
    } else if (invoice.invoiceType === 'B2B') {
      if (
        invoice.fromCompanyId !== companyId &&
        invoice.toCompanyId !== companyId
      ) {
        throw new NotFoundException('Invoice not found');
      }
    }

    return this.itemRepository.findByInvoiceUuid(invoiceUUID);
  }

  /**
   * Update invoice item
   */
  async updateItem(
    id: number,
    invoiceUUID: string,
    companyId: number,
    dto: UpdateInvoiceItemDto,
    tx?: any,
  ): Promise<any> {
    const run = tx
      ? async (cb: any) => cb(tx)
      : (cb: any) => this.prisma.executeInTransaction(cb, 'updateInvoiceItem');

    return run(async (trx: any) => {
      // Verify invoice exists and belongs to company
      const invoice = await this.invoiceRepository.findByUUID(invoiceUUID, trx);

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      // Verify company access
      if (invoice.invoiceType === 'EMPLOYEE') {
        if (invoice.payroll?.companyId !== companyId) {
          throw new NotFoundException('Invoice not found');
        }
      } else if (invoice.invoiceType === 'B2B') {
        if (
          invoice.fromCompanyId !== companyId &&
          invoice.toCompanyId !== companyId
        ) {
          throw new NotFoundException('Invoice not found');
        }
      }

      // Verify item exists and belongs to invoice
      const item = await this.itemRepository.findById(id, trx);

      if (!item || item.invoice.uuid !== invoiceUUID) {
        throw new NotFoundException('Invoice item not found');
      }

      // Recalculate total if quantity, price, discount, or tax changed
      const updateData: any = { ...dto };

      if (
        dto.quantity ||
        dto.unitPrice ||
        dto.discount !== undefined ||
        dto.taxRate !== undefined
      ) {
        const quantity = parseFloat(dto.quantity || item.quantity);
        const unitPrice = parseFloat(dto.unitPrice || item.unitPrice);
        const discount = parseFloat(dto.discount ?? item.discount);
        const taxRate = parseFloat(dto.taxRate ?? item.taxRate);

        const subtotal = quantity * unitPrice;
        const afterDiscount = subtotal - discount;
        const tax = (afterDiscount * taxRate) / 100;
        const total = afterDiscount + tax;

        updateData.total = total.toFixed(2);
      }

      const updated = await this.itemRepository.update(id, updateData, trx);

      // Recalculate invoice totals
      await this.recalculateInvoiceTotals(invoiceUUID, trx);

      this.logger.log(`Updated invoice item ${id}`);

      return updated;
    });
  }

  /**
   * Delete invoice item
   */
  async deleteItem(
    id: number,
    invoiceUUID: string,
    companyId: number,
    tx?: any,
  ): Promise<void> {
    const run = tx
      ? async (cb: any) => cb(tx)
      : (cb: any) => this.prisma.executeInTransaction(cb, 'deleteInvoiceItem');

    return run(async (trx: any) => {
      // Verify invoice exists and belongs to company
      const invoice = await this.invoiceRepository.findByUUID(invoiceUUID, trx);

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      // Verify company access
      if (invoice.invoiceType === 'EMPLOYEE') {
        if (invoice.payroll?.companyId !== companyId) {
          throw new NotFoundException('Invoice not found');
        }
      } else if (invoice.invoiceType === 'B2B') {
        if (
          invoice.fromCompanyId !== companyId &&
          invoice.toCompanyId !== companyId
        ) {
          throw new NotFoundException('Invoice not found');
        }
      }

      // Verify item exists and belongs to invoice
      const item = await this.itemRepository.findById(id, trx);

      if (!item || item.invoice.uuid !== invoiceUUID) {
        throw new NotFoundException('Invoice item not found');
      }

      await this.itemRepository.delete(id, trx);

      // Recalculate invoice totals
      await this.recalculateInvoiceTotals(invoiceUUID, trx);

      this.logger.log(`Deleted invoice item ${id}`);
    });
  }

  /**
   * Recalculate invoice totals from items
   */
  async recalculateInvoiceTotals(
    invoiceUUID: string,
    tx?: any,
  ): Promise<{
    subtotal: string;
    taxAmount: string;
    total: string;
  }> {
    const totals = await this.itemRepository.calculateTotals(invoiceUUID, tx);

    // Update invoice with new totals
    const client = tx || this.prisma;
    await client.invoice.update({
      where: { uuid: invoiceUUID },
      data: {
        subtotal: totals.subtotal,
        taxAmount: totals.totalTax,
        total: totals.total,
        // Note: discount is not stored at invoice level, only at item level
      },
    });

    return {
      subtotal: totals.subtotal,
      taxAmount: totals.totalTax,
      total: totals.total,
    };
  }
}
