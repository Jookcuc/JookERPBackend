import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { join } from 'path';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
  entities: [join(process.cwd(), 'src/**/*.entity{.ts,.js}')],
  migrations: [join(process.cwd(), 'src/migrations/*{.ts,.js}')],
  migrationsTableName: 'typeorm_migrations',
});
