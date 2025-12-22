import { Test, TestingModule } from '@nestjs/testing';
import { PdfService } from './pdf.service';
import { InvoiceModel } from 'src/database/generated/models';
import puppeteer from 'puppeteer';

// Mock puppeteer
jest.mock('puppeteer');

describe('PdfService', () => {
  let service: PdfService;
  let mockBrowser: any;
  let mockPage: any;

  beforeEach(async () => {
    // Create mock page
    mockPage = {
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
    };

    // Create mock browser
    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
    };

    // Mock puppeteer.launch
    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfService],
    }).compile();

    service = module.get<PdfService>(PdfService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateInvoicePdf', () => {
    it('should generate PDF buffer successfully', async () => {
      const mockInvoice: Partial<InvoiceModel> = {
        invoiceNumber: 'INV-001',
        issueDate: new Date('2024-01-01'),
        dueDate: new Date('2024-01-31'),
        subtotal: '1000.00',
        taxRate: '10',
        taxAmount: '100.00',
        total: '1100.00',
        paymentWalletAddress: '0x1234567890abcdef',
      };

      const result = await service.generateInvoicePdf(mockInvoice as InvoiceModel);

      expect(result).toBeInstanceOf(Buffer);
      expect(puppeteer.launch).toHaveBeenCalledWith({
        headless: true,
        executablePath: undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      expect(mockBrowser.newPage).toHaveBeenCalled();
      expect(mockPage.setContent).toHaveBeenCalled();
      expect(mockPage.pdf).toHaveBeenCalledWith({
        format: 'A4',
        margin: { top: '0.5cm', bottom: '0.5cm', left: '0.5cm', right: '0.5cm' },
        printBackground: true,
      });
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should use PUPPETEER_EXECUTABLE_PATH from environment', async () => {
      const originalPath = process.env.PUPPETEER_EXECUTABLE_PATH;
      process.env.PUPPETEER_EXECUTABLE_PATH = '/usr/bin/chromium-browser';

      const mockInvoice: Partial<InvoiceModel> = {
        invoiceNumber: 'INV-002',
        issueDate: new Date('2024-01-01'),
        dueDate: new Date('2024-01-31'),
        subtotal: '1000.00',
        taxRate: '10',
        taxAmount: '100.00',
        total: '1100.00',
        paymentWalletAddress: '0x1234567890abcdef',
      };

      await service.generateInvoicePdf(mockInvoice as InvoiceModel);

      expect(puppeteer.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          executablePath: '/usr/bin/chromium-browser',
        }),
      );

      // Restore original value
      if (originalPath) {
        process.env.PUPPETEER_EXECUTABLE_PATH = originalPath;
      } else {
        delete process.env.PUPPETEER_EXECUTABLE_PATH;
      }
    });

    it('should throw error when PDF generation fails', async () => {
      const mockInvoice: Partial<InvoiceModel> = {
        invoiceNumber: 'INV-003',
        issueDate: new Date('2024-01-01'),
        dueDate: new Date('2024-01-31'),
        subtotal: '1000.00',
        taxRate: '10',
        taxAmount: '100.00',
        total: '1100.00',
        paymentWalletAddress: '0x1234567890abcdef',
      };

      const error = new Error('PDF generation failed');
      mockPage.pdf.mockRejectedValue(error);

      await expect(
        service.generateInvoicePdf(mockInvoice as InvoiceModel),
      ).rejects.toThrow('PDF generation failed');
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });

  describe('getInvoiceFilename', () => {
    it('should return correct filename format', () => {
      const mockInvoice: Partial<InvoiceModel> = {
        invoiceNumber: 'INV-001',
      };

      const filename = service.getInvoiceFilename(mockInvoice as InvoiceModel);

      expect(filename).toBe('invoice-INV-001.pdf');
    });

    it('should handle invoice numbers with special characters', () => {
      const mockInvoice: Partial<InvoiceModel> = {
        invoiceNumber: 'INV-2024/001',
      };

      const filename = service.getInvoiceFilename(mockInvoice as InvoiceModel);

      expect(filename).toBe('invoice-INV-2024/001.pdf');
    });
  });

  describe('generateInvoiceHtml', () => {
    it('should generate HTML with invoice details', () => {
      const mockInvoice: Partial<InvoiceModel> = {
        invoiceNumber: 'INV-001',
        issueDate: new Date('2024-01-01'),
        dueDate: new Date('2024-01-31'),
        subtotal: '1000.00',
        taxRate: '10',
        taxAmount: '100.00',
        total: '1100.00',
        paymentWalletAddress: '0x1234567890abcdef',
        fromDetails: {
          name: 'John Doe',
          email: 'john@example.com',
          companyName: 'Test Company',
        },
        toDetails: {
          companyName: 'Client Company',
          email: 'client@example.com',
        },
        items: [
          {
            description: 'Test Item',
            quantity: '1',
            unitPrice: '1000.00',
            total: '1000.00',
          },
        ],
        paymentNetwork: { name: 'Ethereum' },
        paymentToken: { symbol: 'ETH' },
      } as any;

      // Access private method through type assertion
      const html = (service as any).generateInvoiceHtml(mockInvoice);

      expect(html).toContain('INV-001');
      expect(html).toContain('John Doe');
      expect(html).toContain('Client Company');
      expect(html).toContain('Test Item');
      expect(html).toContain('1000.00');
      expect(html).toContain('1100.00');
      expect(html).toContain('Ethereum');
      expect(html).toContain('ETH');
      expect(html).toContain('0x1234567890abcdef');
    });

    it('should handle missing optional fields gracefully', () => {
      const mockInvoice: Partial<InvoiceModel> = {
        invoiceNumber: 'INV-002',
        issueDate: new Date('2024-01-01'),
        dueDate: new Date('2024-01-31'),
        subtotal: '500.00',
        taxRate: '0',
        taxAmount: '0.00',
        total: '500.00',
        paymentWalletAddress: '',
      } as any;

      const html = (service as any).generateInvoiceHtml(mockInvoice);

      expect(html).toContain('INV-002');
      expect(html).toContain('N/A'); // Should show N/A for missing fields
      expect(html).toContain('500.00');
    });
  });
});

