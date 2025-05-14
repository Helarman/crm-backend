import { Injectable, NotFoundException } from '@nestjs/common';
import { Payment } from '@prisma/client'; 
import { PrismaService } from 'src/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(paymentData: CreatePaymentDto): Promise<Payment> {
    return this.prisma.payment.create({
      data: paymentData,
    });
  }

  async findAll(): Promise<Payment[]> {
    return this.prisma.payment.findMany();
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });
    if (!payment) {
      throw new NotFoundException(`Payment with id ${id} not found`);
    }
    return payment;
  }

  async update(id: string, updateData: UpdatePaymentDto): Promise<Payment> {
    const payment = await this.findOne(id); // Проверка существования
    return this.prisma.payment.update({
      where: { id: payment.id },
      data: updateData,
    });
  }
}
