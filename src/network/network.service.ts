import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateNetworkDto } from './dto/create-network.dto';
import { UpdateNetworkDto } from './dto/update-network.dto';
import { NetworkBalanceOperationType, UpdateNetworkBalanceDto } from './dto/update-network-balance.dto';
import { ToggleNetworkBlockDto } from './dto/toggle-network-block.dto';
import { CreateNetworkTariffDto } from './dto/create-network-tariff.dto';
import { UpdateNetworkTariffDto } from './dto/update-network-tariff.dto';
import { GetNetworkTransactionsDto } from './dto/get-network-transactions.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class NetworkService {
  constructor(private prisma: PrismaService) {}

   private includeDetails = {
    owner: true,
    tenant: true,
    restaurants: true,
    currentTariff: true, // Добавляем текущий тариф
    _count: {
      select: {
        restaurants: true,
        transactions: true
      }
    }
  };

  async getAll() {
    return this.prisma.network.findMany({
      include: this.includeDetails
    });
  }

  async getById(id: string) {
    const network = await this.prisma.network.findUnique({
      where: { id },
      include: this.includeDetails
    });

    if (!network) throw new NotFoundException('Сеть не найдена');
    return network;
  }

  async create(dto: CreateNetworkDto) {
    const owner = await this.prisma.user.findUnique({
      where: { id: dto.ownerId }
    });
    if (!owner) throw new NotFoundException('Владелец не найден');

    if (dto.tenantId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: dto.tenantId }
      });
      if (!tenant) throw new NotFoundException('Тенант не найден');
    }

    if (dto.currentTariffId) {
      const tariff = await this.prisma.networkTariff.findUnique({
        where: { id: dto.currentTariffId }
      });
      if (!tariff) throw new NotFoundException('Тариф не найден');
    }

    return this.prisma.network.create({
      data: {
        name: dto.name,
        description: dto.description,
        primaryColor: dto.primaryColor,
        logo: dto.logo,
        owner: { connect: { id: dto.ownerId } },
        tenant: dto.tenantId ? { connect: { id: dto.tenantId } } : undefined,
        currentTariff: dto.currentTariffId ? { connect: { id: dto.currentTariffId } } : undefined
      },
      include: this.includeDetails
    });
  }

  async update(id: string, dto: UpdateNetworkDto) {
    await this.getById(id);
    
    // Если обновляется тариф, проверяем его существование
    if (dto.currentTariffId) {
      const tariff = await this.prisma.networkTariff.findUnique({
        where: { id: dto.currentTariffId }
      });
      if (!tariff) throw new NotFoundException('Тариф не найден');
    }

    return this.prisma.network.update({
      where: { id },
      data: dto,
      include: this.includeDetails
    });
  }





  async getRestaurants(networkId: string) {
    const network = await this.prisma.network.findUnique({
      where: { id: networkId },
      include: { restaurants: true }
    });

    if (!network) throw new NotFoundException('Сеть не найдена');
    return network.restaurants;
  }

  async delete(id: string) {
    await this.getById(id);
    return this.prisma.network.delete({
      where: { id }
    });
  }

  async getNetworksByUser(userId: string) {
  // First check if user exists
  const user = await this.prisma.user.findUnique({
    where: { id: userId }
  });
  if (!user) throw new NotFoundException('Пользователь не найден');

  return this.prisma.network.findMany({
    where: { ownerId: userId
    },
    include: this.includeDetails
  });
}

async updateBalance(id: string, dto: UpdateNetworkBalanceDto) {
    const network = await this.getById(id);
    
    if (dto.operation === NetworkBalanceOperationType.WITHDRAWAL) {
      if (network.balance < dto.amount) {
        throw new BadRequestException('Недостаточно средств на балансе сети');
      }
    }

    const newBalance = dto.operation === NetworkBalanceOperationType.DEPOSIT
      ? network.balance + dto.amount
      : network.balance - dto.amount;

    const updatedNetwork = await this.prisma.network.update({
      where: { id },
      data: { balance: newBalance },
      include: this.includeDetails
    });

    await this.prisma.networkTransaction.create({
      data: {
        networkId: id,
        type: dto.operation,
        amount: dto.amount,
        description: dto.reason || `${dto.operation === NetworkBalanceOperationType.DEPOSIT ? 'Пополнение' : 'Списание'} баланса`,
        balanceAfter: newBalance,
        createdById: dto.performedById,
        referenceType: 'BALANCE_OPERATION',
        referenceId: id
      }
    });

    return updatedNetwork;
  }

  async toggleBlock(id: string, dto: ToggleNetworkBlockDto) {
    const network = await this.getById(id);
    
    if (network.isBlocked === dto.isBlocked) {
      throw new BadRequestException(
        `Сеть уже ${dto.isBlocked ? 'заблокирована' : 'разблокирована'}`
      );
    }

    return this.prisma.network.update({
      where: { id },
      data: { 
        isBlocked: dto.isBlocked 
      },
      include: this.includeDetails
    });
  }

   async getAllTariffs() {
    return this.prisma.networkTariff.findMany({
      include: {
        _count: {
          select: {
            networks: true // Количество сетей, использующих этот тариф
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getTariffById(id: string) {
    const tariff = await this.prisma.networkTariff.findUnique({
      where: { id },
      include: {
        networks: {
          include: {
            owner: true,
            _count: {
              select: { restaurants: true }
            }
          }
        },
        _count: {
          select: {
            networks: true
          }
        }
      }
    });

    if (!tariff) {
      throw new NotFoundException('Тариф не найден');
    }

    return tariff;
  }

  async createTariff(dto: CreateNetworkTariffDto) {
    return this.prisma.networkTariff.create({
      data: {
        name: dto.name,
        price: dto.price,
        period: dto.period,
        isActive: dto.isActive
      }
    });
  }
async getNetworkTransactions(
  networkId: string, 
  dto: GetNetworkTransactionsDto
) {
  // Проверяем существование сети
  const network = await this.prisma.network.findUnique({
    where: { id: networkId }
  });
  
  if (!network) {
    throw new NotFoundException('Сеть не найдена');
  }

  // Строим условие where
  const where: Prisma.NetworkTransactionWhereInput = {
    networkId: networkId
  };

  // Фильтр по типам
  if (dto.types && dto.types.length > 0) {
    where.type = { in: dto.types };
  }

  // Фильтр по сумме
  if (dto.minAmount !== undefined || dto.maxAmount !== undefined) {
    where.amount = {};
    if (dto.minAmount !== undefined) {
      where.amount.gte = dto.minAmount;
    }
    if (dto.maxAmount !== undefined) {
      where.amount.lte = dto.maxAmount;
    }
  }

  // Фильтр по балансу после операции
  if (dto.minBalanceAfter !== undefined || dto.maxBalanceAfter !== undefined) {
    where.balanceAfter = {};
    if (dto.minBalanceAfter !== undefined) {
      where.balanceAfter.gte = dto.minBalanceAfter;
    }
    if (dto.maxBalanceAfter !== undefined) {
      where.balanceAfter.lte = dto.maxBalanceAfter;
    }
  }

  // Фильтр по дате
  if (dto.startDate || dto.endDate || dto.lastNDays) {
    where.createdAt = {};
    
    if (dto.lastNDays) {
      const nDaysAgo = new Date();
      nDaysAgo.setDate(nDaysAgo.getDate() - dto.lastNDays);
      where.createdAt.gte = nDaysAgo;
    } else {
      if (dto.startDate) {
        where.createdAt.gte = new Date(dto.startDate);
      }
      
      if (dto.endDate) {
        // Добавляем конец дня
        const endDate = new Date(dto.endDate);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }
  }

  // Фильтр по создателю
  if (dto.createdById) {
    where.createdById = dto.createdById;
  }

  // Фильтр по референсу
  if (dto.referenceType) {
    where.referenceType = dto.referenceType;
  }
  
  if (dto.referenceId) {
    where.referenceId = dto.referenceId;
  }

  // Поиск по описанию
  if (dto.search) {
    where.description = {
      contains: dto.search,
      mode: 'insensitive' as Prisma.QueryMode
    };
  }

  // Вычисляем offset для пагинации
  const skip = (dto.page - 1) * dto.limit;

  // Настройки include
  const include: Prisma.NetworkTransactionInclude = {};
  if (dto.includeCreator) {
    include.createdBy = {
      select: {
        id: true,
        email: true,
        name: true,
      }
    };
  }

  // Если нужна группировка
  if (dto.groupBy) {
    return this.getGroupedTransactions(where, dto);
  }

  // Получаем транзакции с сортировкой
  const [transactions, total] = await Promise.all([
    this.prisma.networkTransaction.findMany({
      where,
      include,
      orderBy: {
        [dto.sortBy]: dto.sortOrder
      },
    }),
    this.prisma.networkTransaction.count({ where })
  ]);

  // Подготавливаем ответ
  const response: any = {
    transactions,
    meta: {
      total,
      page: dto.page,
      limit: dto.limit,
      totalPages: Math.ceil(total / dto.limit),
      hasNext: dto.page < Math.ceil(total / dto.limit),
      hasPrev: dto.page > 1
    }
  };

  // Добавляем агрегированные данные если нужно
  if (dto.includeSummary) {
    const [depositsSummary, withdrawalsSummary, allSummary] = await Promise.all([
      this.prisma.networkTransaction.aggregate({
        where: { ...where, type: 'DEPOSIT' },
        _sum: { amount: true },
        _avg: { amount: true },
        _count: { id: true },
        _min: { createdAt: true },
        _max: { createdAt: true }
      }),
      this.prisma.networkTransaction.aggregate({
        where: { ...where, type: 'WITHDRAWAL' },
        _sum: { amount: true },
        _avg: { amount: true },
        _count: { id: true },
        _min: { createdAt: true },
        _max: { createdAt: true }
      }),
      this.prisma.networkTransaction.aggregate({
        where,
        _sum: { amount: true },
        _avg: { amount: true },
        _count: { id: true },
        _min: { createdAt: true },
        _max: { createdAt: true }
      })
    ]);

    response.summary = {
      totalDeposits: depositsSummary._sum.amount || 0,
      totalWithdrawals: withdrawalsSummary._sum.amount || 0,
      netChange: (depositsSummary._sum.amount || 0) - (withdrawalsSummary._sum.amount || 0),
      averageAmount: allSummary._avg.amount || 0,
      totalTransactions: allSummary._count.id || 0,
      depositCount: depositsSummary._count.id || 0,
      withdrawalCount: withdrawalsSummary._count.id || 0,
      depositAverage: depositsSummary._avg.amount || 0,
      withdrawalAverage: withdrawalsSummary._avg.amount || 0,
      dateRange: {
        from: allSummary._min.createdAt,
        to: allSummary._max.createdAt
      }
    };
  }

  return response;
}

private async getGroupedTransactions(
  where: Prisma.NetworkTransactionWhereInput,
  dto: GetNetworkTransactionsDto
) {
  // Сначала получаем все транзакции для группировки
  const transactions = await this.prisma.networkTransaction.findMany({
    where,
    include: {
      createdBy: {
        select: {
          id: true,
          email: true,
          name: true,
        }
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  // Группируем транзакции
  const grouped = transactions.reduce((acc, transaction) => {
    const date = new Date(transaction.createdAt);
    let key: string;
    
    switch (dto.groupBy) {
      case 'day':
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'year':
        key = String(date.getFullYear());
        break;
      default:
        key = date.toISOString().split('T')[0];
    }

    if (!acc[key]) {
      acc[key] = {
        date: key,
        totalDeposits: 0,
        totalWithdrawals: 0,
        count: 0,
        transactions: []
      };
    }

    acc[key].count++;
    if (transaction.type === 'DEPOSIT') {
      acc[key].totalDeposits += transaction.amount;
    } else {
      acc[key].totalWithdrawals += transaction.amount;
    }
    
    if (!dto.includeSummary) {
      acc[key].transactions.push(transaction);
    }

    return acc;
  }, {} as Record<string, any>);

  // Преобразуем в массив и вычисляем netChange
  const result = Object.values(grouped).map((group: any) => ({
    ...group,
    netChange: group.totalDeposits - group.totalWithdrawals,
    transactions: dto.includeSummary ? undefined : group.transactions
  }));



  // Применяем пагинацию
  const startIndex = (dto.page - 1) * dto.limit;
  const endIndex = startIndex + dto.limit;
  const paginatedResult = result.slice(startIndex, endIndex);

  return {
    groupedTransactions: paginatedResult,
    meta: {
      total: result.length,
      page: dto.page,
      limit: dto.limit,
      totalPages: Math.ceil(result.length / dto.limit),
      hasNext: endIndex < result.length,
      hasPrev: startIndex > 0
    }
  };
}

  async updateTariff(id: string, dto: UpdateNetworkTariffDto) {
    const tariff = await this.prisma.networkTariff.findUnique({
      where: { id }
    });

    if (!tariff) {
      throw new NotFoundException('Тариф не найден');
    }

    return this.prisma.networkTariff.update({
      where: { id },
      data: dto
    });
  }

  async deleteTariff(id: string) {
    const tariff = await this.prisma.networkTariff.findUnique({
      where: { id },
      include: {
        _count: {
          select: { networks: true }
        }
      }
    });

    if (!tariff) {
      throw new NotFoundException('Тариф не найден');
    }

    // Проверяем, используется ли тариф какими-либо сетями
    if (tariff._count.networks > 0) {
      throw new BadRequestException('Невозможно удалить тариф, так как он используется одной или несколькими сетями');
    }

    return this.prisma.networkTariff.delete({
      where: { id }
    });
  }

  async assignTariffToNetwork(networkId: string, tariffId: string) {
    const network = await this.getById(networkId);
    
    const tariff = await this.prisma.networkTariff.findUnique({
      where: { id: tariffId }
    });
    if (!tariff) throw new NotFoundException('Тариф не найден');

    return this.prisma.network.update({
      where: { id: networkId },
      data: {
        currentTariff: { connect: { id: tariffId } }
      },
      include: this.includeDetails
    });
  }

  async removeTariffFromNetwork(networkId: string) {
    const network = await this.getById(networkId);

    return this.prisma.network.update({
      where: { id: networkId },
      data: {
        currentTariff: { disconnect: true }
      },
      include: this.includeDetails
    });
  }

  async getNetworksByTariff(tariffId: string) {
    const tariff = await this.prisma.networkTariff.findUnique({
      where: { id: tariffId }
    });
    if (!tariff) throw new NotFoundException('Тариф не найден');

    return this.prisma.network.findMany({
      where: { currentTariffId: tariffId },
      include: this.includeDetails
    });
  }

}