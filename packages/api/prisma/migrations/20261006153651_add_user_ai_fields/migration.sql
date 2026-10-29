-- AlterTable
ALTER TABLE "users" ADD COLUMN     "dietary_restrictions" TEXT,
ADD COLUMN     "name" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "password_hash" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "taste_preferences" TEXT;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
