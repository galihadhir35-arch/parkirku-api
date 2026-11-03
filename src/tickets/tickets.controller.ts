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
import { CheckoutTicketDto } from './dto/checkout-ticket.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { QueryTicketDto } from './dto/query-ticket.dto';
import { TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  findAll(@Query() query: QueryTicketDto) {
    return this.ticketsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.findOne(id);
  }

  @Post()
  create(
    @Body() dto: CreateTicketDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const ticket = this.ticketsService.create(dto);
    response.header('Location', `/api/v1/tickets/${ticket.id}`);

    return ticket;
  }

  @Patch(':id')
  checkout(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CheckoutTicketDto,
  ) {
    return this.ticketsService.checkout(id, dto);
  }
}
