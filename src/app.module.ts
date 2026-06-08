import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { EmailModule } from './modules/email/email.module';
import { UseKeysModule } from './modules/admin/use-keys.module';
import { JwtAuthGuard } from './common/guard/jwt-auth.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { InventoryModule } from './modules/Inventory/inventory.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { CompanyModule } from './modules/company/company.module';
import { S3Module } from './modules/s3/s3.module';
import { BanksModule } from './modules/banks/banks.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PersonnelModule } from './modules/personnel/personnel.module';
import { CondominiumModule } from './modules/condominium/condominium.module';
import { MarketingLeadsModule } from './modules/marketing-leads/marketing-leads.module';
import { ProjectsModule } from './modules/projects/projects.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          username: configService.get<string>('DB_USER')?.trim(),
          password: configService.get<string>('DB_PASSWORD')?.trim(),
          database: configService.get<string>('DB_NAME'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: configService.get<boolean>(
            'DATABASE_SYNCHRONIZE',
            false,
          ),
          logging: configService.get<string>('NODE_ENV') === 'development',
          ssl: { rejectUnauthorized: false, sslmode: 'require' },
        };
      },
    }),

    AuthModule,
    EmailModule,
    UseKeysModule,
    InventoryModule,
    InvoicesModule,
    CompanyModule,
    S3Module,
    BanksModule,
    TransactionsModule,
    DashboardModule,
    PersonnelModule,
    CondominiumModule,
    MarketingLeadsModule,
    ProjectsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
