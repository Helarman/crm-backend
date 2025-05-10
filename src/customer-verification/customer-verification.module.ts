import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { CustomerVerificationController } from './customer-verification.controller';
import { CustomerVerificationService } from './customer-verification.service';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot(), 
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { 
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRATION', '1h') 
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [CustomerVerificationController],
  providers: [CustomerVerificationService, PrismaService],
})
export class CustomerVerificationModule {}