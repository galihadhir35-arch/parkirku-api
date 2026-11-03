import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProblemDetailsDto } from '../common/errors/problem-details.dto';
import { CheckoutTicketDto } from './dto/checkout-ticket.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { QueryTicketDto } from './dto/query-ticket.dto';
import { TicketsService } from './tickets.service';

@ApiTags('tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar tiket (cursor pagination, filter)' })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'COMPLETED'] })
  @ApiQuery({ name: 'vehicleId', required: false, type: Number })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'sort', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Daftar tiket' })
  @ApiResponse({ status: 400, description: 'Query tidak valid', type: ProblemDetailsDto })
  findAll(@Query() query: QueryTicketDto) {
    return this.ticketsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail tiket' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Detail tiket' })
  @ApiResponse({ status: 404, description: 'Tidak ditemukan', type: ProblemDetailsDto })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Check-in kendaraan ke slot' })
  @ApiBody({ type: CreateTicketDto })
  @ApiResponse({ status: 201, description: 'Tiket dibuat' })
  @ApiResponse({ status: 400, description: 'Validasi gagal', type: ProblemDetailsDto })
  @ApiResponse({ status: 404, description: 'Kendaraan/slot tidak ditemukan', type: ProblemDetailsDto })
  @ApiResponse({ status: 409, description: 'Slot tidak tersedia / tipe tidak cocok / kendaraan sudah ACTIVE', type: ProblemDetailsDto })
  async create(
    @Body() dto: CreateTicketDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const ticket = await this.ticketsService.create(dto);
    response.header('Location', `/api/v1/tickets/${ticket.id}`);

    return ticket;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Check-out tiket' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: CheckoutTicketDto })
  @ApiResponse({ status: 200, description: 'Tiket selesai, fee dihitung' })
  @ApiResponse({ status: 400, description: 'Validasi gagal', type: ProblemDetailsDto })
  @ApiResponse({ status: 404, description: 'Tidak ditemukan', type: ProblemDetailsDto })
  @ApiResponse({ status: 409, description: 'Tiket sudah selesai', type: ProblemDetailsDto })
  checkout(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CheckoutTicketDto,
  ) {
    return this.ticketsService.checkout(id, dto);
  }
}
