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
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { etagMatches, formatVehicleEtag } from '../common/utils/etag';
import { ProblemDetailsDto } from '../common/errors/problem-details.dto';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { PatchVehicleDto } from './dto/patch-vehicle.dto';
import { QueryVehicleDto } from './dto/query-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';
import { VehicleResponse } from './vehicles.service';

@ApiTags('vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar kendaraan (pagination, filter, sort)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: ['CAR', 'MOTORCYCLE'] })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'sort', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Daftar kendaraan' })
  @ApiResponse({ status: 400, description: 'Query tidak valid', type: ProblemDetailsDto })
  findAll(@Query() query: QueryVehicleDto) {
    return this.vehiclesService.findAll(query);
  }

  @Post()
  @ApiOperation({ summary: 'Daftarkan kendaraan baru' })
  @ApiBody({ type: CreateVehicleDto })
  @ApiResponse({ status: 201, description: 'Kendaraan dibuat' })
  @ApiResponse({ status: 400, description: 'Validasi gagal', type: ProblemDetailsDto })
  @ApiResponse({ status: 409, description: 'Plat duplikat', type: ProblemDetailsDto })
  async create(
    @Body() dto: CreateVehicleDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const vehicle = await this.vehiclesService.create(dto);
    response.header('Location', `/api/v1/vehicles/${vehicle.id}`);

    return vehicle;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail kendaraan' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Detail kendaraan' })
  @ApiResponse({ status: 304, description: 'Tidak berubah (If-None-Match)' })
  @ApiResponse({ status: 404, description: 'Tidak ditemukan', type: ProblemDetailsDto })
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
  @ApiOperation({ summary: 'Ganti seluruh data kendaraan' })
  @ApiParam({ name: 'id', type: Number })
  @ApiHeader({ name: 'If-Match', required: true })
  @ApiBody({ type: UpdateVehicleDto })
  @ApiResponse({ status: 200, description: 'Diperbarui' })
  @ApiResponse({ status: 400, description: 'Validasi gagal', type: ProblemDetailsDto })
  @ApiResponse({ status: 404, description: 'Tidak ditemukan', type: ProblemDetailsDto })
  @ApiResponse({ status: 409, description: 'Konflik', type: ProblemDetailsDto })
  @ApiResponse({ status: 412, description: 'If-Match tidak cocok', type: ProblemDetailsDto })
  @ApiResponse({ status: 428, description: 'If-Match wajib', type: ProblemDetailsDto })
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
  @ApiOperation({ summary: 'Ubah sebagian data kendaraan' })
  @ApiParam({ name: 'id', type: Number })
  @ApiHeader({ name: 'If-Match', required: true })
  @ApiBody({ type: PatchVehicleDto })
  @ApiResponse({ status: 200, description: 'Diperbarui' })
  @ApiResponse({ status: 400, description: 'Validasi gagal', type: ProblemDetailsDto })
  @ApiResponse({ status: 404, description: 'Tidak ditemukan', type: ProblemDetailsDto })
  @ApiResponse({ status: 409, description: 'Konflik', type: ProblemDetailsDto })
  @ApiResponse({ status: 412, description: 'If-Match tidak cocok', type: ProblemDetailsDto })
  @ApiResponse({ status: 428, description: 'If-Match wajib', type: ProblemDetailsDto })
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
  @ApiOperation({ summary: 'Hapus kendaraan' })
  @ApiParam({ name: 'id', type: Number })
  @ApiHeader({ name: 'If-Match', required: true })
  @ApiResponse({ status: 204, description: 'Dihapus' })
  @ApiResponse({ status: 404, description: 'Tidak ditemukan', type: ProblemDetailsDto })
  @ApiResponse({ status: 409, description: 'Masih punya tiket ACTIVE', type: ProblemDetailsDto })
  @ApiResponse({ status: 412, description: 'If-Match tidak cocok', type: ProblemDetailsDto })
  @ApiResponse({ status: 428, description: 'If-Match wajib', type: ProblemDetailsDto })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Headers('if-match') ifMatch: string | undefined,
  ) {
    await this.vehiclesService.remove(id, ifMatch);
  }
}
