import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { BusinessesModule } from './businesses/businesses.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { ProductsModule } from './products/products.module';
import { SalesModule } from './sales/sales.module';
import { EmailModule } from './email/email.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'business-hub-backend/.env'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>('MONGODB_URI');
        if (!uri) {
          throw new Error('MONGODB_URI environment variable is not defined.');
        }
        return {
          uri,
          dbName: configService.get<string>('MONGODB_DB_NAME') || 'business_hub',
        };
      },
    }),
    UsersModule,
    BusinessesModule,
    AuthModule,
    CategoriesModule,
    SuppliersModule,
    ProductsModule,
    SalesModule,
    EmailModule,
    SuperAdminModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
