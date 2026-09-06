import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap.config';

/**
 * El DataSource `resultados` abre `DB_STORAGE` en modo `readonly` (dataset
 * externo del difusor — nunca se escribe desde esta app). better-sqlite3 no
 * puede crear el archivo en modo readonly, así que sin esto el contenedor
 * jamás arrancaría antes de recibir el primer corte. Crear un archivo SQLite
 * vacío (válido) una sola vez si no existe deja `/health/ready` en
 * `waiting_for_first_cut` en vez de tumbar el arranque.
 */
function ensureResultadosDatabaseExists(): void {
  const dbStorage = process.env.DB_STORAGE ?? './data/database.db3';
  const resolved = path.resolve(process.cwd(), dbStorage);
  if (fs.existsSync(resolved)) return;

  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  new Database(resolved).close();
}

async function bootstrap() {
  ensureResultadosDatabaseExists();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);
  app.enableShutdownHooks();

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
