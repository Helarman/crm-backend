// migrate-restaurant-products.js
const { PrismaClient: PrismaClientPackage } = require('@prisma/client');

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
  restaurant: {},
  product: {}
};

async function loadIdMaps() {
  console.log('📋 Загрузка соответствий ID...');
  
  try {
    // Загружаем рестораны
    const restaurants = await newDb.restaurant.findMany({
      select: { id: true, title: true }
    });
    
    const oldRestaurants = await oldDb.restaurant.findMany({
      select: { id: true, title: true }
    });
    
    for (const restaurant of oldRestaurants) {
      // Ищем ресторан в новой базе (предполагаем те же ID)
      const exists = restaurants.find(r => r.id === restaurant.id);
      if (exists) {
        idMap.restaurant[restaurant.id] = restaurant.id;
      }
    }
    
    console.log(`   ✅ Загружено ${Object.keys(idMap.restaurant).length} ресторанов`);
    
    // Загружаем продукты
    const products = await newDb.product.findMany({
      select: { id: true, title: true }
    });
    
    const oldProducts = await oldDb.product.findMany({
      select: { id: true, title: true }
    });
    
    for (const product of oldProducts) {
      // Ищем продукт в новой базе (предполагаем те же ID)
      const exists = products.find(p => p.id === product.id);
      if (exists) {
        idMap.product[product.id] = product.id;
      }
    }
    
    console.log(`   ✅ Загружено ${Object.keys(idMap.product).length} продуктов`);
    
    return {
      restaurants: Object.keys(idMap.restaurant).length,
      products: Object.keys(idMap.product).length
    };
    
  } catch (error) {
    console.log('❌ Ошибка при загрузке ID:', error.message);
    return null;
  }
}

async function getRestaurantProductsFromOldDB() {
  console.log('📋 Получение данных о связях из старой базы...');
  
  try {
    // Способ 1: Получаем рестораны с их продуктами
    const restaurantsWithProducts = await oldDb.restaurant.findMany({
      select: {
        id: true,
        title: true,
        products: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });
    
    console.log(`   📊 Найдено ${restaurantsWithProducts.length} ресторанов с продуктами`);
    
    // Подсчитываем общее количество связей
    let totalRelations = 0;
    restaurantsWithProducts.forEach(r => {
      totalRelations += r.products.length;
    });
    
    console.log(`   📊 Всего связей: ${totalRelations}`);
    
    return {
      restaurantsWithProducts,
      totalRelations
    };
    
  } catch (error) {
    console.log('❌ Ошибка при получении данных:', error.message);
    
    // Если первый способ не работает, пробуем получить продукты с ресторанами
    try {
      const productsWithRestaurants = await oldDb.product.findMany({
        select: {
          id: true,
          title: true,
          restaurants: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });
      
      console.log(`   📊 Найдено ${productsWithRestaurants.length} продуктов с ресторанами`);
      
      let totalRelations = 0;
      productsWithRestaurants.forEach(p => {
        totalRelations += p.restaurants.length;
      });
      
      console.log(`   📊 Всего связей: ${totalRelations}`);
      
      return {
        productsWithRestaurants,
        totalRelations
      };
      
    } catch (error2) {
      console.log('❌ Второй способ также не сработал:', error2.message);
      return null;
    }
  }
}

async function clearExistingRestaurantProductRelations() {
  console.log('🧹 Очистка существующих связей рестораны-продукты...');
  
  try {
    // В Prisma связь many-to-many реализована через скрытую таблицу
    // Нужно очистить связи через обновление ресторанов
    
    // Получаем все рестораны с продуктами
    const restaurantsWithProducts = await newDb.restaurant.findMany({
      include: {
        products: {
          select: { id: true }
        }
      }
    });
    
    let clearedCount = 0;
    
    for (const restaurant of restaurantsWithProducts) {
      if (restaurant.products.length > 0) {
        try {
          // Удаляем все связи с продуктами
          await newDb.restaurant.update({
            where: { id: restaurant.id },
            data: {
              products: {
                set: [] // Очищаем все связи
              }
            }
          });
          clearedCount++;
        } catch (error) {
          console.log(`   ⚠️  Ошибка при очистке связей для ресторана ${restaurant.id}: ${error.message}`);
        }
      }
    }
    
    console.log(`   ✅ Очищены связи у ${clearedCount} ресторанов`);
    
    // Также очищаем связи со стороны продуктов
    const productsWithRestaurants = await newDb.product.findMany({
      include: {
        restaurants: {
          select: { id: true }
        }
      }
    });
    
    clearedCount = 0;
    
    for (const product of productsWithRestaurants) {
      if (product.restaurants.length > 0) {
        try {
          // Удаляем все связи с ресторанами
          await newDb.product.update({
            where: { id: product.id },
            data: {
              restaurants: {
                set: [] // Очищаем все связи
              }
            }
          });
          clearedCount++;
        } catch (error) {
          console.log(`   ⚠️  Ошибка при очистке связей для продукта ${product.id}: ${error.message}`);
        }
      }
    }
    
    console.log(`   ✅ Очищены связи у ${clearedCount} продуктов`);
    
  } catch (error) {
    console.log('❌ Ошибка при очистке связей:', error.message);
  }
}

async function migrateRestaurantProductRelations() {
  console.log('🚀 Начало миграции связей рестораны-продукты...');
  
  try {
    // 1. Получаем данные о связях
    const data = await getRestaurantProductsFromOldDB();
    if (!data) {
      throw new Error('Не удалось получить данные о связях');
    }
    
    const { restaurantsWithProducts, totalRelations } = data;
    
    // 2. Мигрируем связи
    console.log('\n🔄 Миграция связей...');
    
    let migratedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < restaurantsWithProducts.length; i++) {
      const restaurant = restaurantsWithProducts[i];
      
      // Проверяем, что ресторан существует в новой базе
      if (!idMap.restaurant[restaurant.id]) {
        console.log(`   ⚠️  Ресторан ${restaurant.title} (${restaurant.id}) не найден в новой базе`);
        skippedCount += restaurant.products.length;
        continue;
      }
      
      // Собираем ID продуктов, которые существуют в новой базе
      const productIds = [];
      for (const product of restaurant.products) {
        if (idMap.product[product.id]) {
          productIds.push(idMap.product[product.id]);
        } else {
          console.log(`      ⚠️  Продукт ${product.title} (${product.id}) не найден`);
          skippedCount++;
        }
      }
      
      // Если есть продукты для связи
      if (productIds.length > 0) {
        try {
          // Обновляем ресторан, добавляя связи с продуктами
          await newDb.restaurant.update({
            where: { id: idMap.restaurant[restaurant.id] },
            data: {
              products: {
                connect: productIds.map(id => ({ id }))
              }
            }
          });
          
          migratedCount += productIds.length;
          
          // Прогресс
          if ((i + 1) % 10 === 0 || i === restaurantsWithProducts.length - 1) {
            console.log(`   📊 Обработано ${i + 1} из ${restaurantsWithProducts.length} ресторанов`);
          }
          
        } catch (error) {
          errorCount += productIds.length;
          console.log(`   ❌ Ошибка при обновлении ресторана ${restaurant.title}: ${error.message}`);
          
          // Если ошибка из-за дубликатов, пробуем другой подход
          if (error.message.includes('Unique constraint') || error.code === 'P2002') {
            console.log(`   ⚠️  Проблема с дубликатами для ресторана ${restaurant.id}`);
          }
        }
      }
    }
    
    console.log(`\n📊 Итоги миграции:`);
    console.log(`   ✅ Успешно мигрировано связей: ${migratedCount}`);
    console.log(`   ❌ Ошибок: ${errorCount}`);
    console.log(`   ⚠️  Пропущено: ${skippedCount}`);
    console.log(`   📈 Всего связей в исходных данных: ${totalRelations}`);
    console.log(`   📈 Процент успеха: ${((migratedCount / totalRelations) * 100).toFixed(1)}%`);
    
    return {
      migratedCount,
      errorCount,
      skippedCount,
      totalRelations
    };
    
  } catch (error) {
    console.log('❌ Ошибка при миграции связей:', error.message);
    return null;
  }
}

async function verifyMigration() {
  console.log('\n🔍 Проверка миграции...');
  
  try {
    // 1. Проверяем, сколько ресторанов получили продукты
    const restaurantsWithProducts = await newDb.restaurant.findMany({
      where: {
        products: {
          some: {}
        }
      },
      select: { 
        id: true,
        title: true,
        _count: {
          select: { products: true }
        }
      }
    });
    
    console.log(`   📊 Ресторанов с продуктами: ${restaurantsWithProducts.length}`);
    
    // 2. Проверяем, сколько продуктов получили рестораны
    const productsWithRestaurants = await newDb.product.findMany({
      where: {
        restaurants: {
          some: {}
        }
      },
      select: { 
        id: true,
        title: true,
        _count: {
          select: { restaurants: true }
        }
      }
    });
    
    console.log(`   📊 Продуктов с ресторанами: ${productsWithRestaurants.length}`);
    
    // 3. Топ ресторанов по количеству продуктов
    const topRestaurants = [...restaurantsWithProducts]
      .sort((a, b) => b._count.products - a._count.products)
      .slice(0, 5);
    
    console.log('\n   🏆 Топ ресторанов по количеству продуктов:');
    topRestaurants.forEach((restaurant, index) => {
      console.log(`      ${index + 1}. ${restaurant.title}: ${restaurant._count.products} продуктов`);
    });
    
    // 4. Топ продуктов по количеству ресторанов
    const topProducts = [...productsWithRestaurants]
      .sort((a, b) => b._count.restaurants - a._count.restaurants)
      .slice(0, 5);
    
    console.log('\n   🏆 Топ продуктов по количеству ресторанов:');
    topProducts.forEach((product, index) => {
      console.log(`      ${index + 1}. ${product.title}: ${product._count.restaurants} ресторанов`);
    });
    
    // 5. Распределение продуктов по ресторанам
    const distribution = {};
    restaurantsWithProducts.forEach(r => {
      const count = r._count.products;
      distribution[count] = (distribution[count] || 0) + 1;
    });
    
    console.log('\n   📊 Распределение продуктов по ресторанам:');
    Object.keys(distribution)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .forEach(count => {
        const percentage = ((distribution[count] / restaurantsWithProducts.length) * 100).toFixed(1);
        console.log(`      ${count} продуктов: ${distribution[count]} ресторанов (${percentage}%)`);
      });
    
  } catch (error) {
    console.log(`   ⚠️  Ошибка при проверке: ${error.message}`);
  }
}

async function checkForOrphanedRelations() {
  console.log('\n🔍 Поиск проблемных связей...');
  
  try {
    // Используем прямой SQL запрос для проверки скрытой таблицы many-to-many
    const orphanedRelations = await newDb.$queryRaw`
      -- Проверяем связи, где ресторан или продукт не существуют
      SELECT 
        CASE 
          WHEN r.id IS NULL THEN 'RESTAURANT_NOT_FOUND'
          WHEN p.id IS NULL THEN 'PRODUCT_NOT_FOUND'
        END as issue_type,
        COUNT(*) as count
      FROM _RestaurantToProduct rp
      LEFT JOIN restaurant r ON rp.A = r.id
      LEFT JOIN product p ON rp.B = p.id
      WHERE r.id IS NULL OR p.id IS NULL
      GROUP BY issue_type;
    `;
    
    if (orphanedRelations.length === 0) {
      console.log('   ✅ Проблемных связей не найдено');
      return;
    }
    
    console.log('   ⚠️  Найдены проблемные связи:');
    orphanedRelations.forEach(row => {
      console.log(`      ${row.issue_type}: ${row.count} связей`);
    });
    
    // Рекомендуем очистить проблемные связи
    console.log('\n   🛠️  Рекомендуемые действия:');
    
    if (orphanedRelations.find(r => r.issue_type === 'RESTAURANT_NOT_FOUND')) {
      console.log('      Удалить связи с несуществующими ресторанами');
      const deleted = await newDb.$executeRaw`
        DELETE FROM _RestaurantToProduct rp
        WHERE NOT EXISTS (
          SELECT 1 FROM restaurant r WHERE r.id = rp.A
        );
      `;
      console.log(`      ✅ Удалено ${deleted} связей`);
    }
    
    if (orphanedRelations.find(r => r.issue_type === 'PRODUCT_NOT_FOUND')) {
      console.log('      Удалить связи с несуществующими продуктами');
      const deleted = await newDb.$executeRaw`
        DELETE FROM _RestaurantToProduct rp
        WHERE NOT EXISTS (
          SELECT 1 FROM product p WHERE p.id = rp.B
        );
      `;
      console.log(`      ✅ Удалено ${deleted} связей`);
    }
    
  } catch (error) {
    console.log(`   ⚠️  Ошибка при проверке связей: ${error.message}`);
  }
}

async function generateReport() {
  console.log('\n📊 Генерация отчета...');
  
  try {
    // Получаем статистику
    const restaurantsStats = await newDb.restaurant.findMany({
      include: {
        products: {
          select: { id: true }
        }
      }
    });
    
    const productsStats = await newDb.product.findMany({
      include: {
        restaurants: {
          select: { id: true }
        }
      }
    });
    
    // Анализируем данные
    const restaurantsWithProducts = restaurantsStats.filter(r => r.products.length > 0);
    const restaurantsWithoutProducts = restaurantsStats.filter(r => r.products.length === 0);
    
    const productsWithRestaurants = productsStats.filter(p => p.restaurants.length > 0);
    const productsWithoutRestaurants = productsStats.filter(p => p.restaurants.length === 0);
    
    // Распределение
    const productDistribution = {};
    restaurantsStats.forEach(r => {
      const count = r.products.length;
      productDistribution[count] = (productDistribution[count] || 0) + 1;
    });
    
    const restaurantDistribution = {};
    productsStats.forEach(p => {
      const count = p.restaurants.length;
      restaurantDistribution[count] = (restaurantDistribution[count] || 0) + 1;
    });
    
    // Создаем отчет
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalRestaurants: restaurantsStats.length,
        restaurantsWithProducts: restaurantsWithProducts.length,
        restaurantsWithoutProducts: restaurantsWithoutProducts.length,
        totalProducts: productsStats.length,
        productsWithRestaurants: productsWithRestaurants.length,
        productsWithoutRestaurants: productsWithoutRestaurants.length
      },
      distribution: {
        productsPerRestaurant: productDistribution,
        restaurantsPerProduct: restaurantDistribution
      },
      topRestaurants: restaurantsWithProducts
        .sort((a, b) => b.products.length - a.products.length)
        .slice(0, 10)
        .map(r => ({
          id: r.id,
          productsCount: r.products.length
        })),
      topProducts: productsWithRestaurants
        .sort((a, b) => b.restaurants.length - a.restaurants.length)
        .slice(0, 10)
        .map(p => ({
          id: p.id,
          restaurantsCount: p.restaurants.length
        }))
    };
    
    // Сохраняем отчет
    const fs = require('fs');
    fs.writeFileSync(
      'restaurant-products-report.json',
      JSON.stringify(report, null, 2)
    );
    
    console.log('   ✅ Отчет сохранен в restaurant-products-report.json');
    
    // Выводим краткую статистику
    console.log('\n📈 СТАТИСТИКА:');
    console.log(`\n   🏪 РЕСТОРАНЫ:`);
    console.log(`      Всего: ${restaurantsStats.length}`);
    console.log(`      С продуктами: ${restaurantsWithProducts.length} (${((restaurantsWithProducts.length / restaurantsStats.length) * 100).toFixed(1)}%)`);
    console.log(`      Без продуктов: ${restaurantsWithoutProducts.length} (${((restaurantsWithoutProducts.length / restaurantsStats.length) * 100).toFixed(1)}%)`);
    
    console.log(`\n   🍽️  ПРОДУКТЫ:`);
    console.log(`      Всего: ${productsStats.length}`);
    console.log(`      С ресторанами: ${productsWithRestaurants.length} (${((productsWithRestaurants.length / productsStats.length) * 100).toFixed(1)}%)`);
    console.log(`      Без ресторанов: ${productsWithoutRestaurants.length} (${((productsWithoutRestaurants.length / productsStats.length) * 100).toFixed(1)}%)`);
    
  } catch (error) {
    console.log(`   ❌ Ошибка при генерации отчета: ${error.message}`);
  }
}

async function main() {
  console.log('========================================');
  console.log('   MIGRATION: RESTAURANT - PRODUCTS     ');
  console.log('========================================\n');
  
  try {
    // 1. Загружаем ID
    console.log('📥 Загрузка данных...');
    const stats = await loadIdMaps();
    if (!stats) {
      throw new Error('Не удалось загрузить ID');
    }
    
    console.log(`\n📊 Загружено:`);
    console.log(`   Рестораны: ${stats.restaurants}`);
    console.log(`   Продукты: ${stats.products}`);
    
    // 2. Очищаем существующие связи
    console.log('\n🧹 Очистка...');
    await clearExistingRestaurantProductRelations();
    
    // 3. Мигрируем связи
    console.log('\n🚀 Миграция...');
    const migrationStats = await migrateRestaurantProductRelations();
    if (!migrationStats) {
      throw new Error('Не удалось мигрировать связи');
    }
    
    // 4. Проверяем миграцию
    console.log('\n🔍 Проверка...');
    await verifyMigration();
    
    // 5. Проверяем проблемные связи
    await checkForOrphanedRelations();
    
    // 6. Генерируем отчет
    console.log('\n📊 Отчет...');
    await generateReport();
    
    console.log('\n🎉 МИГРАЦИЯ ЗАВЕРШЕНА УСПЕШНО!');
    console.log('========================================');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    console.log('🔄 Завершение работы...');
  } finally {
    // Закрываем соединения
    await oldDb.$disconnect().catch(() => {});
    await newDb.$disconnect().catch(() => {});
  }
}

// Обработка ошибок
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Необработанное отклонение промиса:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Непойманное исключение:', error);
  process.exit(1);
});

// Запуск
main().catch(error => {
  console.error('❌ Ошибка при запуске:', error);
  process.exit(1);
});