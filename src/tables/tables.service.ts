import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateHallDto } from './dto/create-hall.dto';
import { UpdateHallDto } from './dto/update-hall.dto';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { CreateTableTagDto } from './dto/create-table-tag.dto';
import { UpdateTableTagDto } from './dto/update-table-tag.dto';
import { CombineTablesDto } from './dto/combine-tables.dto';
import { TableQueryDto } from './dto/table-query.dto';
import { TableStatus } from './entities/table.entity';

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  // ========== ЗАЛЫ ==========
async getHallLayout(id: string) {
    const hall = await this.prisma.hall.findUnique({
      where: { id },
      include: {
        walls: { orderBy: { order: 'asc' } },
        doors: { orderBy: { order: 'asc' } },
        windows: { orderBy: { order: 'asc' } },
        guides: { orderBy: { order: 'asc' } },
      },
    });

    if (!hall) {
      throw new NotFoundException('Зал не найден');
    }

    return hall;
  }

async saveHallLayout(id: string, layout: {
  walls: any[];
  doors: any[];
  windows: any[];
  guides: any[];
}) {
  const hall = await this.prisma.hall.findUnique({
    where: { id },
  });

  if (!hall) {
    throw new NotFoundException('Зал не найден');
  }

  await Promise.all([
    this.prisma.wall.deleteMany({ where: { hallId: id } }),
    this.prisma.door.deleteMany({ where: { hallId: id } }),
    this.prisma.window.deleteMany({ where: { hallId: id } }),
    this.prisma.guide.deleteMany({ where: { hallId: id } }),
  ]);

  // Создаем новые элементы
  const [walls, doors, windows, guides] = await Promise.all([
    this.prisma.wall.createMany({
      data: layout.walls.map(wall => ({
        ...wall,
        hallId: id,
      })),
    }),
    this.prisma.door.createMany({
      data: layout.doors.map(door => ({
        ...door,
        hallId: id,
      })),
    }),
    this.prisma.window.createMany({
      data: layout.windows.map(window => ({
        ...window,
        hallId: id,
      })),
    }),
    this.prisma.guide.createMany({
      data: layout.guides.map(guide => ({
        ...guide,
        hallId: id,
      })),
    }),
  ]);

  return this.getHallLayout(id);
}
  async createHall(dto: CreateHallDto) {
    // Проверяем существование ресторана
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: dto.restaurantId },
    });

    if (!restaurant) {
      throw new NotFoundException('Ресторан не найден');
    }

    return this.prisma.hall.create({
      data: {
        title: dto.title,
        description: dto.description,
        polygon: dto.polygon,
        color: dto.color || '#3B82F6',
        order: dto.order || 0,
        restaurantId: dto.restaurantId,
      },
      include: {
        tables: {
          include: {
            tags:true,
            childTables: true,
            parentTable: true,
          },
        },
      },
    });
  }

  async getHallById(id: string) {
    const hall = await this.prisma.hall.findUnique({
      where: { id },
      include: {
        tables: {
          include: {
            childTables: true,
            parentTable: true,
          },
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!hall) {
      throw new NotFoundException('Зал не найден');
    }

    return hall;
  }

  async getHallsByRestaurant(restaurantId: string, includeInactive: boolean = false) {
    const where = { restaurantId };
    if (!includeInactive) {
      where['isActive'] = true;
    }

    return this.prisma.hall.findMany({
      where,
      include: {
        tables: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async updateHall(id: string, dto: UpdateHallDto) {
    const hall = await this.prisma.hall.findUnique({
      where: { id },
    });

    if (!hall) {
      throw new NotFoundException('Зал не найден');
    }

    return this.prisma.hall.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        polygon: dto.polygon,
        color: dto.color,
        order: dto.order,
        isActive: dto.isActive,
      },
      include: {
        tables: {
          include: {
            childTables: true,
            parentTable: true,
          },
        },
      },
    });
  }

  async deleteHall(id: string) {
    const hall = await this.prisma.hall.findUnique({
      where: { id },
      include: { tables: true },
    });

    if (!hall) {
      throw new NotFoundException('Зал не найден');
    }

    if (hall.tables.length > 0) {
      throw new BadRequestException('Невозможно удалить зал, в котором есть столы');
    }

    return this.prisma.hall.delete({
      where: { id },
    });
  }

  // ========== СТОЛЫ ==========

  async createTable(dto: CreateTableDto) {
    // Проверяем существование зала
    const hall = await this.prisma.hall.findUnique({
      where: { id: dto.hallId },
    });

    if (!hall) {
      throw new NotFoundException('Зал не найден');
    }

    // Проверяем родительский стол, если указан
    if (dto.parentTableId) {
      const parentTable = await this.prisma.table.findUnique({
        where: { id: dto.parentTableId },
      });

      if (!parentTable) {
        throw new NotFoundException('Родительский стол не найден');
      }

      if (parentTable.hallId !== dto.hallId) {
        throw new BadRequestException('Родительский стол должен быть в том же зале');
      }
    }

    const tableData: any = {
      name: dto.name,
      description: dto.description,
      seats: dto.seats,
      shape: dto.shape || 'RECTANGLE',
      status: dto.status || 'AVAILABLE',
      positionX: dto.positionX,
      positionY: dto.positionY,
      width: dto.width,
      height: dto.height,
      radius: dto.radius,
      color: dto.color || '#3B82F6',
      hallId: dto.hallId,
      parentTableId: dto.parentTableId,
    };

    if (dto.tagIds && dto.tagIds.length > 0) {
      // Проверяем существование тегов
      const tags = await this.prisma.tableTag.findMany({
        where: {
          id: { in: dto.tagIds },
          restaurantId: hall.restaurantId, // Теги должны быть того же ресторана
        },
      });

      if (tags.length !== dto.tagIds.length) {
        throw new BadRequestException('Некоторые теги не найдены или принадлежат другому ресторану');
      }

      tableData.tags = {
        create: dto.tagIds.map(tagId => ({
          tag: { connect: { id: tagId } },
        })),
      };
    }

    return this.prisma.table.create({
      data: tableData,
      include: {
        hall: true,
        tags: true,
        childTables: true,
        parentTable: true,
      },
    });
  }

  async getTableById(id: string) {
    const table = await this.prisma.table.findUnique({
      where: { id },
      include: {
        hall: true,
        tags: true,
        childTables: {
          include: {
            tags: true,
          },
        },
        parentTable: {
          include: {
            tags: true,
          },
        },
      },
    });

    if (!table) {
      throw new NotFoundException('Стол не найден');
    }

    return table;
  }

  async getTables(query: TableQueryDto) {
    const {
      restaurantId,
      hallId,
      status,
      minSeats,
      maxSeats,
      tagId,
      includeInactive,
      onlyCombined,
      onlyMainTables,
      page = 1,
      limit = 20,
    } = query;

    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100);

    const where: any = {};

    if (hallId) {
      where.hallId = hallId;
    } else if (restaurantId) {
      where.hall = { restaurantId };
    }

    if (status) {
      where.status = status;
    }

    if (minSeats !== undefined) {
      where.seats = { gte: minSeats };
    }

    if (maxSeats !== undefined) {
      where.seats = where.seats || {};
      where.seats.lte = maxSeats;
    }

    if (tagId) {
      where.tags = {
        some: { tagId },
      };
    }

    if (!includeInactive) {
      where.isActive = true;
    }

    if (onlyCombined) {
      where.parentTableId = null;
      where.childTables = {
        some: {}, // Есть дочерние столы
      };
    }

    if (onlyMainTables) {
      where.parentTableId = null;
    }

    const [tables, total] = await Promise.all([
      this.prisma.table.findMany({
        where,
        include: {
          hall: true,
          tags: true,
          childTables: {
            include: {
              tags: true,
            },
          },
          parentTable: true,
        },
        orderBy: [
          { hall: { order: 'asc' } },
          { order: 'asc' },
          { name: 'asc' },
        ],
        skip,
        take,
      }),
      this.prisma.table.count({ where }),
    ]);

    return {
      data: tables,
      pagination: {
        total,
        page,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async updateTable(id: string, dto: UpdateTableDto) {
    const table = await this.prisma.table.findUnique({
      where: { id },
    });

    if (!table) {
      throw new NotFoundException('Стол не найден');
    }

    // Проверяем родительский стол, если указан
    if (dto.parentTableId) {
      if (dto.parentTableId === id) {
        throw new BadRequestException('Стол не может быть родителем самому себе');
      }

      const parentTable = await this.prisma.table.findUnique({
        where: { id: dto.parentTableId },
      });

      if (!parentTable) {
        throw new NotFoundException('Родительский стол не найден');
      }

      if (parentTable.hallId !== table.hallId) {
        throw new BadRequestException('Родительский стол должен быть в том же зале');
      }

      // Проверяем цикличные зависимости
      const checkForCycle = async (tableId: string): Promise<boolean> => {
        if (tableId === dto.parentTableId) {
          return true;
        }

        const childTables = await this.prisma.table.findMany({
          where: { parentTableId: tableId },
        });

        for (const child of childTables) {
          if (await checkForCycle(child.id)) {
            return true;
          }
        }

        return false;
      };

      if (await checkForCycle(dto.parentTableId)) {
        throw new BadRequestException('Невозможно создать циклическую зависимость между столами');
      }
    }

    const updateData: any = {
      name: dto.name,
      description: dto.description,
      seats: dto.seats,
      status: dto.status,
      positionX: dto.positionX,
      positionY: dto.positionY,
      width: dto.width,
      height: dto.height,
      radius: dto.radius,
      color: dto.color,
      order: dto.order,
      isActive: dto.isActive,
      parentTableId: dto.parentTableId,
    };

    // Обновляем теги, если они указаны
    if (dto.tagIds !== undefined) {
      // Получаем информацию о зале для проверки ресторана
      const hall = await this.prisma.hall.findUnique({
        where: { id: table.hallId },
      });

      if (dto.tagIds.length > 0) {
        // Проверяем существование тегов
        const tags = await this.prisma.tableTag.findMany({
          where: {
            id: { in: dto.tagIds },
            restaurantId: hall.restaurantId,
          },
        });

        if (tags.length !== dto.tagIds.length) {
          throw new BadRequestException('Некоторые теги не найдены или принадлежат другому ресторану');
        }
      }

      // Удаляем все существующие связи и создаем новые
      await this.prisma.tableTableTag.deleteMany({
        where: { tableId: id },
      });

      updateData.tags = {
        create: dto.tagIds.map(tagId => ({
          tag: { connect: { id: tagId } },
        })),
      };
    }

    return this.prisma.table.update({
      where: { id },
      data: updateData,
      include: {
        hall: true,
        tags: true,
        childTables: true,
        parentTable: true,
      },
    });
  }

  async deleteTable(id: string) {
    const table = await this.prisma.table.findUnique({
      where: { id },
      include: {
        childTables: true,
      },
    });

    if (!table) {
      throw new NotFoundException('Стол не найден');
    }


    // Проверяем, есть ли дочерние столы
    if (table.childTables.length > 0) {
      throw new BadRequestException('Невозможно удалить стол, который является родительским для других столов');
    }

    // Проверяем, не является ли стол частью объединения
    if (table.parentTableId) {
      throw new BadRequestException('Невозможно удалить стол, который является частью объединения');
    }

    return this.prisma.table.delete({
      where: { id },
    });
  }

  async updateTableStatus(id: string, status: TableStatus, orderId?: string) {
    const table = await this.prisma.table.findUnique({
      where: { id },
    });

    if (!table) {
      throw new NotFoundException('Стол не найден');
    }

    const updateData: any = { status };

    if (orderId) {
      updateData.currentOrderId = orderId;
    } else if (status !== TableStatus.OCCUPIED) {
      updateData.currentOrderId = null;
    }

    return this.prisma.table.update({
      where: { id },
      data: updateData,
      include: {
        hall: true,
        tags: true,
      },
    });
  }

  async combineTables(dto: CombineTablesDto) {
    const { mainTableId, tableIds, combinedTableName, keepOriginalTables = false } = dto;

    // Проверяем основной стол
    const mainTable = await this.prisma.table.findUnique({
      where: { id: mainTableId },
      include: { hall: true },
    });

    if (!mainTable) {
      throw new NotFoundException('Основной стол не найден');
    }

    // Проверяем все столы для объединения
    const tablesToCombine = await this.prisma.table.findMany({
      where: {
        id: { in: tableIds },
        hallId: mainTable.hallId,
      },
      include: {
        childTables: true,
      },
    });

    if (tablesToCombine.length !== tableIds.length) {
      throw new NotFoundException('Некоторые столы не найдены или находятся в другом зале');
    }

    // Проверяем, что столы свободны и не являются родительскими
    for (const table of tablesToCombine) {
      if (table.childTables.length > 0) {
        throw new BadRequestException(`Стол "${table.name}" является родительским для других столов`);
      }

      if (table.parentTableId) {
        throw new BadRequestException(`Стол "${table.name}" уже является частью объединения`);
      }
    }

    // Рассчитываем общее количество мест
    const totalSeats = tablesToCombine.reduce((sum, table) => sum + table.seats, 0);

    // Создаем объединенный стол
    const combinedTable = await this.prisma.table.create({
      data: {
        name: combinedTableName || `Объединенный стол из ${tablesToCombine.length + 1} столов`,
        seats: totalSeats + mainTable.seats,
        shape: mainTable.shape,
        hallId: mainTable.hallId,
        positionX: mainTable.positionX,
        positionY: mainTable.positionY,
        width: mainTable.width,
        height: mainTable.height,
        radius: mainTable.radius,
        color: mainTable.color,
        status: mainTable.status,
      },
    });

    // Связываем все столы с объединенным столом
    const connectOperations = [
      // Основной стол
      this.prisma.table.update({
        where: { id: mainTableId },
        data: {
          parentTableId: combinedTable.id,
          isActive: keepOriginalTables,
        },
      }),
      // Остальные столы
      ...tablesToCombine.map(table =>
        this.prisma.table.update({
          where: { id: table.id },
          data: {
            parentTableId: combinedTable.id,
            isActive: keepOriginalTables,
          },
        })
      ),
    ];

    await Promise.all(connectOperations);

    return this.getTableById(combinedTable.id);
  }

  async separateTables(combinedTableId: string) {
    const combinedTable = await this.prisma.table.findUnique({
      where: { id: combinedTableId },
      include: {
        childTables: true,
      },
    });

    if (!combinedTable) {
      throw new NotFoundException('Объединенный стол не найден');
    }


    // Активируем все дочерние столы
    const activateOperations = combinedTable.childTables.map(table =>
      this.prisma.table.update({
        where: { id: table.id },
        data: {
          parentTableId: null,
          isActive: true,
        },
      })
    );

    await Promise.all(activateOperations);

    // Удаляем объединенный стол
    await this.prisma.table.delete({
      where: { id: combinedTableId },
    });

    return combinedTable.childTables;
  }

  // ========== ТЕГИ ==========

  async createTableTag(dto: CreateTableTagDto) {
    // Проверяем существование ресторана
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: dto.restaurantId },
    });

    if (!restaurant) {
      throw new NotFoundException('Ресторан не найден');
    }

    return this.prisma.tableTag.create({
      data: {
        name: dto.name,
        description: dto.description,
        color: dto.color || '#6B7280',
        order: dto.order || 0,
        restaurantId: dto.restaurantId,
      },
    });
  }

  async getTableTagById(id: string) {
    const tag = await this.prisma.tableTag.findUnique({
      where: { id },
      include: {
        // В Prisma модель TableTag имеет отношение tables через таблицу TableTableTag
        // Правильное включение должно быть через промежуточную таблицу
        tables: true,
      },
    });

    if (!tag) {
      throw new NotFoundException('Тег не найден');
    }

    return tag;
  }

  async getTableTagsByRestaurant(restaurantId: string, includeInactive: boolean = false) {
    const where = { restaurantId };
    if (!includeInactive) {
      where['isActive'] = true;
    }

    return this.prisma.tableTag.findMany({
      where,
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }

  async updateTableTag(id: string, dto: UpdateTableTagDto) {
    const tag = await this.prisma.tableTag.findUnique({
      where: { id },
    });

    if (!tag) {
      throw new NotFoundException('Тег не найден');
    }

    return this.prisma.tableTag.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        color: dto.color,
        order: dto.order,
        isActive: dto.isActive,
      },
    });
  }

  async deleteTableTag(id: string) {
    const tag = await this.prisma.tableTag.findUnique({
      where: { id },
      include: {
        tables: true,
      },
    });

    if (!tag) {
      throw new NotFoundException('Тег не найден');
    }

    if (tag.tables.length > 0) {
      throw new BadRequestException('Невозможно удалить тег, который используется столами');
    }

    return this.prisma.tableTag.delete({
      where: { id },
    });
  }

  // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

  async getAvailableTables(
    hallId: string,
    requiredSeats: number,
    excludeTableId?: string
  ) {
    const where: any = {
      hallId,
      status: 'AVAILABLE',
      isActive: true,
      parentTableId: null, // Только основные столы
      seats: { gte: requiredSeats },
    };

    if (excludeTableId) {
      where.id = { not: excludeTableId };
    }

    return this.prisma.table.findMany({
      where,
      include: {
        tags: true,
        childTables: true,
      },
      orderBy: [{ seats: 'asc' }, { order: 'asc' }],
    });
  }

  async getTableStatistics(restaurantId: string) {
    const halls = await this.prisma.hall.findMany({
      where: { restaurantId, isActive: true },
      include: {
        tables: {
          where: { isActive: true },
          include: {
            childTables: true,
          },
        },
      },
    });

    let totalTables = 0;
    let totalSeats = 0;
    let availableTables = 0;
    let occupiedTables = 0;
    let reservedTables = 0;
    let combinedTables = 0;

    halls.forEach(hall => {
      hall.tables.forEach(table => {
        if (!table.parentTableId) { // Считаем только основные столы
          totalTables++;
          totalSeats += table.seats;

          if (table.childTables.length > 0) {
            combinedTables++;
            // Добавляем места дочерних столов
            table.childTables.forEach(child => {
              totalSeats += child.seats;
            });
          }

          switch (table.status) {
            case 'AVAILABLE':
              availableTables++;
              break;
            case 'OCCUPIED':
              occupiedTables++;
              break;
            case 'RESERVED':
              reservedTables++;
              break;
          }
        }
      });
    });

    return {
      restaurantId,
      halls: halls.length,
      totalTables,
      totalSeats,
      availableTables,
      occupiedTables,
      reservedTables,
      combinedTables,
      occupancyRate: totalTables > 0 ? (occupiedTables / totalTables) * 100 : 0,
    };
  }

}