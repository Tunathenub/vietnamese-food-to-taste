-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'STAFF', 'ADMIN');

-- CreateEnum
CREATE TYPE "TasteProfileType" AS ENUM ('COUNTRY', 'REGION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "IngredientRole" AS ENUM ('REQUIRED', 'REMOVABLE', 'OPTIONAL');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID');

-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('DELIVERY', 'PICKUP');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH_ON_DELIVERY', 'CASH_ON_PICKUP', 'MOCK_PAYMENT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "preferred_taste_profile_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taste_profiles" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TasteProfileType" NOT NULL,
    "country_code" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "taste_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taste_attributes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "min_value" INTEGER NOT NULL,
    "max_value" INTEGER NOT NULL,

    CONSTRAINT "taste_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taste_profile_defaults" (
    "taste_profile_id" TEXT NOT NULL,
    "attribute_id" TEXT NOT NULL,
    "default_value" INTEGER NOT NULL,

    CONSTRAINT "taste_profile_defaults_pkey" PRIMARY KEY ("taste_profile_id","attribute_id")
);

-- CreateTable
CREATE TABLE "dishes" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "image_path" TEXT,
    "prep_time_minutes" INTEGER,
    "base_price_minor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dishes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allergens" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "allergens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_allergens" (
    "ingredient_id" TEXT NOT NULL,
    "allergen_id" TEXT NOT NULL,

    CONSTRAINT "ingredient_allergens_pkey" PRIMARY KEY ("ingredient_id","allergen_id")
);

-- CreateTable
CREATE TABLE "dietary_tags" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "dietary_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_dietary_tags" (
    "ingredient_id" TEXT NOT NULL,
    "dietary_tag_id" TEXT NOT NULL,

    CONSTRAINT "ingredient_dietary_tags_pkey" PRIMARY KEY ("ingredient_id","dietary_tag_id")
);

-- CreateTable
CREATE TABLE "dish_ingredients" (
    "id" TEXT NOT NULL,
    "dish_id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "role" "IngredientRole" NOT NULL,
    "default_quantity" DECIMAL(10,2) NOT NULL,
    "min_quantity" DECIMAL(10,2) NOT NULL,
    "max_quantity" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "price_delta_per_step" BIGINT NOT NULL DEFAULT 0,
    "is_quantity_adjustable" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "kitchen_note" TEXT,
    "is_available" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "dish_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dish_taste_configurations" (
    "id" TEXT NOT NULL,
    "dish_id" TEXT NOT NULL,
    "attribute_id" TEXT NOT NULL,
    "base_value" INTEGER NOT NULL,
    "min_value" INTEGER NOT NULL,
    "max_value" INTEGER NOT NULL,
    "is_adjustable" BOOLEAN NOT NULL DEFAULT true,
    "customer_description" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "dish_taste_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dish_taste_options" (
    "id" TEXT NOT NULL,
    "dish_taste_config_id" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "customer_label" TEXT NOT NULL,
    "customer_description" TEXT,
    "kitchen_instruction" TEXT NOT NULL,
    "price_delta" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "dish_taste_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dish_ingredient_substitutions" (
    "id" TEXT NOT NULL,
    "dish_id" TEXT NOT NULL,
    "original_ingredient_id" TEXT NOT NULL,
    "substitute_ingredient_id" TEXT NOT NULL,
    "reason" TEXT,
    "price_delta" BIGINT NOT NULL DEFAULT 0,
    "kitchen_instruction" TEXT NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "dish_ingredient_substitutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "idempotency_request_hash" TEXT,
    "user_id" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "fulfillment_type" "FulfillmentType" NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "payment_method" "PaymentMethod" NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT,
    "customer_phone_hash" TEXT NOT NULL,
    "delivery_address" TEXT,
    "customer_notes" TEXT,
    "subtotal" BIGINT NOT NULL,
    "customization_total" BIGINT NOT NULL DEFAULT 0,
    "delivery_fee" BIGINT NOT NULL DEFAULT 0,
    "discount_total" BIGINT NOT NULL DEFAULT 0,
    "total" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "from_status" "OrderStatus" NOT NULL,
    "to_status" "OrderStatus" NOT NULL,
    "actor" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "dish_id" TEXT,
    "dish_name_snapshot" TEXT NOT NULL,
    "dish_slug_snapshot" TEXT NOT NULL,
    "dish_category_snapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "base_price_snapshot" BIGINT NOT NULL,
    "customization_price" BIGINT NOT NULL DEFAULT 0,
    "final_unit_price" BIGINT NOT NULL,
    "line_total" BIGINT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_taste_customizations" (
    "id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "attribute_code_snapshot" TEXT NOT NULL,
    "attribute_name_snapshot" TEXT NOT NULL,
    "selected_value" INTEGER NOT NULL,
    "customer_label_snapshot" TEXT NOT NULL,
    "kitchen_instruction_snapshot" TEXT NOT NULL,
    "price_delta_snapshot" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "order_item_taste_customizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_ingredient_customizations" (
    "id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "ingredient_id" TEXT,
    "ingredient_name_snapshot" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "selected_quantity" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "price_delta_snapshot" BIGINT NOT NULL DEFAULT 0,
    "kitchen_instruction_snapshot" TEXT,

    CONSTRAINT "order_item_ingredient_customizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_substitutions" (
    "id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "original_ingredient_id" TEXT,
    "original_ingredient_name_snapshot" TEXT NOT NULL,
    "substitute_ingredient_name_snapshot" TEXT NOT NULL,
    "price_delta_snapshot" BIGINT NOT NULL DEFAULT 0,
    "kitchen_instruction_snapshot" TEXT NOT NULL,

    CONSTRAINT "order_item_substitutions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "taste_profiles_code_key" ON "taste_profiles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "taste_attributes_code_key" ON "taste_attributes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "dishes_slug_key" ON "dishes"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_code_key" ON "ingredients"("code");

-- CreateIndex
CREATE UNIQUE INDEX "allergens_code_key" ON "allergens"("code");

-- CreateIndex
CREATE UNIQUE INDEX "dietary_tags_code_key" ON "dietary_tags"("code");

-- CreateIndex
CREATE UNIQUE INDEX "dish_ingredients_dish_id_ingredient_id_key" ON "dish_ingredients"("dish_id", "ingredient_id");

-- CreateIndex
CREATE UNIQUE INDEX "dish_taste_configurations_dish_id_attribute_id_key" ON "dish_taste_configurations"("dish_id", "attribute_id");

-- CreateIndex
CREATE UNIQUE INDEX "dish_taste_options_dish_taste_config_id_value_key" ON "dish_taste_options"("dish_taste_config_id", "value");

-- CreateIndex
CREATE UNIQUE INDEX "dish_ingredient_substitutions_dish_id_original_ingredient_i_key" ON "dish_ingredient_substitutions"("dish_id", "original_ingredient_id", "substitute_ingredient_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "order_item_taste_customizations_order_item_id_attribute_cod_key" ON "order_item_taste_customizations"("order_item_id", "attribute_code_snapshot");

-- CreateIndex
CREATE UNIQUE INDEX "order_item_ingredient_customizations_order_item_id_ingredie_key" ON "order_item_ingredient_customizations"("order_item_id", "ingredient_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_item_substitutions_order_item_id_original_ingredient__key" ON "order_item_substitutions"("order_item_id", "original_ingredient_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_preferred_taste_profile_id_fkey" FOREIGN KEY ("preferred_taste_profile_id") REFERENCES "taste_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taste_profile_defaults" ADD CONSTRAINT "taste_profile_defaults_taste_profile_id_fkey" FOREIGN KEY ("taste_profile_id") REFERENCES "taste_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taste_profile_defaults" ADD CONSTRAINT "taste_profile_defaults_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "taste_attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_allergens" ADD CONSTRAINT "ingredient_allergens_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_allergens" ADD CONSTRAINT "ingredient_allergens_allergen_id_fkey" FOREIGN KEY ("allergen_id") REFERENCES "allergens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_dietary_tags" ADD CONSTRAINT "ingredient_dietary_tags_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_dietary_tags" ADD CONSTRAINT "ingredient_dietary_tags_dietary_tag_id_fkey" FOREIGN KEY ("dietary_tag_id") REFERENCES "dietary_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_ingredients" ADD CONSTRAINT "dish_ingredients_dish_id_fkey" FOREIGN KEY ("dish_id") REFERENCES "dishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_ingredients" ADD CONSTRAINT "dish_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_taste_configurations" ADD CONSTRAINT "dish_taste_configurations_dish_id_fkey" FOREIGN KEY ("dish_id") REFERENCES "dishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_taste_configurations" ADD CONSTRAINT "dish_taste_configurations_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "taste_attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_taste_options" ADD CONSTRAINT "dish_taste_options_dish_taste_config_id_fkey" FOREIGN KEY ("dish_taste_config_id") REFERENCES "dish_taste_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_ingredient_substitutions" ADD CONSTRAINT "dish_ingredient_substitutions_dish_id_fkey" FOREIGN KEY ("dish_id") REFERENCES "dishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_ingredient_substitutions" ADD CONSTRAINT "dish_ingredient_substitutions_original_ingredient_id_fkey" FOREIGN KEY ("original_ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_ingredient_substitutions" ADD CONSTRAINT "dish_ingredient_substitutions_substitute_ingredient_id_fkey" FOREIGN KEY ("substitute_ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_dish_id_fkey" FOREIGN KEY ("dish_id") REFERENCES "dishes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_taste_customizations" ADD CONSTRAINT "order_item_taste_customizations_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_ingredient_customizations" ADD CONSTRAINT "order_item_ingredient_customizations_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_substitutions" ADD CONSTRAINT "order_item_substitutions_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
