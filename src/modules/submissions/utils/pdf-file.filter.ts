import { BadRequestException } from '@nestjs/common';

export function pdfFileFilter(
  req: any,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  if (file.mimetype !== 'application/pdf') {
    return callback(
      new BadRequestException(`Archivo inválido: ${file.originalname}. Solo se permiten PDFs`),
      false,
    );
  }
  callback(null, true);
}