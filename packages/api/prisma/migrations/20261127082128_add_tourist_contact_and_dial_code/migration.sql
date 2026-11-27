-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "customer_country_code" TEXT,
ADD COLUMN     "customer_dial_code" TEXT,
ADD COLUMN     "hotel_or_building_name" TEXT,
ADD COLUMN     "is_whatsapp_available" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preferred_contact_channel" TEXT NOT NULL DEFAULT 'PHONE_CALL',
ADD COLUMN     "room_or_floor_number" TEXT;

-- AlterTable
ALTER TABLE "taste_profiles" ADD COLUMN     "dial_code" TEXT;
