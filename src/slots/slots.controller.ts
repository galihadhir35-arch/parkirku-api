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
import { CreateSlotDto } from './dto/create-slot.dto';
import { PatchSlotDto } from './dto/patch-slot.dto';
import { QuerySlotDto } from './dto/query-slot.dto';
import { SlotsService } from './slots.service';

@Controller('slots')
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  @Get()
  findAll(@Query() query: QuerySlotDto) {
    return this.slotsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.slotsService.findOne(id);
  }

  @Post()
  create(
    @Body() dto: CreateSlotDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const slot = this.slotsService.create(dto);
    response.header('Location', `/api/v1/slots/${slot.id}`);

    return slot;
  }

  @Patch(':id')
  patch(@Param('id', ParseIntPipe) id: number, @Body() dto: PatchSlotDto) {
    return this.slotsService.patch(id, dto);
  }
}
