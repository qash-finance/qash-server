import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpStatus,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { InvoiceService } from './services/invoice.service';
import { PdfService } from './services/pdf.service';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceQueryDto,
  InvoiceStatsDto,
} from './invoice.dto';
import { InvoiceModel } from 'src/database/generated/models';
import { CompanyAuth } from '../auth/decorators/company-auth.decorator';
import {
  CurrentUser,
  UserWithCompany,
} from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtPayload } from 'src/common/interfaces/jwt-payload';

@ApiTags('Invoice')
@ApiBearerAuth()
@Controller('api/v1/invoice')
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly pdfService: PdfService,
  ) {}

  //#region GET METHODS
  // *************************************************
  // **************** GET METHODS ********************
  // *************************************************
  @Get()
  @CompanyAuth()
  @ApiOperation({ summary: 'Get all invoices for company with pagination' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invoices retrieved successfully',
  })
  async getInvoices(
    @CurrentUser('withCompany') user: UserWithCompany,
    @Query() query: InvoiceQueryDto,
  ): Promise<{
    invoices: InvoiceModel[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    return this.invoiceService.getInvoices(user.company.id, query);
  }

  @Get('employee')
  @ApiOperation({ summary: 'Get invoices for current employee' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Employee invoices retrieved successfully',
  })
  async getEmployeeInvoices(
    @CurrentUser() user: JwtPayload,
  ): Promise<InvoiceModel[]> {
    return this.invoiceService.getEmployeeInvoices(user.email);
  }

  @Get('stats')
  @CompanyAuth()
  @ApiOperation({ summary: 'Get invoice statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invoice statistics retrieved successfully',
    type: InvoiceStatsDto,
  })
  async getInvoiceStats(
    @CurrentUser('withCompany') user: UserWithCompany,
  ): Promise<InvoiceStatsDto> {
    return this.invoiceService.getInvoiceStats(user.company.id);
  }

  @Get('number/:invoiceNumber')
  @Public()
  @ApiOperation({
    summary: 'Get invoice by invoice number (public access for employees)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invoice retrieved successfully',
  })
  @ApiParam({
    name: 'invoiceNumber',
    type: 'string',
    description: 'Invoice Number',
  })
  async getInvoiceByNumber(
    @Param('invoiceNumber') invoiceNumber: string,
  ): Promise<InvoiceModel> {
    return this.invoiceService.getInvoiceByNumber(invoiceNumber);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice details' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invoice details retrieved successfully',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Invoice ID' })
  async getInvoiceDetails(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<InvoiceModel> {
    return this.invoiceService.getInvoiceDetails(id);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download invoice as PDF' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'PDF generated successfully',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Invoice ID' })
  async downloadInvoicePdf(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const invoice = await this.invoiceService.getInvoiceDetails(id);
      const pdfBuffer = await this.pdfService.generateInvoicePdf(invoice);
      const filename = this.pdfService.getInvoiceFilename(invoice);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length,
      });

      res.send(pdfBuffer);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to generate PDF',
        error: error.message,
      });
    }
  }
  //#region GET METHODS

  //#region POST METHODS
  // *************************************************
  // **************** POST METHODS *******************
  // *************************************************
  @Post()
  @CompanyAuth()
  @ApiOperation({ summary: 'Create a new invoice manually' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Invoice created successfully',
  })
  async createInvoice(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @CurrentUser('withCompany') user: UserWithCompany,
  ): Promise<InvoiceModel> {
    return this.invoiceService.createInvoice(createInvoiceDto, user.company.id);
  }

  @Post('generate/:payrollId')
  @CompanyAuth()
  @ApiOperation({ summary: 'Generate invoice from payroll' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Invoice generated successfully',
  })
  @ApiParam({ name: 'payrollId', type: 'number', description: 'Payroll ID' })
  async generateInvoice(
    @CurrentUser('withCompany') user: UserWithCompany,
    @Param('payrollId', ParseIntPipe) payrollId: number,
  ): Promise<InvoiceModel> {
    return this.invoiceService.generateInvoiceFromPayroll(
      payrollId,
      user.company.id,
    );
  }
  //#endregion POST METHODS

  //#region PUT METHODS
  // *************************************************
  // **************** PUT METHODS ********************
  // *************************************************
  @Put(':id')
  @ApiOperation({
    summary: 'Update invoice (employee can update their details)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invoice updated successfully',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Invoice ID' })
  async updateInvoice(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
  ): Promise<InvoiceModel> {
    return this.invoiceService.updateInvoice(id, updateInvoiceDto, user.email);
  }
  //#region PUT METHODS

  //#region PATCH METHODS
  // *************************************************
  // **************** PATCH METHODS ******************
  // *************************************************
  @Patch(':id/send')
  @CompanyAuth()
  @ApiOperation({ summary: 'Send invoice to employee' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invoice sent successfully',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Invoice ID' })
  async sendInvoice(
    @CurrentUser('withCompany') user: UserWithCompany,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<InvoiceModel> {
    return this.invoiceService.sendInvoice(id, user.company.id);
  }

  @Patch(':id/review')
  @ApiOperation({ summary: 'Employee reviews invoice' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invoice reviewed successfully',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Invoice ID' })
  async reviewInvoice(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<InvoiceModel> {
    return this.invoiceService.reviewInvoice(id, user.email);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Employee confirms invoice' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invoice confirmed successfully',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Invoice ID' })
  async confirmInvoice(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<InvoiceModel> {
    return this.invoiceService.confirmInvoice(id, user.email);
  }

  @Patch(':id/cancel')
  @CompanyAuth()
  @ApiOperation({ summary: 'Cancel invoice' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invoice cancelled successfully',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Invoice ID' })
  async cancelInvoice(
    @CurrentUser('withCompany') user: UserWithCompany,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<InvoiceModel> {
    return this.invoiceService.cancelInvoice(id, user.company.id);
  }

  //#region PATCH METHODS
}
