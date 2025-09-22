import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateDictionaryDto } from './dto/create-dictionary.dto';
import { UpdateDictionaryDto } from './dto/update-dictionary.dto';

@Injectable()
export class DictionariesService {
  constructor(private prisma: PrismaService) {}

  async createWriteOffReason(createDto: CreateDictionaryDto) {
    return this.prisma.reasonWriteOff.create({
      data: createDto,
    });
  }

  async findAllWriteOffReasons() {
    return this.prisma.reasonWriteOff.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findWriteOffReasonById(id: number) {
    const reason = await this.prisma.reasonWriteOff.findUnique({
      where: { id },
    });
    if (!reason) {
      throw new NotFoundException(`Причина списания с ID ${id} не найдена`);
    }
    return reason;
  }

  async updateWriteOffReason(id: number, updateDto: UpdateDictionaryDto) {
    try {
      return await this.prisma.reasonWriteOff.update({
        where: { id },
        data: updateDto,
      });
    } catch {
      throw new NotFoundException(`Причина списания с ID ${id} не найдена`);
    }
  }

  async removeWriteOffReason(id: number) {
    try {
      return await this.prisma.reasonWriteOff.delete({
        where: { id },
      });
    } catch {
      throw new NotFoundException(`Причина списания с ID ${id} не найдена`);
    }
  }

  async createReceiptReason(createDto: CreateDictionaryDto) {
    return this.prisma.reasonReceipt.create({
      data: createDto,
    });
  }

  async findAllReceiptReasons() {
    return this.prisma.reasonReceipt.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findReceiptReasonById(id: number) {
    const reason = await this.prisma.reasonReceipt.findUnique({
      where: { id },
    });
    if (!reason) {
      throw new NotFoundException(`Причина прихода с ID ${id} не найдена`);
    }
    return reason;
  }

  async updateReceiptReason(id: number, updateDto: UpdateDictionaryDto) {
    try {
      return await this.prisma.reasonReceipt.update({
        where: { id },
        data: updateDto,
      });
    } catch {
      throw new NotFoundException(`Причина прихода с ID ${id} не найдена`);
    }
  }

  async removeReceiptReason(id: number) {
    try {
      return await this.prisma.reasonReceipt.delete({
        where: { id },
      });
    } catch {
      throw new NotFoundException(`Причина прихода с ID ${id} не найдена`);
    }
  }

  async createMovementReason(createDto: CreateDictionaryDto) {
    return this.prisma.reasonMovement.create({
      data: createDto,
    });
  }

  async findAllMovementReasons() {
    return this.prisma.reasonMovement.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findMovementReasonById(id: number) {
    const reason = await this.prisma.reasonMovement.findUnique({
      where: { id },
    });
    if (!reason) {
      throw new NotFoundException(`Причина перемещения с ID ${id} не найдена`);
    }
    return reason;
  }

  async updateMovementReason(id: number, updateDto: UpdateDictionaryDto) {
    try {
      return await this.prisma.reasonMovement.update({
        where: { id },
        data: updateDto,
      });
    } catch {
      throw new NotFoundException(`Причина перемещения с ID ${id} не найдена`);
    }
  }

  async removeMovementReason(id: number) {
    try {
      return await this.prisma.reasonMovement.delete({
        where: { id },
      });
    } catch {
      throw new NotFoundException(`Причина перемещения с ID ${id} не найдена`);
    }
  }
}