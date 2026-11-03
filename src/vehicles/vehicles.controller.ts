import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { etagMatches, formatVehicleEtag } from '../common/utils/etag';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { PatchVehicleDto } from './dto/patch-vehicle.dto';
import { QueryVehicleDto } from './dto/query-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  findAll(@Query() query: QueryVehicleDto) {
    return this.vehiclesService.findAll(query);
  }

  @Post()
  async create(
    @Body() dto: CreateVehicleDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const vehicle = await this.vehiclesService.create(dto);
    response.header('Location', `/api/v1/vehicles/${vehicle.id}`);

    return vehicle;
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { data, version } =
      await this.vehiclesService.findOneWithVersion(id);
    const etag = formatVehicleEtag(version);

    response.header('ETag', etag);

    if (etagMatches(ifNoneMatch, version)) {
      response.status(HttpStatus.NOT_MODIFIED);

      return;
    }

    return data;
  }

  @Put(':id')
  async replace(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVehicleDto,
    @Headers('if-match') ifMatch: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.vehiclesService.replace(id, dto, ifMatch);
    response.header('ETag', formatVehicleEtag(result.version));

    return result.data;
  }

  @Patch(':id')
  async patch(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PatchVehicleDto,
    @Headers('if-match') ifMatch: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.vehiclesService.patch(id, dto, ifMatch);
    response.header('ETag', formatVehicleEtag(result.version));

    return result.data;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Headers('if-match') ifMatch: string | undefined,
  ) {
    await this.vehiclesService.remove(id, ifMatch);
  }
}
