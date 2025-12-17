// migrate-all-data.js
const { PrismaClient: PrismaClientPackage } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Создаем директорию для отчетов
if (!fs.existsSync('./reports')) {
  fs.mkdirSync('./reports');
}

// Старая база данных
const oldDb = new PrismaClientPackage({
  datasources: {
    db: {
      url: "postgresql://postgres:jule66f2%218%26J@82.202.130.240/crm"
    }
  }
});

// Новая база данных
const newDb = new PrismaClientPackage({
  datasources: {
    db: {
      url: "postgresql://postgres:jule66f2%218%26J@217.114.4.208/crm"
    }
  }
});

// Карта для отслеживания соответствия ID
const idMap = {
  user: {},
  workshop: {},
  restaurant: {},
  product: {},
  category: {},
  additive: {},
  shift: {},
  customer: {},
  order: {},
  payment: {},
  warehouse: {},
  inventoryItem: {},
  storageLocation: {},
  surcharge: {},
  discount: {},
  tenant: {},
  network: {},
  networkTariff: {},
  reason: {
    writeOff: {},
    receipt: {},
    movement: {},
    income: {},
    expense: {}
  }
};

// Отчет о миграции
const migrationReport = {
  startTime: null,
  endTime: null,
  duration: null,
  entities: {},
  errors: []
};

// Утилиты
async function logStep(step, message) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`[${timestamp}] ${step}: ${message}`);
}

async function logError(entity, error, context = '') {
  const errorMsg = {
    entity,
    error: error.message,
    context,
    timestamp: new Date().toISOString()
  };
  migrationReport.errors.push(errorMsg);
  console.error(`❌ Ошибка в ${entity}: ${error.message} ${context}`);
}

async function saveReport() {
  const reportPath = `./reports/migration-report-${Date.now()}.json`;
  migrationReport.endTime = new Date().toISOString();
  migrationReport.duration = new Date(migrationReport.endTime) - new Date(migrationReport.startTime);
  
  fs.writeFileSync(reportPath, JSON.stringify(migrationReport, null, 2));
  console.log(`\n📊 Отчет сохранен: ${reportPath}`);
}

// Функции миграции для каждой сущности
async function migrateUsers() {
  logStep('👤 Users', 'Начало миграции пользователей');
  
  try {
    // Получаем всех пользователей из старой базы
    const oldUsers = await oldDb.user.findMany({
      include: {
        workshops: true,
        networks: true
      }
    });
    
    logStep('👤 Users', `Найдено ${oldUsers.length} пользователей`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const user of oldUsers) {
      try {
        // Создаем пользователя в новой базе
        const newUser = await newDb.user.create({
          data: {
            id: user.id,
            email: user.email,
            password: user.password,
            name: user.name,
            picture: user.picture,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          }
        });
        
        idMap.user[user.id] = user.id;
        successCount++;
        
        // Сохраняем связи с воркшопами
        if (user.workshops && user.workshops.length > 0) {
          for (const workshop of user.workshops) {
            try {
              await newDb.userWorkshop.create({
                data: {
                  userId: user.id,
                  workshopId: workshop.workshopId
                }
              });
            } catch (error) {
              logError('UserWorkshop', error, `user: ${user.id}, workshop: ${workshop.workshopId}`);
            }
          }
        }
        
        // Сохраняем связи с сетями
        if (user.networks && user.networks.length > 0) {
          for (const network of user.networks) {
            try {
              await newDb.network.update({
                where: { id: network.networkId },
                data: {
                  users: {
                    connect: { id: user.id }
                  }
                }
              });
            } catch (error) {
              logError('UserNetwork', error, `user: ${user.id}, network: ${network.networkId}`);
            }
          }
        }
        
      } catch (error) {
        errorCount++;
        logError('User', error, `id: ${user.id}, email: ${user.email}`);
      }
    }
    
    logStep('👤 Users', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.users = { total: oldUsers.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('Users Migration', error);
  }
}

async function migrateWorkshops() {
  logStep('🏭 Workshops', 'Начало миграции воркшопов');
  
  try {
    const oldWorkshops = await oldDb.workshop.findMany();
    logStep('🏭 Workshops', `Найдено ${oldWorkshops.length} воркшопов`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const workshop of oldWorkshops) {
      try {
        const newWorkshop = await newDb.workshop.create({
          data: {
            id: workshop.id,
            name: workshop.name,
            createdAt: workshop.createdAt,
            updatedAt: workshop.updatedAt
          }
        });
        
        idMap.workshop[workshop.id] = workshop.id;
        successCount++;
        
      } catch (error) {
        errorCount++;
        logError('Workshop', error, `id: ${workshop.id}, name: ${workshop.name}`);
      }
    }
    
    logStep('🏭 Workshops', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.workshops = { total: oldWorkshops.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('Workshops Migration', error);
  }
}

async function migrateTenants() {
  logStep('🏢 Tenants', 'Начало миграции тенантов');
  
  try {
    const oldTenants = await oldDb.tenant.findMany();
    logStep('🏢 Tenants', `Найдено ${oldTenants.length} тенантов`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const tenant of oldTenants) {
      try {
        const newTenant = await newDb.tenant.create({
          data: {
            id: tenant.id,
            name: tenant.name,
            type: tenant.type,
            domain: tenant.domain,
            subdomain: tenant.subdomain,
            isActive: tenant.isActive,
            logo: tenant.logo,
            primaryColor: tenant.primaryColor,
            secondaryColor: tenant.secondaryColor,
            accentColor: tenant.accentColor,
            settings: tenant.settings || {},
            createdAt: tenant.createdAt,
            updatedAt: tenant.updatedAt
          }
        });
        
        idMap.tenant[tenant.id] = tenant.id;
        successCount++;
        
      } catch (error) {
        errorCount++;
        logError('Tenant', error, `id: ${tenant.id}, name: ${tenant.name}`);
      }
    }
    
    logStep('🏢 Tenants', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.tenants = { total: oldTenants.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('Tenants Migration', error);
  }
}

async function migrateNetworks() {
  logStep('🌐 Networks', 'Начало миграции сетей');
  
  try {
    const oldNetworks = await oldDb.network.findMany({
      include: {
        tenant: true,
        currentTariff: true
      }
    });
    
    logStep('🌐 Networks', `Найдено ${oldNetworks.length} сетей`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const network of oldNetworks) {
      try {
        const networkData = {
          id: network.id,
          name: network.name,
          description: network.description,
          ownerId: network.ownerId,
          logo: network.logo,
          primaryColor: network.primaryColor,
          balance: network.balance,
          isBlocked: network.isBlocked,
          createdAt: network.createdAt,
          updatedAt: network.updatedAt
        };
        
        // Добавляем tenantId если есть
        if (network.tenant && idMap.tenant[network.tenant.id]) {
          networkData.tenantId = idMap.tenant[network.tenant.id];
        }
        
        // Добавляем currentTariffId если есть
        if (network.currentTariff) {
          networkData.currentTariffId = network.currentTariff.id;
        }
        
        const newNetwork = await newDb.network.create({
          data: networkData
        });
        
        idMap.network[network.id] = network.id;
        successCount++;
        
      } catch (error) {
        errorCount++;
        logError('Network', error, `id: ${network.id}, name: ${network.name}`);
      }
    }
    
    logStep('🌐 Networks', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.networks = { total: oldNetworks.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('Networks Migration', error);
  }
}

async function migrateNetworkTariffs() {
  logStep('💰 NetworkTariffs', 'Начало миграции тарифов сетей');
  
  try {
    const oldTariffs = await oldDb.networkTariff.findMany();
    logStep('💰 NetworkTariffs', `Найдено ${oldTariffs.length} тарифов`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const tariff of oldTariffs) {
      try {
        const newTariff = await newDb.networkTariff.create({
          data: {
            id: tariff.id,
            name: tariff.name,
            price: tariff.price,
            period: tariff.period,
            isActive: tariff.isActive,
            createdAt: tariff.createdAt,
            updatedAt: tariff.updatedAt
          }
        });
        
        idMap.networkTariff[tariff.id] = tariff.id;
        successCount++;
        
      } catch (error) {
        errorCount++;
        logError('NetworkTariff', error, `id: ${tariff.id}, name: ${tariff.name}`);
      }
    }
    
    logStep('💰 NetworkTariffs', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.networkTariffs = { total: oldTariffs.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('NetworkTariffs Migration', error);
  }
}

async function migrateRestaurants() {
  logStep('🏪 Restaurants', 'Начало миграции ресторанов');
  
  try {
    const oldRestaurants = await oldDb.restaurant.findMany({
      include: {
        network: true,
        workshops: true,
        categories: true
      }
    });
    
    logStep('🏪 Restaurants', `Найдено ${oldRestaurants.length} ресторанов`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const restaurant of oldRestaurants) {
      try {
        const restaurantData = {
          id: restaurant.id,
          title: restaurant.title,
          description: restaurant.description,
          address: restaurant.address,
          images: restaurant.images || [],
          latitude: restaurant.latitude,
          longitude: restaurant.longitude,
          legalInfo: restaurant.legalInfo,
          allowNegativeStock: restaurant.allowNegativeStock,
          acceptOrders: restaurant.acceptOrders,
          shiftCloseTime: restaurant.shiftCloseTime,
          useWarehouse: restaurant.useWarehouse,
          // Рабочие дни
          mondayIsWorking: restaurant.mondayIsWorking,
          mondayOpen: restaurant.mondayOpen,
          mondayClose: restaurant.mondayClose,
          tuesdayIsWorking: restaurant.tuesdayIsWorking,
          tuesdayOpen: restaurant.tuesdayOpen,
          tuesdayClose: restaurant.tuesdayClose,
          wednesdayIsWorking: restaurant.wednesdayIsWorking,
          wednesdayOpen: restaurant.wednesdayOpen,
          wednesdayClose: restaurant.wednesdayClose,
          thursdayIsWorking: restaurant.thursdayIsWorking,
          thursdayOpen: restaurant.thursdayOpen,
          thursdayClose: restaurant.thursdayClose,
          fridayIsWorking: restaurant.fridayIsWorking,
          fridayOpen: restaurant.fridayOpen,
          fridayClose: restaurant.fridayClose,
          saturdayIsWorking: restaurant.saturdayIsWorking,
          saturdayOpen: restaurant.saturdayOpen,
          saturdayClose: restaurant.saturdayClose,
          sundayIsWorking: restaurant.sundayIsWorking,
          sundayOpen: restaurant.sundayOpen,
          sundayClose: restaurant.sundayClose,
          createdAt: restaurant.createdAt,
          updatedAt: restaurant.updatedAt
        };
        
        // Добавляем networkId если есть
        if (restaurant.network && idMap.network[restaurant.network.id]) {
          restaurantData.networkId = idMap.network[restaurant.network.id];
        }
        
        const newRestaurant = await newDb.restaurant.create({
          data: restaurantData
        });
        
        idMap.restaurant[restaurant.id] = restaurant.id;
        successCount++;
        
        // Сохраняем связи с воркшопами
        if (restaurant.workshops && restaurant.workshops.length > 0) {
          for (const workshop of restaurant.workshops) {
            try {
              await newDb.restaurantWorkshop.create({
                data: {
                  restaurantId: restaurant.id,
                  workshopId: workshop.workshopId
                }
              });
            } catch (error) {
              logError('RestaurantWorkshop', error, `restaurant: ${restaurant.id}, workshop: ${workshop.workshopId}`);
            }
          }
        }
        
        // Сохраняем связи с категориями
        if (restaurant.categories && restaurant.categories.length > 0) {
          for (const category of restaurant.categories) {
            try {
              await newDb.restaurant.update({
                where: { id: restaurant.id },
                data: {
                  categories: {
                    connect: { id: category.categoryId }
                  }
                }
              });
            } catch (error) {
              logError('RestaurantCategory', error, `restaurant: ${restaurant.id}, category: ${category.categoryId}`);
            }
          }
        }
        
      } catch (error) {
        errorCount++;
        logError('Restaurant', error, `id: ${restaurant.id}, title: ${restaurant.title}`);
      }
    }
    
    logStep('🏪 Restaurants', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.restaurants = { total: oldRestaurants.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('Restaurants Migration', error);
  }
}

async function migrateCategories() {
  logStep('📂 Categories', 'Начало миграции категорий');
  
  try {
    const oldCategories = await oldDb.category.findMany({
      include: {
        parent: true
      }
    });
    
    logStep('📂 Categories', `Найдено ${oldCategories.length} категорий`);
    
    // Сортируем: сначала родительские, потом дочерние
    const sortedCategories = [...oldCategories].sort((a, b) => {
      if (a.parentId && !b.parentId) return 1;
      if (!a.parentId && b.parentId) return -1;
      return 0;
    });
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const category of sortedCategories) {
      try {
        const categoryData = {
          id: category.id,
          title: category.title,
          description: category.description,
          slug: category.slug,
          image: category.image,
          metaTitle: category.metaTitle,
          metaDescription: category.metaDescription,
          metaKeywords: category.metaKeywords,
          order: category.order,
          clientOrder: category.clientOrder,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt
        };
        
        // Добавляем parentId если есть и уже мигрирован
        if (category.parent && idMap.category[category.parent.id]) {
          categoryData.parentId = idMap.category[category.parent.id];
        }
        
        const newCategory = await newDb.category.create({
          data: categoryData
        });
        
        idMap.category[category.id] = category.id;
        successCount++;
        
      } catch (error) {
        errorCount++;
        logError('Category', error, `id: ${category.id}, title: ${category.title}`);
      }
    }
    
    logStep('📂 Categories', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.categories = { total: oldCategories.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('Categories Migration', error);
  }
}

async function migrateProducts() {
  logStep('🍽️ Products', 'Начало миграции продуктов');
  
  try {
    const oldProducts = await oldDb.product.findMany({
      include: {
        category: true,
        workshops: true,
        additives: true
      }
    });
    
    logStep('🍽️ Products', `Найдено ${oldProducts.length} продуктов`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const product of oldProducts) {
      try {
        const productData = {
          id: product.id,
          title: product.title,
          description: product.description,
          weight: product.weight,
          quantity: product.quantity,
          packageQuantity: product.packageQuantity,
          preparationTime: product.preparationTime,
          price: product.price,
          printLabels: product.printLabels,
          publishedOnWebsite: product.publishedOnWebsite,
          publishedInApp: product.publishedInApp,
          isStopList: product.isStopList,
          composition: product.composition,
          pageTitle: product.pageTitle,
          metaDescription: product.metaDescription,
          content: product.content,
          images: product.images || [],
          sortOrder: product.sortOrder,
          clientSortOrder: product.clientSortOrder,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt
        };
        
        // Добавляем categoryId если есть
        if (product.category && idMap.category[product.category.id]) {
          productData.categoryId = idMap.category[product.category.id];
        }
        
        const newProduct = await newDb.product.create({
          data: productData
        });
        
        idMap.product[product.id] = product.id;
        successCount++;
        
        // Сохраняем связи с воркшопами
        if (product.workshops && product.workshops.length > 0) {
          for (const workshop of product.workshops) {
            try {
              await newDb.productWorkshop.create({
                data: {
                  productId: product.id,
                  workshopId: workshop.workshopId
                }
              });
            } catch (error) {
              logError('ProductWorkshop', error, `product: ${product.id}, workshop: ${workshop.workshopId}`);
            }
          }
        }
        
      } catch (error) {
        errorCount++;
        logError('Product', error, `id: ${product.id}, title: ${product.title}`);
      }
    }
    
    logStep('🍽️ Products', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.products = { total: oldProducts.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('Products Migration', error);
  }
}

async function migrateAdditives() {
  logStep('➕ Additives', 'Начало миграции добавок');
  
  try {
    const oldAdditives = await oldDb.additive.findMany();
    logStep('➕ Additives', `Найдено ${oldAdditives.length} добавок`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const additive of oldAdditives) {
      try {
        const newAdditive = await newDb.additive.create({
          data: {
            id: additive.id,
            title: additive.title,
            price: additive.price,
            createdAt: additive.createdAt,
            updatedAt: additive.updatedAt
          }
        });
        
        idMap.additive[additive.id] = additive.id;
        successCount++;
        
      } catch (error) {
        errorCount++;
        logError('Additive', error, `id: ${additive.id}, title: ${additive.title}`);
      }
    }
    
    logStep('➕ Additives', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.additives = { total: oldAdditives.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('Additives Migration', error);
  }
}

async function migrateRestaurantProductPrices() {
  logStep('💰 RestaurantProductPrices', 'Начало миграции цен продуктов в ресторанах');
  
  try {
    const oldPrices = await oldDb.restaurantProductPrice.findMany();
    logStep('💰 RestaurantProductPrices', `Найдено ${oldPrices.length} цен`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const price of oldPrices) {
      try {
        // Проверяем, что продукт и ресторан существуют
        if (idMap.product[price.productId] && idMap.restaurant[price.restaurantId]) {
          const newPrice = await newDb.restaurantProductPrice.create({
            data: {
              id: price.id,
              productId: idMap.product[price.productId],
              restaurantId: idMap.restaurant[price.restaurantId],
              price: price.price,
              isStopList: price.isStopList,
              createdAt: price.createdAt,
              updatedAt: price.updatedAt
            }
          });
          successCount++;
        } else {
          logError('RestaurantProductPrice', new Error('Продукт или ресторан не найден'), 
            `product: ${price.productId}, restaurant: ${price.restaurantId}`);
          errorCount++;
        }
        
      } catch (error) {
        errorCount++;
        logError('RestaurantProductPrice', error, 
          `id: ${price.id}, product: ${price.productId}, restaurant: ${price.restaurantId}`);
      }
    }
    
    logStep('💰 RestaurantProductPrices', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.restaurantProductPrices = { total: oldPrices.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('RestaurantProductPrices Migration', error);
  }
}

async function migrateRestaurantProductRelations() {
  logStep('🔗 Restaurant-Product Relations', 'Начало миграции связей ресторанов с продуктами');
  
  try {
    // Получаем связи через промежуточную таблицу
    const relations = await oldDb.$queryRaw`
      SELECT DISTINCT rp.*, p.title as product_title, r.title as restaurant_title
      FROM _RestaurantToProduct rp
      JOIN product p ON rp.B = p.id
      JOIN restaurant r ON rp.A = r.id
    `;
    
    logStep('🔗 Restaurant-Product Relations', `Найдено ${relations.length} связей`);
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    for (const relation of relations) {
      try {
        // Проверяем существование ресторана и продукта
        if (idMap.restaurant[relation.A] && idMap.product[relation.B]) {
          await newDb.restaurant.update({
            where: { id: idMap.restaurant[relation.A] },
            data: {
              products: {
                connect: { id: idMap.product[relation.B] }
              }
            }
          });
          successCount++;
        } else {
          skippedCount++;
          logError('Restaurant-Product Relation', new Error('Ресторан или продукт не найден'),
            `restaurant: ${relation.A} (${relation.restaurant_title}), product: ${relation.B} (${relation.product_title})`);
        }
        
      } catch (error) {
        errorCount++;
        logError('Restaurant-Product Relation', error,
          `restaurant: ${relation.A}, product: ${relation.B}`);
      }
    }
    
    logStep('🔗 Restaurant-Product Relations', 
      `Завершено: ${successCount} успешно, ${errorCount} ошибок, ${skippedCount} пропущено`);
    migrationReport.entities.restaurantProductRelations = { total: relations.length, success: successCount, errors: errorCount, skipped: skippedCount };
    
  } catch (error) {
    logError('Restaurant-Product Relations Migration', error);
  }
}

async function migrateShifts() {
  logStep('🕐 Shifts', 'Начало миграции смен');
  
  try {
    const oldShifts = await oldDb.shift.findMany({
      include: {
        users: true,
        expenses: true,
        incomes: true
      }
    });
    
    logStep('🕐 Shifts', `Найдено ${oldShifts.length} смен`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const shift of oldShifts) {
      try {
        // Проверяем существование ресторана
        if (idMap.restaurant[shift.restaurantId]) {
          const newShift = await newDb.shift.create({
            data: {
              id: shift.id,
              status: shift.status,
              restaurantId: idMap.restaurant[shift.restaurantId],
              startTime: shift.startTime,
              endTime: shift.endTime,
              description: shift.description,
              createdAt: shift.createdAt,
              updatedAt: shift.updatedAt
            }
          });
          
          idMap.shift[shift.id] = shift.id;
          successCount++;
          
          // Сохраняем связи с пользователями
          if (shift.users && shift.users.length > 0) {
            for (const userShift of shift.users) {
              if (idMap.user[userShift.userId]) {
                try {
                  await newDb.userShift.create({
                    data: {
                      id: userShift.id,
                      userId: idMap.user[userShift.userId],
                      shiftId: shift.id
                    }
                  });
                } catch (error) {
                  logError('UserShift', error, `user: ${userShift.userId}, shift: ${shift.id}`);
                }
              }
            }
          }
          
          // Сохраняем расходы смены
          if (shift.expenses && shift.expenses.length > 0) {
            for (const expense of shift.expenses) {
              try {
                await newDb.shiftExpense.create({
                  data: {
                    id: expense.id,
                    shiftId: shift.id,
                    title: expense.title,
                    amount: expense.amount,
                    description: expense.description,
                    createdAt: expense.createdAt,
                    updatedAt: expense.updatedAt
                  }
                });
              } catch (error) {
                logError('ShiftExpense', error, `shift: ${shift.id}, expense: ${expense.id}`);
              }
            }
          }
          
          // Сохраняем доходы смены
          if (shift.incomes && shift.incomes.length > 0) {
            for (const income of shift.incomes) {
              try {
                await newDb.shiftIncome.create({
                  data: {
                    id: income.id,
                    shiftId: shift.id,
                    title: income.title,
                    amount: income.amount,
                    description: income.description,
                    createdAt: income.createdAt,
                    updatedAt: income.updatedAt
                  }
                });
              } catch (error) {
                logError('ShiftIncome', error, `shift: ${shift.id}, income: ${income.id}`);
              }
            }
          }
          
        } else {
          errorCount++;
          logError('Shift', new Error('Ресторан не найден'), `id: ${shift.id}, restaurant: ${shift.restaurantId}`);
        }
        
      } catch (error) {
        errorCount++;
        logError('Shift', error, `id: ${shift.id}`);
      }
    }
    
    logStep('🕐 Shifts', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.shifts = { total: oldShifts.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('Shifts Migration', error);
  }
}

async function migrateCustomers() {
  logStep('👥 Customers', 'Начало миграции клиентов');
  
  try {
    const oldCustomers = await oldDb.customer.findMany({
      include: {
        network: true,
        bonusBalances: true
      }
    });
    
    logStep('👥 Customers', `Найдено ${oldCustomers.length} клиентов`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const customer of oldCustomers) {
      try {
        // Проверяем существование сети
        if (customer.network && idMap.network[customer.network.id]) {
          const newCustomer = await newDb.customer.create({
            data: {
              id: customer.id,
              phone: customer.phone,
              networkId: idMap.network[customer.network.id],
              code: customer.code,
              codeExpires: customer.codeExpires,
              shortCode: customer.shortCode,
              shortCodeExpires: customer.shortCodeExpires,
              lastLogin: customer.lastLogin,
              createdAt: customer.createdAt,
              updatedAt: customer.updatedAt
            }
          });
          
          idMap.customer[customer.id] = customer.id;
          successCount++;
          
          // Сохраняем бонусные балансы
          if (customer.bonusBalances && customer.bonusBalances.length > 0) {
            for (const balance of customer.bonusBalances) {
              if (idMap.network[balance.networkId]) {
                try {
                  await newDb.customerBonusBalance.create({
                    data: {
                      id: balance.id,
                      customerId: customer.id,
                      networkId: idMap.network[balance.networkId],
                      balance: balance.balance,
                      totalEarned: balance.totalEarned,
                      totalSpent: balance.totalSpent,
                      createdAt: balance.createdAt,
                      updatedAt: balance.updatedAt
                    }
                  });
                } catch (error) {
                  logError('CustomerBonusBalance', error, `customer: ${customer.id}, balance: ${balance.id}`);
                }
              }
            }
          }
          
        } else {
          errorCount++;
          logError('Customer', new Error('Сеть не найдена'), `id: ${customer.id}, phone: ${customer.phone}`);
        }
        
      } catch (error) {
        errorCount++;
        logError('Customer', error, `id: ${customer.id}, phone: ${customer.phone}`);
      }
    }
    
    logStep('👥 Customers', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.customers = { total: oldCustomers.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('Customers Migration', error);
  }
}

async function migrateOrders() {
  logStep('📦 Orders', 'Начало миграции заказов');
  
  try {
    const oldOrders = await oldDb.order.findMany({
      include: {
        items: {
          include: {
            additives: true
          }
        },
        surcharges: true,
        logs: true,
        discountApplications: true,
        bonusTransactions: true,
        personalDiscount: true,
        yandexEdaOrder: true
      }
    });
    
    logStep('📦 Orders', `Найдено ${oldOrders.length} заказов`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const order of oldOrders) {
      try {
        // Проверяем существование зависимых сущностей
        const restaurantExists = idMap.restaurant[order.restaurantId];
        const customerExists = !order.customerId || idMap.customer[order.customerId];
        const shiftExists = !order.shiftId || idMap.shift[order.shiftId];
        
        if (restaurantExists && customerExists && shiftExists) {
          const orderData = {
            id: order.id,
            source: order.source,
            number: order.number,
            status: order.status,
            type: order.type,
            scheduledAt: order.scheduledAt,
            tableNumber: order.tableNumber,
            restaurantId: idMap.restaurant[order.restaurantId],
            phone: order.phone,
            totalAmount: order.totalAmount,
            comment: order.comment,
            deliveryAddress: order.deliveryAddress,
            deliveryTime: order.deliveryTime,
            deliveryNotes: order.deliveryNotes,
            discountAmount: order.discountAmount,
            bonusPointsUsed: order.bonusPointsUsed,
            bonusPointsEarned: order.bonusPointsEarned,
            isReordered: order.isReordered,
            hasDiscount: order.hasDiscount,
            discountCanceled: order.discountCanceled,
            isPrecheck: order.isPrecheck,
            isRefund: order.isRefund,
            deliveryStartedAt: order.deliveryStartedAt,
            deliveryCourierId: order.deliveryCourierId && idMap.user[order.deliveryCourierId] ? idMap.user[order.deliveryCourierId] : null,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt
          };
          
          // Добавляем связи если есть
          if (order.customerId && idMap.customer[order.customerId]) {
            orderData.customerId = idMap.customer[order.customerId];
          }
          
          if (order.shiftId && idMap.shift[order.shiftId]) {
            orderData.shiftId = idMap.shift[order.shiftId];
          }
          
          if (order.personalDiscount && idMap.customer[order.personalDiscount.customerId]) {
            orderData.personalDiscountId = order.personalDiscount.id;
          }
          
          const newOrder = await newDb.order.create({
            data: orderData
          });
          
          idMap.order[order.id] = order.id;
          successCount++;
          
          // Сохраняем позиции заказа
          if (order.items && order.items.length > 0) {
            for (const item of order.items) {
              if (idMap.product[item.productId]) {
                try {
                  const itemData = {
                    id: item.id,
                    orderId: order.id,
                    productId: idMap.product[item.productId],
                    quantity: item.quantity,
                    price: item.price,
                    comment: item.comment,
                    status: item.status,
                    startedAt: item.startedAt,
                    completedAt: item.completedAt,
                    pausedAt: item.pausedAt,
                    refundedAt: item.refundedAt,
                    isReordered: item.isReordered,
                    isRefund: item.isRefund,
                    refundReason: item.refundReason,
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt
                  };
                  
                  // Добавляем связи с пользователями если есть
                  if (item.assignedToId && idMap.user[item.assignedToId]) {
                    itemData.assignedToId = idMap.user[item.assignedToId];
                  }
                  if (item.startedById && idMap.user[item.startedById]) {
                    itemData.startedById = idMap.user[item.startedById];
                  }
                  if (item.completedById && idMap.user[item.completedById]) {
                    itemData.completedById = idMap.user[item.completedById];
                  }
                  if (item.pausedById && idMap.user[item.pausedById]) {
                    itemData.pausedById = idMap.user[item.pausedById];
                  }
                  if (item.refundedById && idMap.user[item.refundedById]) {
                    itemData.refundedById = idMap.user[item.refundedById];
                  }
                  
                  const newItem = await newDb.orderItem.create({
                    data: itemData
                  });
                  
                  // Сохраняем добавки в позиции
                  if (item.additives && item.additives.length > 0) {
                    for (const additive of item.additives) {
                      if (idMap.additive[additive.additiveId]) {
                        try {
                          await newDb.orderItem.update({
                            where: { id: newItem.id },
                            data: {
                              additives: {
                                connect: { id: idMap.additive[additive.additiveId] }
                              }
                            }
                          });
                        } catch (error) {
                          logError('OrderItemAdditive', error, `item: ${item.id}, additive: ${additive.additiveId}`);
                        }
                      }
                    }
                  }
                  
                } catch (error) {
                  logError('OrderItem', error, `order: ${order.id}, product: ${item.productId}`);
                }
              }
            }
          }
          
          // Сохраняем логи заказа
          if (order.logs && order.logs.length > 0) {
            for (const log of order.logs) {
              try {
                const logData = {
                  id: log.id,
                  orderId: order.id,
                  action: log.action,
                  message: log.message,
                  metadata: log.metadata || {},
                  createdAt: log.createdAt
                };
                
                if (log.userId && idMap.user[log.userId]) {
                  logData.userId = idMap.user[log.userId];
                }
                
                await newDb.orderLog.create({
                  data: logData
                });
              } catch (error) {
                logError('OrderLog', error, `order: ${order.id}, log: ${log.id}`);
              }
            }
          }
          
          // Сохраняем наценки заказа
          if (order.surcharges && order.surcharges.length > 0) {
            for (const surcharge of order.surcharges) {
              try {
                await newDb.orderSurcharge.create({
                  data: {
                    id: surcharge.id,
                    orderId: order.id,
                    surchargeId: surcharge.surchargeId,
                    amount: surcharge.amount,
                    description: surcharge.description,
                    createdAt: surcharge.createdAt
                  }
                });
              } catch (error) {
                logError('OrderSurcharge', error, `order: ${order.id}, surcharge: ${surcharge.surchargeId}`);
              }
            }
          }
          
          // Сохраняем заказ Яндекс.Еды если есть
          if (order.yandexEdaOrder) {
            try {
              await newDb.yandexEdaOrder.create({
                data: {
                  id: order.yandexEdaOrder.id,
                  orderId: order.id,
                  externalId: order.yandexEdaOrder.externalId,
                  status: order.yandexEdaOrder.status,
                  createdAt: order.yandexEdaOrder.createdAt,
                  updatedAt: order.yandexEdaOrder.updatedAt
                }
              });
            } catch (error) {
              logError('YandexEdaOrder', error, `order: ${order.id}`);
            }
          }
          
        } else {
          errorCount++;
          logError('Order', new Error('Зависимые сущности не найдены'), 
            `id: ${order.id}, restaurant: ${order.restaurantId}, customer: ${order.customerId}, shift: ${order.shiftId}`);
        }
        
      } catch (error) {
        errorCount++;
        logError('Order', error, `id: ${order.id}, number: ${order.number}`);
      }
    }
    
    logStep('📦 Orders', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.orders = { total: oldOrders.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('Orders Migration', error);
  }
}

async function migratePayments() {
  logStep('💳 Payments', 'Начало миграции платежей');
  
  try {
    const oldPayments = await oldDb.payment.findMany();
    logStep('💳 Payments', `Найдено ${oldPayments.length} платежей`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const payment of oldPayments) {
      try {
        // Проверяем существование заказа
        if (idMap.order[payment.orderId]) {
          const newPayment = await newDb.payment.create({
            data: {
              id: payment.id,
              orderId: idMap.order[payment.orderId],
              amount: payment.amount,
              method: payment.method,
              status: payment.status,
              externalId: payment.externalId,
              createdAt: payment.createdAt,
              updatedAt: payment.updatedAt
            }
          });
          
          idMap.payment[payment.id] = payment.id;
          successCount++;
          
        } else {
          errorCount++;
          logError('Payment', new Error('Заказ не найден'), `id: ${payment.id}, order: ${payment.orderId}`);
        }
        
      } catch (error) {
        errorCount++;
        logError('Payment', error, `id: ${payment.id}, order: ${payment.orderId}`);
      }
    }
    
    logStep('💳 Payments', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.payments = { total: oldPayments.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('Payments Migration', error);
  }
}

async function migrateYandexEdaIntegrations() {
  logStep('🟣 YandexEdaIntegrations', 'Начало миграции интеграций Яндекс.Еды');
  
  try {
    const oldIntegrations = await oldDb.yandexEdaIntegration.findMany();
    logStep('🟣 YandexEdaIntegrations', `Найдено ${oldIntegrations.length} интеграций`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const integration of oldIntegrations) {
      try {
        // Проверяем существование ресторана
        if (idMap.restaurant[integration.restaurantId]) {
          const newIntegration = await newDb.yandexEdaIntegration.create({
            data: {
              id: integration.id,
              restaurantId: idMap.restaurant[integration.restaurantId],
              apiKey: integration.apiKey,
              externalId: integration.externalId,
              isActive: integration.isActive,
              createdAt: integration.createdAt,
              updatedAt: integration.updatedAt
            }
          });
          
          successCount++;
          
        } else {
          errorCount++;
          logError('YandexEdaIntegration', new Error('Ресторан не найден'), 
            `id: ${integration.id}, restaurant: ${integration.restaurantId}`);
        }
        
      } catch (error) {
        errorCount++;
        logError('YandexEdaIntegration', error, `id: ${integration.id}`);
      }
    }
    
    logStep('🟣 YandexEdaIntegrations', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.yandexEdaIntegrations = { total: oldIntegrations.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('YandexEdaIntegrations Migration', error);
  }
}

async function migrateWarehouses() {
  logStep('🏗️ Warehouses', 'Начало миграции складов');
  
  try {
    const oldWarehouses = await oldDb.warehouse.findMany({
      include: {
        storageLocations: true
      }
    });
    
    logStep('🏗️ Warehouses', `Найдено ${oldWarehouses.length} складов`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const warehouse of oldWarehouses) {
      try {
        // Проверяем существование ресторана
        if (idMap.restaurant[warehouse.restaurantId]) {
          const newWarehouse = await newDb.warehouse.create({
            data: {
              id: warehouse.id,
              restaurantId: idMap.restaurant[warehouse.restaurantId],
              name: warehouse.name,
              description: warehouse.description,
              isActive: warehouse.isActive,
              createdAt: warehouse.createdAt,
              updatedAt: warehouse.updatedAt
            }
          });
          
          idMap.warehouse[warehouse.id] = warehouse.id;
          successCount++;
          
          // Сохраняем места хранения
          if (warehouse.storageLocations && warehouse.storageLocations.length > 0) {
            for (const location of warehouse.storageLocations) {
              try {
                const newLocation = await newDb.storageLocation.create({
                  data: {
                    id: location.id,
                    warehouseId: warehouse.id,
                    name: location.name,
                    code: location.code,
                    description: location.description,
                    isActive: location.isActive,
                    createdAt: location.createdAt,
                    updatedAt: location.updatedAt
                  }
                });
                
                idMap.storageLocation[location.id] = location.id;
                
              } catch (error) {
                logError('StorageLocation', error, `warehouse: ${warehouse.id}, location: ${location.id}`);
              }
            }
          }
          
        } else {
          errorCount++;
          logError('Warehouse', new Error('Ресторан не найден'), 
            `id: ${warehouse.id}, restaurant: ${warehouse.restaurantId}`);
        }
        
      } catch (error) {
        errorCount++;
        logError('Warehouse', error, `id: ${warehouse.id}, name: ${warehouse.name}`);
      }
    }
    
    logStep('🏗️ Warehouses', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.warehouses = { total: oldWarehouses.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('Warehouses Migration', error);
  }
}

async function migrateInventoryItems() {
  logStep('📦 InventoryItems', 'Начало миграции инвентарных позиций');
  
  try {
    const oldItems = await oldDb.inventoryItem.findMany({
      include: {
        category: true,
        product: true,
        premix: true
      }
    });
    
    logStep('📦 InventoryItems', `Найдено ${oldItems.length} инвентарных позиций`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const item of oldItems) {
      try {
        const itemData = {
          id: item.id,
          name: item.name,
          description: item.description,
          unit: item.unit,
          cost: item.cost,
          isActive: item.isActive,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        };
        
        // Добавляем связи если есть
        if (item.product && idMap.product[item.product.id]) {
          itemData.productId = idMap.product[item.product.id];
        }
        
        if (item.category && item.category.id) {
          itemData.categoryId = item.category.id;
        }
        
        if (item.premix && item.premix.id) {
          itemData.premixId = item.premix.id;
        }
        
        const newItem = await newDb.inventoryItem.create({
          data: itemData
        });
        
        idMap.inventoryItem[item.id] = item.id;
        successCount++;
        
      } catch (error) {
        errorCount++;
        logError('InventoryItem', error, `id: ${item.id}, name: ${item.name}`);
      }
    }
    
    logStep('📦 InventoryItems', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.inventoryItems = { total: oldItems.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('InventoryItems Migration', error);
  }
}

async function migratePremixes() {
  logStep('🧪 Premixes', 'Начало миграции премиксов');
  
  try {
    const oldPremixes = await oldDb.premix.findMany({
      include: {
        ingredients: true
      }
    });
    
    logStep('🧪 Premixes', `Найдено ${oldPremixes.length} премиксов`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const premix of oldPremixes) {
      try {
        const newPremix = await newDb.premix.create({
          data: {
            id: premix.id,
            name: premix.name,
            description: premix.description,
            unit: premix.unit,
            yield: premix.yield,
            createdAt: premix.createdAt,
            updatedAt: premix.updatedAt
          }
        });
        
        successCount++;
        
        // Сохраняем ингредиенты премикса
        if (premix.ingredients && premix.ingredients.length > 0) {
          for (const ingredient of premix.ingredients) {
            if (idMap.inventoryItem[ingredient.inventoryItemId]) {
              try {
                await newDb.premixIngredient.create({
                  data: {
                    premixId: premix.id,
                    inventoryItemId: idMap.inventoryItem[ingredient.inventoryItemId],
                    quantity: ingredient.quantity
                  }
                });
              } catch (error) {
                logError('PremixIngredient', error, 
                  `premix: ${premix.id}, ingredient: ${ingredient.inventoryItemId}`);
              }
            }
          }
        }
        
      } catch (error) {
        errorCount++;
        logError('Premix', error, `id: ${premix.id}, name: ${premix.name}`);
      }
    }
    
    logStep('🧪 Premixes', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.premixes = { total: oldPremixes.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('Premixes Migration', error);
  }
}

async function migrateWarehouseItems() {
  logStep('📦 WarehouseItems', 'Начало миграции позиций склада');
  
  try {
    const oldWarehouseItems = await oldDb.warehouseItem.findMany({
      include: {
        transactions: true
      }
    });
    
    logStep('📦 WarehouseItems', `Найдено ${oldWarehouseItems.length} позиций склада`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const item of oldWarehouseItems) {
      try {
        // Проверяем существование зависимостей
        const warehouseExists = idMap.warehouse[item.warehouseId];
        const inventoryItemExists = idMap.inventoryItem[item.inventoryItemId];
        const storageLocationExists = !item.storageLocationId || idMap.storageLocation[item.storageLocationId];
        
        if (warehouseExists && inventoryItemExists) {
          const itemData = {
            id: item.id,
            warehouseId: idMap.warehouse[item.warehouseId],
            inventoryItemId: idMap.inventoryItem[item.inventoryItemId],
            quantity: item.quantity,
            reserved: item.reserved,
            minQuantity: item.minQuantity,
            cost: item.cost,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt
          };
          
          if (item.storageLocationId && storageLocationExists) {
            itemData.storageLocationId = idMap.storageLocation[item.storageLocationId];
          }
          
          const newItem = await newDb.warehouseItem.create({
            data: itemData
          });
          
          successCount++;
          
          // Сохраняем транзакции
          if (item.transactions && item.transactions.length > 0) {
            for (const transaction of item.transactions) {
              try {
                await migrateInventoryTransaction(transaction);
              } catch (error) {
                logError('WarehouseItemTransaction', error, 
                  `warehouseItem: ${item.id}, transaction: ${transaction.id}`);
              }
            }
          }
          
        } else {
          errorCount++;
          logError('WarehouseItem', new Error('Зависимые сущности не найдены'),
            `id: ${item.id}, warehouse: ${item.warehouseId}, inventoryItem: ${item.inventoryItemId}`);
        }
        
      } catch (error) {
        errorCount++;
        logError('WarehouseItem', error, `id: ${item.id}`);
      }
    }
    
    logStep('📦 WarehouseItems', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.warehouseItems = { total: oldWarehouseItems.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('WarehouseItems Migration', error);
  }
}

async function migrateInventoryTransaction(transaction) {
  try {
    const transactionData = {
      id: transaction.id,
      inventoryItemId: idMap.inventoryItem[transaction.inventoryItemId],
      type: transaction.type,
      quantity: transaction.quantity,
      previousQuantity: transaction.previousQuantity,
      newQuantity: transaction.newQuantity,
      reason: transaction.reason,
      documentId: transaction.documentId,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt
    };
    
    // Добавляем связи если есть
    if (transaction.warehouseId && idMap.warehouse[transaction.warehouseId]) {
      transactionData.warehouseId = idMap.warehouse[transaction.warehouseId];
    }
    
    if (transaction.warehouseItemId) {
      transactionData.warehouseItemId = transaction.warehouseItemId;
    }
    
    if (transaction.targetWarehouseId && idMap.warehouse[transaction.targetWarehouseId]) {
      transactionData.targetWarehouseId = idMap.warehouse[transaction.targetWarehouseId];
    }
    
    if (transaction.userId && idMap.user[transaction.userId]) {
      transactionData.userId = idMap.user[transaction.userId];
    }
    
    if (transaction.unitCost !== undefined) {
      transactionData.unitCost = transaction.unitCost;
    }
    
    if (transaction.totalCost !== undefined) {
      transactionData.totalCost = transaction.totalCost;
    }
    
    await newDb.inventoryTransaction.create({
      data: transactionData
    });
    
  } catch (error) {
    throw error;
  }
}

async function migrateProductIngredients() {
  logStep('🧂 ProductIngredients', 'Начало миграции ингредиентов продуктов');
  
  try {
    const oldIngredients = await oldDb.productIngredient.findMany();
    logStep('🧂 ProductIngredients', `Найдено ${oldIngredients.length} ингредиентов`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const ingredient of oldIngredients) {
      try {
        // Проверяем существование продукта и инвентарной позиции
        if (idMap.product[ingredient.productId] && idMap.inventoryItem[ingredient.inventoryItemId]) {
          await newDb.productIngredient.create({
            data: {
              productId: idMap.product[ingredient.productId],
              inventoryItemId: idMap.inventoryItem[ingredient.inventoryItemId],
              quantity: ingredient.quantity
            }
          });
          successCount++;
        } else {
          errorCount++;
          logError('ProductIngredient', new Error('Продукт или инвентарная позиция не найдены'),
            `product: ${ingredient.productId}, inventoryItem: ${ingredient.inventoryItemId}`);
        }
        
      } catch (error) {
        errorCount++;
        logError('ProductIngredient', error,
          `product: ${ingredient.productId}, inventoryItem: ${ingredient.inventoryItemId}`);
      }
    }
    
    logStep('🧂 ProductIngredients', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.productIngredients = { total: oldIngredients.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('ProductIngredients Migration', error);
  }
}

async function migrateSurcharges() {
  logStep('💲 Surcharges', 'Начало миграции наценок');
  
  try {
    const oldSurcharges = await oldDb.surcharge.findMany({
      include: {
        restaurants: true
      }
    });
    
    logStep('💲 Surcharges', `Найдено ${oldSurcharges.length} наценок`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const surcharge of oldSurcharges) {
      try {
        const newSurcharge = await newDb.surcharge.create({
          data: {
            id: surcharge.id,
            title: surcharge.title,
            description: surcharge.description,
            type: surcharge.type,
            amount: surcharge.amount,
            orderTypes: surcharge.orderTypes,
            isActive: surcharge.isActive,
            startDate: surcharge.startDate,
            endDate: surcharge.endDate,
            createdAt: surcharge.createdAt,
            updatedAt: surcharge.updatedAt
          }
        });
        
        idMap.surcharge[surcharge.id] = surcharge.id;
        successCount++;
        
        // Сохраняем связи с ресторанами
        if (surcharge.restaurants && surcharge.restaurants.length > 0) {
          for (const restaurantSurcharge of surcharge.restaurants) {
            if (idMap.restaurant[restaurantSurcharge.restaurantId]) {
              try {
                await newDb.restaurantSurcharge.create({
                  data: {
                    surchargeId: surcharge.id,
                    restaurantId: idMap.restaurant[restaurantSurcharge.restaurantId]
                  }
                });
              } catch (error) {
                logError('RestaurantSurcharge', error,
                  `surcharge: ${surcharge.id}, restaurant: ${restaurantSurcharge.restaurantId}`);
              }
            }
          }
        }
        
      } catch (error) {
        errorCount++;
        logError('Surcharge', error, `id: ${surcharge.id}, title: ${surcharge.title}`);
      }
    }
    
    logStep('💲 Surcharges', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.surcharges = { total: oldSurcharges.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('Surcharges Migration', error);
  }
}

async function migrateDiscounts() {
  logStep('🏷️ Discounts', 'Начало миграции скидок');
  
  try {
    const oldDiscounts = await oldDb.discount.findMany({
      include: {
        restaurants: true,
        products: true,
        promocodes: true
      }
    });
    
    logStep('🏷️ Discounts', `Найдено ${oldDiscounts.length} скидок`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const discount of oldDiscounts) {
      try {
        const newDiscount = await newDb.discount.create({
          data: {
            id: discount.id,
            title: discount.title,
            description: discount.description,
            type: discount.type,
            value: discount.value,
            targetType: discount.targetType,
            minOrderAmount: discount.minOrderAmount,
            startDate: discount.startDate,
            endDate: discount.endDate,
            startTime: discount.startTime,
            endTime: discount.endTime,
            isActive: discount.isActive,
            code: discount.code,
            maxUses: discount.maxUses,
            currentUses: discount.currentUses,
            createdAt: discount.createdAt,
            updatedAt: discount.updatedAt
          }
        });
        
        idMap.discount[discount.id] = discount.id;
        successCount++;
        
        // Сохраняем связи с ресторанами
        if (discount.restaurants && discount.restaurants.length > 0) {
          for (const restaurantDiscount of discount.restaurants) {
            if (idMap.restaurant[restaurantDiscount.restaurantId]) {
              try {
                await newDb.restaurantDiscount.create({
                  data: {
                    discountId: discount.id,
                    restaurantId: idMap.restaurant[restaurantDiscount.restaurantId]
                  }
                });
              } catch (error) {
                logError('RestaurantDiscount', error,
                  `discount: ${discount.id}, restaurant: ${restaurantDiscount.restaurantId}`);
              }
            }
          }
        }
        
        // Сохраняем связи с продуктами
        if (discount.products && discount.products.length > 0) {
          for (const productDiscount of discount.products) {
            if (idMap.product[productDiscount.productId]) {
              try {
                await newDb.productDiscount.create({
                  data: {
                    discountId: discount.id,
                    productId: idMap.product[productDiscount.productId]
                  }
                });
              } catch (error) {
                logError('ProductDiscount', error,
                  `discount: ${discount.id}, product: ${productDiscount.productId}`);
              }
            }
          }
        }
        
        // Сохраняем промокоды
        if (discount.promocodes && discount.promocodes.length > 0) {
          for (const promocode of discount.promocodes) {
            if (idMap.customer[promocode.customerId]) {
              try {
                await newDb.promoCode.create({
                  data: {
                    id: promocode.id,
                    code: promocode.code,
                    customerId: idMap.customer[promocode.customerId],
                    discountId: discount.id,
                    used: promocode.used,
                    createdAt: promocode.createdAt
                  }
                });
              } catch (error) {
                logError('PromoCode', error,
                  `discount: ${discount.id}, customer: ${promocode.customerId}, code: ${promocode.code}`);
              }
            }
          }
        }
        
      } catch (error) {
        errorCount++;
        logError('Discount', error, `id: ${discount.id}, title: ${discount.title}`);
      }
    }
    
    logStep('🏷️ Discounts', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.discounts = { total: oldDiscounts.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('Discounts Migration', error);
  }
}

async function migrateDiscountApplications() {
  logStep('📝 DiscountApplications', 'Начало миграции применений скидок');
  
  try {
    const oldApplications = await oldDb.discountApplication.findMany();
    logStep('📝 DiscountApplications', `Найдено ${oldApplications.length} применений скидок`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const application of oldApplications) {
      try {
        // Проверяем существование скидки и заказа
        const discountExists = idMap.discount[application.discountId];
        const orderExists = idMap.order[application.orderId];
        const customerExists = !application.customerId || idMap.customer[application.customerId];
        
        if (discountExists && orderExists && customerExists) {
          const appData = {
            id: application.id,
            discountId: idMap.discount[application.discountId],
            orderId: idMap.order[application.orderId],
            amount: application.amount,
            description: application.description,
            createdAt: application.createdAt
          };
          
          if (application.customerId && idMap.customer[application.customerId]) {
            appData.customerId = idMap.customer[application.customerId];
          }
          
          await newDb.discountApplication.create({
            data: appData
          });
          
          successCount++;
        } else {
          errorCount++;
          logError('DiscountApplication', new Error('Зависимые сущности не найдены'),
            `id: ${application.id}, discount: ${application.discountId}, order: ${application.orderId}`);
        }
        
      } catch (error) {
        errorCount++;
        logError('DiscountApplication', error, `id: ${application.id}`);
      }
    }
    
    logStep('📝 DiscountApplications', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.discountApplications = { total: oldApplications.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('DiscountApplications Migration', error);
  }
}

async function migrateBonusTransactions() {
  logStep('🎫 BonusTransactions', 'Начало миграции бонусных транзакций');
  
  try {
    const oldTransactions = await oldDb.bonusTransaction.findMany();
    logStep('🎫 BonusTransactions', `Найдено ${oldTransactions.length} бонусных транзакций`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const transaction of oldTransactions) {
      try {
        // Проверяем существование клиента и сети
        const customerExists = idMap.customer[transaction.customerId];
        const networkExists = idMap.network[transaction.networkId];
        const orderExists = !transaction.orderId || idMap.order[transaction.orderId];
        
        if (customerExists && networkExists) {
          const transactionData = {
            id: transaction.id,
            customerId: idMap.customer[transaction.customerId],
            networkId: idMap.network[transaction.networkId],
            type: transaction.type,
            amount: transaction.amount,
            description: transaction.description,
            balanceAfter: transaction.balanceAfter,
            createdAt: transaction.createdAt
          };
          
          if (transaction.orderId && orderExists) {
            transactionData.orderId = idMap.order[transaction.orderId];
          }
          
          await newDb.bonusTransaction.create({
            data: transactionData
          });
          
          successCount++;
        } else {
          errorCount++;
          logError('BonusTransaction', new Error('Клиент или сеть не найдены'),
            `id: ${transaction.id}, customer: ${transaction.customerId}, network: ${transaction.networkId}`);
        }
        
      } catch (error) {
        errorCount++;
        logError('BonusTransaction', error, `id: ${transaction.id}`);
      }
    }
    
    logStep('🎫 BonusTransactions', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.bonusTransactions = { total: oldTransactions.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('BonusTransactions Migration', error);
  }
}

async function migratePersonalDiscounts() {
  logStep('👤 PersonalDiscounts', 'Начало миграции персональных скидок');
  
  try {
    const oldDiscounts = await oldDb.personalDiscount.findMany();
    logStep('👤 PersonalDiscounts', `Найдено ${oldDiscounts.length} персональных скидок`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const discount of oldDiscounts) {
      try {
        // Проверяем существование клиента и ресторана
        if (idMap.customer[discount.customerId] && idMap.restaurant[discount.restaurantId]) {
          await newDb.personalDiscount.create({
            data: {
              id: discount.id,
              customerId: idMap.customer[discount.customerId],
              restaurantId: idMap.restaurant[discount.restaurantId],
              discount: discount.discount,
              isActive: discount.isActive,
              createdAt: discount.createdAt,
              updatedAt: discount.updatedAt
            }
          });
          
          successCount++;
        } else {
          errorCount++;
          logError('PersonalDiscount', new Error('Клиент или ресторан не найдены'),
            `id: ${discount.id}, customer: ${discount.customerId}, restaurant: ${discount.restaurantId}`);
        }
        
      } catch (error) {
        errorCount++;
        logError('PersonalDiscount', error, `id: ${discount.id}`);
      }
    }
    
    logStep('👤 PersonalDiscounts', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.personalDiscounts = { total: oldDiscounts.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('PersonalDiscounts Migration', error);
  }
}

async function migrateNetworkTransactions() {
  logStep('💰 NetworkTransactions', 'Начало миграции транзакций сетей');
  
  try {
    const oldTransactions = await oldDb.networkTransaction.findMany();
    logStep('💰 NetworkTransactions', `Найдено ${oldTransactions.length} транзакций сетей`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const transaction of oldTransactions) {
      try {
        // Проверяем существование сети и пользователя
        const networkExists = idMap.network[transaction.networkId];
        const userExists = !transaction.createdById || idMap.user[transaction.createdById];
        
        if (networkExists) {
          const transactionData = {
            id: transaction.id,
            networkId: idMap.network[transaction.networkId],
            type: transaction.type,
            amount: transaction.amount,
            description: transaction.description,
            balanceAfter: transaction.balanceAfter,
            referenceType: transaction.referenceType,
            referenceId: transaction.referenceId,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt
          };
          
          if (transaction.createdById && userExists) {
            transactionData.createdById = idMap.user[transaction.createdById];
          }
          
          await newDb.networkTransaction.create({
            data: transactionData
          });
          
          successCount++;
        } else {
          errorCount++;
          logError('NetworkTransaction', new Error('Сеть не найдена'),
            `id: ${transaction.id}, network: ${transaction.networkId}`);
        }
        
      } catch (error) {
        errorCount++;
        logError('NetworkTransaction', error, `id: ${transaction.id}`);
      }
    }
    
    logStep('💰 NetworkTransactions', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.networkTransactions = { total: oldTransactions.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('NetworkTransactions Migration', error);
  }
}

async function migrateReasons() {
  logStep('📋 Reasons', 'Начало миграции причин');
  
  // Миграция причин списания
  try {
    const oldWriteOffReasons = await oldDb.reasonWriteOff.findMany();
    logStep('📋 ReasonWriteOffs', `Найдено ${oldWriteOffReasons.length} причин списания`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const reason of oldWriteOffReasons) {
      try {
        if (idMap.restaurant[reason.restaurantId]) {
          await newDb.reasonWriteOff.create({
            data: {
              id: reason.id,
              name: reason.name,
              isActive: reason.isActive,
              restaurantId: idMap.restaurant[reason.restaurantId],
              createdAt: reason.createdAt,
              updatedAt: reason.updatedAt
            }
          });
          
          idMap.reason.writeOff[reason.id] = reason.id;
          successCount++;
        } else {
          errorCount++;
          logError('ReasonWriteOff', new Error('Ресторан не найден'),
            `id: ${reason.id}, restaurant: ${reason.restaurantId}`);
        }
      } catch (error) {
        errorCount++;
        logError('ReasonWriteOff', error, `id: ${reason.id}, name: ${reason.name}`);
      }
    }
    
    logStep('📋 ReasonWriteOffs', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.reasonWriteOffs = { total: oldWriteOffReasons.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('ReasonWriteOffs Migration', error);
  }
  
  // Миграция причин поступления
  try {
    const oldReceiptReasons = await oldDb.reasonReceipt.findMany();
    logStep('📋 ReasonReceipts', `Найдено ${oldReceiptReasons.length} причин поступления`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const reason of oldReceiptReasons) {
      try {
        if (idMap.restaurant[reason.restaurantId]) {
          await newDb.reasonReceipt.create({
            data: {
              id: reason.id,
              name: reason.name,
              isActive: reason.isActive,
              restaurantId: idMap.restaurant[reason.restaurantId],
              createdAt: reason.createdAt,
              updatedAt: reason.updatedAt
            }
          });
          
          idMap.reason.receipt[reason.id] = reason.id;
          successCount++;
        } else {
          errorCount++;
          logError('ReasonReceipt', new Error('Ресторан не найден'),
            `id: ${reason.id}, restaurant: ${reason.restaurantId}`);
        }
      } catch (error) {
        errorCount++;
        logError('ReasonReceipt', error, `id: ${reason.id}, name: ${reason.name}`);
      }
    }
    
    logStep('📋 ReasonReceipts', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.reasonReceipts = { total: oldReceiptReasons.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('ReasonReceipts Migration', error);
  }
  
  // Аналогично для остальных типов причин...
  // Здесь можно добавить миграцию для reasonMovement, reasonIncome, reasonExpense
}

async function migratePaymentIntegrations() {
  logStep('💳 PaymentIntegrations', 'Начало миграции платежных интеграций');
  
  try {
    const oldIntegrations = await oldDb.paymentIntegration.findMany();
    logStep('💳 PaymentIntegrations', `Найдено ${oldIntegrations.length} платежных интеграций`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const integration of oldIntegrations) {
      try {
        if (idMap.restaurant[integration.restaurantId]) {
          await newDb.paymentIntegration.create({
            data: {
              id: integration.id,
              name: integration.name,
              provider: integration.provider,
              isActive: integration.isActive,
              isTestMode: integration.isTestMode,
              restaurantId: idMap.restaurant[integration.restaurantId],
              tokenExpiresAt: integration.tokenExpiresAt,
              lastTokenUpdate: integration.lastTokenUpdate,
              yookassaShopId: integration.yookassaShopId,
              yookassaSecretKey: integration.yookassaSecretKey,
              cloudpaymentsPublicId: integration.cloudpaymentsPublicId,
              cloudpaymentsApiSecret: integration.cloudpaymentsApiSecret,
              sberbankLogin: integration.sberbankLogin,
              sberbankPassword: integration.sberbankPassword,
              sberbankToken: integration.sberbankToken,
              sberbankMerchantLogin: integration.sberbankMerchantLogin,
              alfabankLogin: integration.alfabankLogin,
              alfabankPassword: integration.alfabankPassword,
              alfabankToken: integration.alfabankToken,
              alfabankRefreshToken: integration.alfabankRefreshToken,
              alfabankGatewayMerchantId: integration.alfabankGatewayMerchantId,
              alfabankRestApiUrl: integration.alfabankRestApiUrl,
              sbpMerchantId: integration.sbpMerchantId,
              sbpSecretKey: integration.sbpSecretKey,
              sbpBankName: integration.sbpBankName,
              sbpApiUrl: integration.sbpApiUrl,
              sbpQrIssuerId: integration.sbpQrIssuerId,
              tinkoffTerminalKey: integration.tinkoffTerminalKey,
              tinkoffPassword: integration.tinkoffPassword,
              webhookUrl: integration.webhookUrl,
              successUrl: integration.successUrl,
              failUrl: integration.failUrl,
              createdAt: integration.createdAt,
              updatedAt: integration.updatedAt
            }
          });
          
          successCount++;
        } else {
          errorCount++;
          logError('PaymentIntegration', new Error('Ресторан не найден'),
            `id: ${integration.id}, restaurant: ${integration.restaurantId}`);
        }
      } catch (error) {
        errorCount++;
        logError('PaymentIntegration', error, `id: ${integration.id}, name: ${integration.name}`);
      }
    }
    
    logStep('💳 PaymentIntegrations', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.paymentIntegrations = { total: oldIntegrations.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('PaymentIntegrations Migration', error);
  }
}

async function migrateDeliveryZones() {
  logStep('📍 DeliveryZones', 'Начало миграции зон доставки');
  
  try {
    const oldZones = await oldDb.deliveryZone.findMany();
    logStep('📍 DeliveryZones', `Найдено ${oldZones.length} зон доставки`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const zone of oldZones) {
      try {
        if (idMap.restaurant[zone.restaurantId]) {
          await newDb.deliveryZone.create({
            data: {
              id: zone.id,
              title: zone.title,
              price: zone.price,
              minOrder: zone.minOrder,
              polygon: zone.polygon,
              restaurantId: idMap.restaurant[zone.restaurantId],
              color: zone.color,
              priority: zone.priority,
              createdAt: zone.createdAt,
              updatedAt: zone.updatedAt
            }
          });
          
          successCount++;
        } else {
          errorCount++;
          logError('DeliveryZone', new Error('Ресторан не найден'),
            `id: ${zone.id}, restaurant: ${zone.restaurantId}`);
        }
      } catch (error) {
        errorCount++;
        logError('DeliveryZone', error, `id: ${zone.id}, title: ${zone.title}`);
      }
    }
    
    logStep('📍 DeliveryZones', `Завершено: ${successCount} успешно, ${errorCount} ошибок`);
    migrationReport.entities.deliveryZones = { total: oldZones.length, success: successCount, errors: errorCount };
    
  } catch (error) {
    logError('DeliveryZones Migration', error);
  }
}

async function verifyMigration() {
  console.log('\n' + '='.repeat(50));
  console.log('🔍 ПРОВЕРКА МИГРАЦИИ');
  console.log('='.repeat(50));
  
  try {
    // Проверяем количество записей в каждой таблице
    const entities = [
      { name: 'Пользователи', model: newDb.user, oldModel: oldDb.user },
      { name: 'Рестораны', model: newDb.restaurant, oldModel: oldDb.restaurant },
      { name: 'Продукты', model: newDb.product, oldModel: oldDb.product },
      { name: 'Заказы', model: newDb.order, oldModel: oldDb.order },
      { name: 'Клиенты', model: newDb.customer, oldModel: oldDb.customer },
      { name: 'Сети', model: newDb.network, oldModel: oldDb.network },
      { name: 'Тенанты', model: newDb.tenant, oldModel: oldDb.tenant },
      { name: 'Воркшопы', model: newDb.workshop, oldModel: oldDb.workshop },
      { name: 'Категории', model: newDb.category, oldModel: oldDb.category },
      { name: 'Смены', model: newDb.shift, oldModel: oldDb.shift }
    ];
    
    for (const entity of entities) {
      try {
        const newCount = await entity.model.count();
        const oldCount = await entity.oldModel.count();
        
        console.log(`\n${entity.name}:`);
        console.log(`  Старая БД: ${oldCount} записей`);
        console.log(`  Новая БД:  ${newCount} записей`);
        console.log(`  Соответствие: ${((newCount / oldCount) * 100).toFixed(1)}%`);
        
        if (newCount === 0 && oldCount > 0) {
          console.log(`  ⚠️  ВНИМАНИЕ: Данные не были мигрированы!`);
        } else if (newCount < oldCount) {
          console.log(`  ⚠️  ВНИМАНИЕ: Часть данных не была мигрирована`);
        }
      } catch (error) {
        console.log(`\n${entity.name}: Ошибка проверки - ${error.message}`);
      }
    }
    
    // Проверка связей
    console.log('\n🔗 Проверка связей:');
    
    // Проверяем связи ресторанов с продуктами
    const restaurantsWithProducts = await newDb.restaurant.findMany({
      where: {
        products: {
          some: {}
        }
      },
      select: {
        _count: {
          select: { products: true }
        }
      }
    });
    
    console.log(`  Ресторанов с продуктами: ${restaurantsWithProducts.length}`);
    
    // Проверяем заказы с позициями
    const ordersWithItems = await newDb.order.findMany({
      where: {
        items: {
          some: {}
        }
      },
      select: {
        _count: {
          select: { items: true }
        }
      }
    });
    
    console.log(`  Заказов с позициями: ${ordersWithItems.length}`);
    
    // Создаем сводный отчет
    const summaryReport = {
      timestamp: new Date().toISOString(),
      migrationDuration: migrationReport.duration,
      entities: migrationReport.entities,
      errors: migrationReport.errors.length,
      warnings: []
    };
    
    // Сохраняем отчет проверки
    const reportPath = `./reports/verification-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(summaryReport, null, 2));
    console.log(`\n📊 Отчет проверки сохранен: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ Ошибка при проверке миграции:', error.message);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 ПОЛНАЯ МИГРАЦИЯ ВСЕХ ДАННЫХ');
  console.log('='.repeat(60));
  
  migrationReport.startTime = new Date().toISOString();
  
  try {
    // Порядок миграции важен из-за зависимостей между таблицами
    const migrationSteps = [
      // 1. Базовые сущности без зависимостей
      migrateTenants,
      migrateNetworkTariffs,
      migrateWorkshops,
      
      // 2. Основные сущности
      migrateNetworks,
      migrateUsers,
      
      // 3. Сущности ресторанов
      migrateRestaurants,
      migrateCategories,
      migrateAdditives,
      migrateSurcharges,
      migrateDiscounts,
      
      // 4. Продукты и их связи
      migrateProducts,
      migrateRestaurantProductPrices,
      migrateRestaurantProductRelations,
      
      // 5. Клиенты и их данные
      migrateCustomers,
      migratePersonalDiscounts,
      
      // 6. Операционные сущности
      migrateShifts,
      
      // 7. Заказы и связанные данные
      migrateOrders,
      migrateDiscountApplications,
      migrateBonusTransactions,
      
      // 8. Платежи
      migratePayments,
      migratePaymentIntegrations,
      migrateYandexEdaIntegrations,
      
      // 9. Инвентаризация
      migrateInventoryItems,
      migratePremixes,
      migrateWarehouses,
      migrateWarehouseItems,
      migrateProductIngredients,
      
      // 10. Транзакции и финансы
      migrateNetworkTransactions,
      
      // 11. Дополнительные сущности
      migrateReasons,
      migrateDeliveryZones
    ];
    
    for (let i = 0; i < migrationSteps.length; i++) {
      const step = migrationSteps[i];
      console.log(`\n${'='.repeat(50)}`);
      console.log(`Шаг ${i + 1}/${migrationSteps.length}`);
      console.log('='.repeat(50));
      await step();
    }
    
    // Проверка миграции
    await verifyMigration();
    
    // Сохранение отчета
    await saveReport();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 МИГРАЦИЯ ЗАВЕРШЕНА!');
    console.log('='.repeat(60));
    
    // Выводим сводку
    const totalEntities = Object.values(migrationReport.entities).reduce((sum, entity) => {
      return sum + (entity.total || 0);
    }, 0);
    
    const successfulEntities = Object.values(migrationReport.entities).reduce((sum, entity) => {
      return sum + (entity.success || 0);
    }, 0);
    
    const errorEntities = Object.values(migrationReport.entities).reduce((sum, entity) => {
      return sum + (entity.errors || 0);
    }, 0);
    
    console.log('\n📊 СВОДКА:');
    console.log(`  Всего сущностей: ${totalEntities}`);
    console.log(`  Успешно мигрировано: ${successfulEntities}`);
    console.log(`  Ошибок: ${errorEntities}`);
    console.log(`  Успешность: ${((successfulEntities / totalEntities) * 100).toFixed(2)}%`);
    console.log(`  Время выполнения: ${(migrationReport.duration / 1000 / 60).toFixed(2)} минут`);
    
  } catch (error) {
    console.error('❌ Критическая ошибка при миграции:', error);
    logError('Main', error, 'Главный процесс миграции');
    
    // Сохраняем отчет даже при ошибке
    await saveReport();
    
  } finally {
    // Закрываем соединения
    try {
      await oldDb.$disconnect();
      await newDb.$disconnect();
      console.log('\n🔌 Соединения с базами данных закрыты');
    } catch (error) {
      console.error('Ошибка при закрытии соединений:', error);
    }
  }
}

// Обработка ошибок процесса
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Необработанное отклонение промиса:', reason);
  logError('Process', new Error('Unhandled Rejection'), reason.toString());
});

process.on('uncaughtException', (error) => {
  console.error('❌ Непойманное исключение:', error);
  logError('Process', error, 'Uncaught Exception');
  saveReport().finally(() => process.exit(1));
});

// Обработка сигналов завершения
process.on('SIGINT', async () => {
  console.log('\n🛑 Получен сигнал прерывания. Завершение...');
  await saveReport();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Получен сигнал завершения. Завершение...');
  await saveReport();
  process.exit(0);
});

// Запуск миграции
main().catch(error => {
  console.error('❌ Ошибка при запуске миграции:', error);
  process.exit(1);
});