import { Injectable, NotFoundException } from '@nestjs/common';
import { EnumPaymentMethod, EnumPaymentStatus, Payment } from '@prisma/client'; 
import { PrismaService } from 'src/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentMethod, PaymentStatus, UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private toPrismaMethod(method: PaymentMethod): EnumPaymentMethod {
    switch(method) {
      case PaymentMethod.CASH: return EnumPaymentMethod.CASH;
      case PaymentMethod.CARD: return EnumPaymentMethod.CARD;
      case PaymentMethod.ONLINE: return EnumPaymentMethod.ONLINE;
      case PaymentMethod.YANDEX: return EnumPaymentMethod.YANDEX;
      default: throw new Error(`Unknown payment method: ${method}`);
    }
  }

  private toPrismaStatus(status: PaymentStatus): EnumPaymentStatus {
    switch(status) {
      case PaymentStatus.PENDING: return EnumPaymentStatus.PENDING;
      case PaymentStatus.PAID: return EnumPaymentStatus.PAID;
      case PaymentStatus.FAILED: return EnumPaymentStatus.FAILED;
      case PaymentStatus.REFUNDED: return EnumPaymentStatus.REFUNDED;
      default: throw new Error(`Unknown payment status: ${status}`);
    }
  }

  async create(paymentData: CreatePaymentDto): Promise<Payment> {
    return this.prisma.payment.create({
      data: {
        ...paymentData
      },
    });
  }

  async update(id: string, updateData: UpdatePaymentDto): Promise<Payment> {
    const payment = await this.findOne(id);
    
    if (payment.status === EnumPaymentStatus.PAID || payment.status === EnumPaymentStatus.REFUNDED) {
      throw new Error(`Cannot update payment with status ${payment.status}`);
    }

    const data: any = {};
    
    if (updateData.status) {
      data.status = this.toPrismaStatus(updateData.status);
    }
    if (updateData.method) {
      data.method = this.toPrismaMethod(updateData.method);
    }
    if (updateData.amount) {
      data.amount = updateData.amount;
    }
    if (updateData.transactionId) {
      data.transactionId = updateData.transactionId;
    }

    return this.prisma.payment.update({
      where: { id: payment.id },
      data,
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

  async updateAmount(id: string, newAmount: number): Promise<Payment> {
    const payment = await this.findOne(id);
    
    if (payment.status !== 'PENDING') {
      throw new Error('Can only update amount for pending payments');
    }

    return this.prisma.payment.update({
      where: { id },
      data: { amount: newAmount },
    });
  }

  async updateMethod(id: string, newMethod): Promise<Payment> {
    const payment = await this.findOne(id);
    
    if (payment.status !== 'PENDING') {
      throw new Error('Can only update payment method for pending payments');
    }

    return this.prisma.payment.update({
      where: { id },
      data: { method: newMethod },
    });
  }

}
