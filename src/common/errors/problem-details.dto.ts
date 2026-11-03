import { ApiProperty } from '@nestjs/swagger';

export class ProblemDetailsDto {
  @ApiProperty({
    description: 'URI yang mengidentifikasi jenis masalah',
    example: 'https://api.parkirku.example/problems/not-found',
  })
  type: string;

  @ApiProperty({ description: 'Judul singkat masalah', example: 'Data tidak ditemukan' })
  title: string;

  @ApiProperty({ description: 'Kode status HTTP', example: 404 })
  status: number;

  @ApiProperty({
    description: 'Penjelasan detail masalah',
    example: 'Kendaraan dengan id 999 tidak ditemukan.',
  })
  detail: string;

  @ApiProperty({ description: 'Path endpoint yang dipanggil', example: '/api/v1/vehicles/999' })
  instance: string;

  @ApiProperty({
    description: 'Daftar error validasi (hanya untuk 400 validation-error)',
    required: false,
    type: [Object],
  })
  errors?: { field: string; message: string }[];
}
