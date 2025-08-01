import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  Res,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import {
  TrackEventDto,
  TrackPageViewDto,
  StartSessionDto,
  EndSessionDto,
  TrackTransactionDto,
  GenerateReportDto,
  AnalyticsQueryDto,
} from './analytics.dto';
import { JwtAuthGuard } from '../../common/guards';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('track/event')
  @ApiOperation({ summary: 'Track a custom event' })
  @ApiResponse({ status: 201, description: 'Event tracked successfully' })
  @ApiBody({ type: TrackEventDto })
  async trackEvent(@Body() dto: TrackEventDto, @Req() req: Request) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    await this.analyticsService.trackEvent(dto, ipAddress, userAgent);
    return { message: 'Event tracked successfully' };
  }

  @Post('track/page-view')
  @ApiOperation({ summary: 'Track a page view' })
  @ApiResponse({ status: 201, description: 'Page view tracked successfully' })
  @ApiBody({ type: TrackPageViewDto })
  async trackPageView(@Body() dto: TrackPageViewDto, @Req() req: Request) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    await this.analyticsService.trackPageView(dto, ipAddress, userAgent);
    return { message: 'Page view tracked successfully' };
  }

  @Post('track/transaction')
  @ApiOperation({ summary: 'Track a transaction' })
  @ApiResponse({ status: 201, description: 'Transaction tracked successfully' })
  @ApiBody({ type: TrackTransactionDto })
  async trackTransaction(@Body() dto: TrackTransactionDto) {
    await this.analyticsService.trackTransaction(dto);
    return { message: 'Transaction tracked successfully' };
  }

  @Post('session/start')
  @ApiOperation({ summary: 'Start a user session' })
  @ApiResponse({ status: 201, description: 'Session started successfully' })
  @ApiBody({ type: StartSessionDto })
  async startSession(@Body() dto: StartSessionDto, @Req() req: Request) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const sessionId = await this.analyticsService.startSession(dto, ipAddress);
    return { sessionId, message: 'Session started successfully' };
  }

  @Post('session/end')
  @ApiOperation({ summary: 'End a user session' })
  @ApiResponse({ status: 200, description: 'Session ended successfully' })
  @ApiBody({ type: EndSessionDto })
  async endSession(@Body() dto: EndSessionDto) {
    await this.analyticsService.endSession(dto);
    return { message: 'Session ended successfully' };
  }

  @Get('events')
  @ApiOperation({ summary: 'Get analytics events' })
  @ApiResponse({ status: 200, description: 'Events retrieved successfully' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date filter',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date filter',
  })
  @ApiQuery({
    name: 'userAddress',
    required: false,
    description: 'User address filter',
  })
  @ApiQuery({
    name: 'eventType',
    required: false,
    description: 'Event type filter',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async getEvents(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getEvents(query);
  }

  @Get('sessions/active')
  @ApiOperation({ summary: 'Get active sessions' })
  @ApiResponse({
    status: 200,
    description: 'Active sessions retrieved successfully',
  })
  @ApiQuery({
    name: 'userAddress',
    required: false,
    description: 'User address filter',
  })
  async getActiveSessions(@Query('userAddress') userAddress?: string) {
    return this.analyticsService.getActiveSessions(userAddress);
  }

  @Post('report/generate')
  @ApiOperation({ summary: 'Generate analytics report' })
  @ApiResponse({ status: 200, description: 'Report generated successfully' })
  @ApiBody({ type: GenerateReportDto })
  async generateReport(@Body() dto: GenerateReportDto, @Res() res: Response) {
    const result = await this.analyticsService.generateReport(dto);

    if (Buffer.isBuffer(result)) {
      // File download
      const filename = `analytics-report-${new Date().toISOString().split('T')[0]}.${dto.format || 'json'}`;
      const contentType =
        dto.format === 'csv' ? 'text/csv' : 'application/json';

      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.setHeader('Content-Type', contentType);
      res.send(result);
    } else {
      // JSON response
      res.status(HttpStatus.OK).json(result);
    }
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get analytics dashboard data' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date filter',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date filter',
  })
  async getDashboardData(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const end = endDate ? new Date(endDate) : new Date();

    return this.analyticsService.generateReport({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      format: 'json',
    });
  }

  @Get('health')
  @ApiOperation({ summary: 'Analytics service health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'analytics',
    };
  }
}
