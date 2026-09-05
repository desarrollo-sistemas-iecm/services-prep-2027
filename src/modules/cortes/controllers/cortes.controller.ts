import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { diskStorage } from 'multer';
import type { Request, Response } from 'express';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { UploadCorteDto } from '../dto/upload-corte.dto';
import { JwtDifusorGuard } from '../guards/jwt-difusor.guard';
import { CortesService } from '../services/cortes.service';
import { DifusorJwtPayload } from '../guards/jwt-difusor.guard';

const MAX_UPLOAD_MB = Number(process.env.CORTES_MAX_UPLOAD_MB ?? 100);
const UPLOAD_RATE_LIMIT = Number(process.env.CORTES_UPLOAD_RATE_LIMIT ?? 5);
const STAGING_ROOT = path.resolve(process.cwd(), 'data', 'staging');
const API_PREFIX = process.env.API_PREFIX ?? 'api/v1';

@ApiTags('cortes')
@Controller('cortes')
export class CortesController {
  constructor(private readonly cortesService: CortesService) {}

  @Post()
  @UseGuards(JwtDifusorGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @Throttle({ default: { limit: UPLOAD_RATE_LIMIT, ttl: 60000 } })
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'database', maxCount: 1 }], {
      limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
      storage: diskStorage({
        destination: (req, _file, callback) => {
          const cutId = (req.body as { cutId?: string })?.cutId;
          if (!cutId || !/^[a-zA-Z0-9_-]{1,64}$/.test(cutId)) {
            callback(new BadRequestException('cutId inválido o ausente'), '');
            return;
          }
          const dir = path.join(STAGING_ROOT, cutId);
          fs.mkdirSync(dir, { recursive: true });
          callback(null, dir);
        },
        filename: (_req, _file, callback) => {
          callback(null, `${crypto.randomUUID()}.db3`);
        },
      }),
    }),
  )
  @ApiOperation({
    summary: 'Publica un nuevo corte SQLite',
    description:
      'Requiere Authorization: Bearer <token-del-difusor>. Valida manifest, firma HMAC e integridad del archivo subido.',
  })
  async upload(
    @Body() dto: UploadCorteDto,
    @UploadedFiles() files: { database?: Express.Multer.File[] },
    @Req() req: Request & { difusor?: DifusorJwtPayload },
    @Res() res: Response,
  ) {
    const databaseFile = files?.database?.[0];
    if (!databaseFile) {
      throw new BadRequestException(
        'El campo "database" (archivo) es obligatorio',
      );
    }

    const issuedBySubject = req.difusor?.sub ?? null;
    const outcome = await this.cortesService.upload(
      dto,
      databaseFile.path,
      issuedBySubject,
    );

    res.setHeader('Location', `/${API_PREFIX}/cortes/${outcome.cutId}/estado`);
    return res
      .status(outcome.reused ? HttpStatus.OK : HttpStatus.ACCEPTED)
      .json({
        ok: true,
        msg: outcome.reused
          ? 'El corte ya había sido recibido'
          : 'Corte recibido, en validación',
        data: { cutId: outcome.cutId, status: outcome.status },
      });
  }

  @Get(':cutId/estado')
  @ApiOperation({ summary: 'Consulta el estado de un corte' })
  async status(@Param('cutId') cutId: string) {
    const release = await this.cortesService.getStatus(cutId);
    if (!release) {
      throw new NotFoundException(`No existe un corte con cutId ${cutId}`);
    }

    return {
      ok: true,
      msg: 'La información se obtuvo correctamente.',
      data: {
        cutId: release.cutId,
        version: release.version,
        activationAt: release.activationAt,
        status: release.status,
        failureReason: release.failureReason,
      },
    };
  }

  @Get('activo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtiene el corte actualmente activo' })
  async active() {
    const release = await this.cortesService.getActive();

    return {
      ok: true,
      msg: 'La información se obtuvo correctamente.',
      data: release
        ? {
            cutId: release.cutId,
            version: release.version,
            activationAt: release.activationAt,
            status: release.status,
          }
        : null,
    };
  }
}
