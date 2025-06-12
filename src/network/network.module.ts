import { Module } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { NetworkController } from './network.controller'
import { NetworkService } from './network.service'

@Module({
	controllers: [NetworkController],
	providers: [NetworkService, PrismaService]
})
export class NetworkModule {}
