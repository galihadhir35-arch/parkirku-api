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
import { CreateSlotDto } from './dto/create-slot.dto';
import { PatchSlotDto } from './dto/patch-slot.dto';
import { QuerySlotDto } from './dto/query-slot.dto';
import { SlotsService } from './slots.service';

@ApiTags('slots')
@Controller('slots')
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar slot (pagination, filter, sort)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'] })
  @ApiQuery({ name: 'type', required: false, enum: ['CAR', 'MOTORCYCLE'] })
  @ApiQuery({ name: 'floor', required: false, type: Number })
  @ApiQuery({ name: 'sort', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Daftar slot' })
  @ApiResponse({ status: 400, description: 'Query tidak valid', type: ProblemDetailsDto })
  findAll(@Query() query: QuerySlotDto) {
    return this.slotsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail slot' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Detail slot' })
  @ApiResponse({ status: 404, description: 'Tidak ditemukan', type: ProblemDetailsDto })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.slotsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tambah slot' })
  @ApiBody({ type: CreateSlotDto })
  @ApiResponse({ status: 201, description: 'Slot dibuat' })
  @ApiResponse({ status: 400, description: 'Validasi gagal', type: ProblemDetailsDto })
  @ApiResponse({ status: 409, description: 'Kode duplikat', type: ProblemDetailsDto })
  async create(
    @Body() dto: CreateSlotDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const slot = await this.slotsService.create(dto);
    response.header('Location', `/api/v1/slots/${slot.id}`);

    return slot;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Ubah status/data slot' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: PatchSlotDto })
  @ApiResponse({ status: 200, description: 'Diperbarui' })
  @ApiResponse({ status: 400, description: 'Validasi gagal', type: ProblemDetailsDto })
  @ApiResponse({ status: 404, description: 'Tidak ditemukan', type: ProblemDetailsDto })
  @ApiResponse({ status: 409, description: 'Konflik (mis. OCCUPIED ke MAINTENANCE)', type: ProblemDetailsDto })
  patch(@Param('id', ParseIntPipe) id: number, @Body() dto: PatchSlotDto) {
    return this.slotsService.patch(id, dto);
  }
}
