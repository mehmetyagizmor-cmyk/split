/**
 * Development seed script.
 * Çalıştırmak için: npm run db:seed
 *
 * Tekrar tekrar çalıştırılabilir olması için önce demo restoranı (varsa)
 * siler, sonra sıfırdan oluşturur — geliştirme sırasında rahatça sıfırlayabilirsin.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function deleteExistingDemoData(restaurantId: string) {
  // Restaurant'a bağlı foreign key'ler ON DELETE RESTRICT olduğu için,
  // Restaurant'ı silebilmeden önce alt kayıtları en "yapraktan" başlayıp
  // doğru sırayla silmemiz gerekiyor. Tek bir transaction içinde yapıyoruz
  // ki yarıda kesilirse veritabanı tutarsız bir ara durumda kalmasın.
  await prisma.$transaction([
    prisma.sharedItemParticipant.deleteMany({
      where: { orderItem: { order: { restaurantId } } },
    }),
    prisma.payment.deleteMany({ where: { restaurantId } }),
    prisma.orderItem.deleteMany({ where: { order: { restaurantId } } }),
    prisma.order.deleteMany({ where: { restaurantId } }),
    prisma.customerSession.deleteMany({ where: { restaurantId } }),
    prisma.bill.deleteMany({ where: { restaurantId } }),
    prisma.menuItem.deleteMany({ where: { restaurantId } }),
    prisma.menuCategory.deleteMany({ where: { restaurantId } }),
    prisma.table.deleteMany({ where: { restaurantId } }),
    prisma.user.deleteMany({ where: { restaurantId } }),
    prisma.restaurant.delete({ where: { id: restaurantId } }),
  ]);
}

async function main() {
  const existing = await prisma.restaurant.findFirst({
    where: { name: "Demo Cafe" },
  });
  if (existing) {
    await deleteExistingDemoData(existing.id);
    console.log("🗑️  Eski 'Demo Cafe' verisi silindi.");
  }

  const restaurant = await prisma.restaurant.create({
    data: { name: "Demo Cafe" },
  });

  await prisma.table.createMany({
    data: [1, 2, 3, 4, 5].map((n) => ({
      restaurantId: restaurant.id,
      label: `Masa ${n}`,
    })),
  });

  // Staff/admin login testi için demo kullanıcılar. Şifreler sadece local
  // geliştirme verisi — production seed'i asla bu dosyadan çalıştırılmaz.
  const adminPasswordHash = await hashPassword("admin123");
  const staffPasswordHash = await hashPassword("staff123");

  await prisma.user.createMany({
    data: [
      {
        restaurantId: restaurant.id,
        email: "admin@demo-cafe.com",
        passwordHash: adminPasswordHash,
        name: "Demo Admin",
        role: "ADMIN",
      },
      {
        restaurantId: restaurant.id,
        email: "staff@demo-cafe.com",
        passwordHash: staffPasswordHash,
        name: "Demo Garson",
        role: "STAFF",
      },
    ],
  });

  const categories: { name: string; sortOrder: number; items: { name: string; price: string }[] }[] = [
    {
      name: "Kahvaltı",
      sortOrder: 1,
      items: [
        { name: "Serpme Kahvaltı", price: "450.00" },
        { name: "Menemen", price: "180.00" },
      ],
    },
    {
      name: "Başlangıçlar",
      sortOrder: 2,
      items: [
        { name: "Patates Kızartması", price: "200.00" },
        { name: "Mozzarella Stick", price: "220.00" },
      ],
    },
    {
      name: "Ana Yemek",
      sortOrder: 3,
      items: [
        { name: "Steak", price: "650.00" },
        { name: "Izgara Somon", price: "580.00" },
        { name: "Makarna", price: "280.00" },
      ],
    },
    {
      name: "Burger",
      sortOrder: 4,
      items: [
        { name: "Cheeseburger", price: "320.00" },
        { name: "Double Burger", price: "420.00" },
      ],
    },
    {
      name: "Pizza",
      sortOrder: 5,
      items: [
        { name: "Margherita Pizza", price: "300.00" },
        { name: "Karışık Pizza", price: "360.00" },
      ],
    },
    {
      name: "Tatlı",
      sortOrder: 6,
      items: [
        { name: "Cheesecake", price: "180.00" },
        { name: "Brownie", price: "160.00" },
      ],
    },
    {
      name: "İçecek",
      sortOrder: 7,
      items: [
        { name: "Cola", price: "80.00" },
        { name: "Su", price: "30.00" },
        { name: "Ayran", price: "50.00" },
      ],
    },
    {
      name: "Kahve",
      sortOrder: 8,
      items: [
        { name: "Türk Kahvesi", price: "100.00" },
        { name: "Latte", price: "120.00" },
        { name: "Americano", price: "100.00" },
      ],
    },
  ];

  for (const category of categories) {
    const createdCategory = await prisma.menuCategory.create({
      data: {
        restaurantId: restaurant.id,
        name: category.name,
        sortOrder: category.sortOrder,
      },
    });

    await prisma.menuItem.createMany({
      data: category.items.map((item) => ({
        restaurantId: restaurant.id,
        categoryId: createdCategory.id,
        name: item.name,
        price: item.price,
      })),
    });
  }

  const itemCount = await prisma.menuItem.count({
    where: { restaurantId: restaurant.id },
  });

  console.log("✅ Seed tamamlandı:");
  console.log(`   Restoran: ${restaurant.name} (${restaurant.id})`);
  console.log(`   5 masa, ${categories.length} kategori, ${itemCount} ürün oluşturuldu.`);
  console.log("   Demo giriş bilgileri:");
  console.log("     Admin → admin@demo-cafe.com / admin123");
  console.log("     Staff → staff@demo-cafe.com / staff123");
}

main()
  .catch((error) => {
    console.error("❌ Seed hata verdi:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
