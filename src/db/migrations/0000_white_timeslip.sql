CREATE TYPE "public"."alteration_status" AS ENUM('RECEIVED', 'ASSIGNED', 'IN_PROGRESS', 'READY', 'DELIVERED');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY');--> statement-breakpoint
CREATE TYPE "public"."bridal_outfit_status" AS ENUM('SELECTION', 'MEASUREMENT', 'STITCHING', 'EMBROIDERY', 'TRIAL', 'READY', 'DELIVERED');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('MEN', 'WOMEN', 'KIDS', 'UNISEX');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('WHATSAPP', 'SMS', 'EMAIL');--> statement-breakpoint
CREATE TYPE "public"."notification_event" AS ENUM('ORDER_READY', 'BRIDAL_TRIAL', 'DELIVERY_REMINDER', 'LOW_STOCK', 'PURCHASE_ORDER', 'BIRTHDAY_OFFER', 'ALTERATION_READY');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('PENDING', 'SENT', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('CASH', 'CARD', 'UPI', 'GIFT_CARD', 'STORE_CREDIT', 'BANK_TRANSFER');--> statement-breakpoint
CREATE TYPE "public"."purchase_order_status" AS ENUM('DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'SALES_STAFF', 'INVENTORY_MANAGER');--> statement-breakpoint
CREATE TYPE "public"."sale_status" AS ENUM('COMPLETED', 'RETURNED', 'PARTIALLY_RETURNED', 'EXCHANGED', 'VOID');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('PURCHASE_IN', 'SALE_OUT', 'RETURN_IN', 'EXCHANGE_IN', 'EXCHANGE_OUT', 'DAMAGE_OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT');--> statement-breakpoint
CREATE TABLE "store" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"address" text,
	"city" text,
	"state" text,
	"pincode" text,
	"phone" text,
	"email" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "store_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "store_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"gstin" text,
	"default_gst_rate" numeric(5, 2) DEFAULT '5.00' NOT NULL,
	"invoice_prefix" text DEFAULT 'INV' NOT NULL,
	"invoice_next_number" numeric(12, 0) DEFAULT '1' NOT NULL,
	"invoice_footer_note" text,
	"invoice_logo_url" text,
	"barcode_prefix" text DEFAULT 'KOS' NOT NULL,
	"barcode_symbology" text DEFAULT 'CODE128' NOT NULL,
	"label_width_mm" numeric(6, 2) DEFAULT '50' NOT NULL,
	"label_height_mm" numeric(6, 2) DEFAULT '25' NOT NULL,
	"printer_name" text,
	"thermal_printer_width_mm" numeric(6, 2) DEFAULT '80' NOT NULL,
	"accepted_payment_methods" text[] DEFAULT '{"CASH","CARD","UPI"}' NOT NULL,
	"max_discount_percent" numeric(5, 2) DEFAULT '20.00' NOT NULL,
	"loyalty_points_per_rupee" numeric(6, 3) DEFAULT '0.10' NOT NULL,
	"loyalty_redemption_value" numeric(6, 3) DEFAULT '0.50' NOT NULL,
	"low_stock_threshold" numeric(10, 0) DEFAULT '5' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "store_settings_store_id_unique" UNIQUE("store_id")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "role" DEFAULT 'SALES_STAFF' NOT NULL,
	"store_id" text,
	"phone" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "brand_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "category_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "collection" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"season" text,
	"year" numeric(4, 0),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" text PRIMARY KEY NOT NULL,
	"article_code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category_id" text,
	"subcategory_id" text,
	"brand_id" text,
	"collection_id" text,
	"season" text,
	"fabric" text,
	"pattern" text,
	"sleeve_type" text,
	"neck_type" text,
	"gender" "gender" DEFAULT 'WOMEN' NOT NULL,
	"occasion" text,
	"mrp" numeric(12, 2) NOT NULL,
	"selling_price" numeric(12, 2) NOT NULL,
	"purchase_cost" numeric(12, 2) NOT NULL,
	"gst_rate" numeric(5, 2) DEFAULT '5.00' NOT NULL,
	"images" text[] DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_article_code_unique" UNIQUE("article_code")
);
--> statement-breakpoint
CREATE TABLE "product_variant" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"size" text NOT NULL,
	"color" text NOT NULL,
	"sku" text NOT NULL,
	"barcode" text NOT NULL,
	"mrp_override" numeric(12, 2),
	"selling_price_override" numeric(12, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_variant_sku_unique" UNIQUE("sku"),
	CONSTRAINT "product_variant_barcode_unique" UNIQUE("barcode")
);
--> statement-breakpoint
CREATE TABLE "subcategory" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" text PRIMARY KEY NOT NULL,
	"variant_id" text NOT NULL,
	"store_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"reserved_quantity" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movement" (
	"id" text PRIMARY KEY NOT NULL,
	"variant_id" text NOT NULL,
	"store_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"type" "stock_movement_type" NOT NULL,
	"quantity" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"unit_cost" numeric(12, 2),
	"reason" text,
	"ref_type" text,
	"ref_id" text,
	"performed_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"name" text NOT NULL,
	"is_default" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"mobile" text NOT NULL,
	"email" text,
	"address" text,
	"city" text,
	"birthday" date,
	"anniversary" date,
	"preferred_size" text,
	"notes" text,
	"loyalty_points" integer DEFAULT 0 NOT NULL,
	"loyalty_tier_id" text,
	"total_spend" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_orders" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customer_mobile_unique" UNIQUE("mobile")
);
--> statement-breakpoint
CREATE TABLE "loyalty_tier" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"min_spend" numeric(14, 2) NOT NULL,
	"points_multiplier" numeric(5, 2) DEFAULT '1.00' NOT NULL,
	"benefits" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "loyalty_tier_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "loyalty_transaction" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"points" integer NOT NULL,
	"type" text NOT NULL,
	"ref_type" text,
	"ref_id" text,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupon_code" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"discount_percent" numeric(5, 2),
	"discount_flat" numeric(12, 2),
	"min_cart_value" numeric(12, 2) DEFAULT '0' NOT NULL,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"valid_from" timestamp DEFAULT now() NOT NULL,
	"valid_until" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coupon_code_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "exchange_record" (
	"id" text PRIMARY KEY NOT NULL,
	"original_sale_id" text NOT NULL,
	"original_sale_item_id" text NOT NULL,
	"returned_quantity" integer NOT NULL,
	"new_variant_id" text NOT NULL,
	"new_quantity" integer NOT NULL,
	"price_difference" numeric(12, 2) DEFAULT '0' NOT NULL,
	"new_sale_id" text,
	"processed_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gift_card" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"initial_value" numeric(12, 2) NOT NULL,
	"balance" numeric(12, 2) NOT NULL,
	"issued_to_customer_id" text,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gift_card_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" text PRIMARY KEY NOT NULL,
	"sale_id" text NOT NULL,
	"method" "payment_method" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"reference_number" text,
	"gift_card_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "return_record" (
	"id" text PRIMARY KEY NOT NULL,
	"sale_id" text NOT NULL,
	"sale_item_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"refund_amount" numeric(12, 2) NOT NULL,
	"refund_method" "payment_method" NOT NULL,
	"reason" text,
	"processed_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"store_id" text NOT NULL,
	"customer_id" text,
	"cashier_id" text NOT NULL,
	"subtotal" numeric(14, 2) NOT NULL,
	"discount_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"coupon_code_id" text,
	"gst_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(14, 2) NOT NULL,
	"loyalty_points_earned" integer DEFAULT 0 NOT NULL,
	"loyalty_points_redeemed" integer DEFAULT 0 NOT NULL,
	"status" "sale_status" DEFAULT 'COMPLETED' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sale_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "sale_item" (
	"id" text PRIMARY KEY NOT NULL,
	"sale_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"gst_rate" numeric(5, 2) NOT NULL,
	"gst_amount" numeric(12, 2) NOT NULL,
	"line_total" numeric(12, 2) NOT NULL,
	"returned_quantity" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bridal_order" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"customer_id" text,
	"bride_name" text NOT NULL,
	"bride_mobile" text,
	"groom_name" text,
	"groom_mobile" text,
	"wedding_date" date NOT NULL,
	"outfit_description" text NOT NULL,
	"fabric" text,
	"embroidery_details" text,
	"measurements" text,
	"tailor_id" text,
	"status" "bridal_outfit_status" DEFAULT 'SELECTION' NOT NULL,
	"total_amount" numeric(14, 2) NOT NULL,
	"advance_paid" numeric(14, 2) DEFAULT '0' NOT NULL,
	"delivery_date" date,
	"actual_delivery_date" date,
	"assigned_to_id" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bridal_payment" (
	"id" text PRIMARY KEY NOT NULL,
	"bridal_order_id" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"method" text NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bridal_timeline_event" (
	"id" text PRIMARY KEY NOT NULL,
	"bridal_order_id" text NOT NULL,
	"status" "bridal_outfit_status" NOT NULL,
	"note" text,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bridal_trial" (
	"id" text PRIMARY KEY NOT NULL,
	"bridal_order_id" text NOT NULL,
	"trial_date" timestamp NOT NULL,
	"outcome" text,
	"completed_on" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alteration" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"job_number" text NOT NULL,
	"customer_id" text,
	"item_description" text NOT NULL,
	"alteration_details" text NOT NULL,
	"tailor_id" text,
	"status" "alteration_status" DEFAULT 'RECEIVED' NOT NULL,
	"charge" numeric(10, 2) DEFAULT '0' NOT NULL,
	"expected_delivery_date" date,
	"actual_delivery_date" date,
	"received_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "alteration_job_number_unique" UNIQUE("job_number")
);
--> statement-breakpoint
CREATE TABLE "alteration_status_history" (
	"id" text PRIMARY KEY NOT NULL,
	"alteration_id" text NOT NULL,
	"status" "alteration_status" NOT NULL,
	"note" text,
	"changed_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tailor" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"name" text NOT NULL,
	"mobile" text,
	"specialization" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grn" (
	"id" text PRIMARY KEY NOT NULL,
	"grn_number" text NOT NULL,
	"purchase_order_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"received_by_id" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "grn_grn_number_unique" UNIQUE("grn_number")
);
--> statement-breakpoint
CREATE TABLE "grn_item" (
	"id" text PRIMARY KEY NOT NULL,
	"grn_id" text NOT NULL,
	"purchase_order_item_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"quantity_received" integer NOT NULL,
	"unit_cost" numeric(12, 2) NOT NULL,
	"damaged_quantity" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_order" (
	"id" text PRIMARY KEY NOT NULL,
	"po_number" text NOT NULL,
	"store_id" text NOT NULL,
	"vendor_id" text NOT NULL,
	"status" "purchase_order_status" DEFAULT 'DRAFT' NOT NULL,
	"expected_date" date,
	"total_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_order_po_number_unique" UNIQUE("po_number")
);
--> statement-breakpoint
CREATE TABLE "purchase_order_item" (
	"id" text PRIMARY KEY NOT NULL,
	"purchase_order_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"quantity_ordered" integer NOT NULL,
	"quantity_received" integer DEFAULT 0 NOT NULL,
	"unit_cost" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact_person" text,
	"mobile" text,
	"email" text,
	"address" text,
	"gstin" text,
	"opening_balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_payment" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" text NOT NULL,
	"purchase_order_id" text,
	"amount" numeric(14, 2) NOT NULL,
	"method" "payment_method" NOT NULL,
	"reference_number" text,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"metadata" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"sale_id" text,
	"amount" numeric(12, 2) NOT NULL,
	"rate_percent" numeric(5, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_attendance" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"status" "attendance_status" DEFAULT 'PRESENT' NOT NULL,
	"check_in" timestamp,
	"check_out" timestamp,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_target" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"store_id" text NOT NULL,
	"period_month" date NOT NULL,
	"target_amount" numeric(14, 2) NOT NULL,
	"achieved_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_log" (
	"id" text PRIMARY KEY NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"event" "notification_event" NOT NULL,
	"recipient" text NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"status" "notification_status" DEFAULT 'PENDING' NOT NULL,
	"error_message" text,
	"ref_type" text,
	"ref_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"sent_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_subcategory_id_subcategory_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategory"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_brand_id_brand_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brand"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variant" ADD CONSTRAINT "product_variant_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcategory" ADD CONSTRAINT "subcategory_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_variant_id_product_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_warehouse_id_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_variant_id_product_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_warehouse_id_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_performed_by_id_user_id_fk" FOREIGN KEY ("performed_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse" ADD CONSTRAINT "warehouse_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer" ADD CONSTRAINT "customer_loyalty_tier_id_loyalty_tier_id_fk" FOREIGN KEY ("loyalty_tier_id") REFERENCES "public"."loyalty_tier"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transaction" ADD CONSTRAINT "loyalty_transaction_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_record" ADD CONSTRAINT "exchange_record_original_sale_id_sale_id_fk" FOREIGN KEY ("original_sale_id") REFERENCES "public"."sale"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_record" ADD CONSTRAINT "exchange_record_original_sale_item_id_sale_item_id_fk" FOREIGN KEY ("original_sale_item_id") REFERENCES "public"."sale_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_record" ADD CONSTRAINT "exchange_record_new_variant_id_product_variant_id_fk" FOREIGN KEY ("new_variant_id") REFERENCES "public"."product_variant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_record" ADD CONSTRAINT "exchange_record_new_sale_id_sale_id_fk" FOREIGN KEY ("new_sale_id") REFERENCES "public"."sale"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_record" ADD CONSTRAINT "exchange_record_processed_by_id_user_id_fk" FOREIGN KEY ("processed_by_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_card" ADD CONSTRAINT "gift_card_issued_to_customer_id_customer_id_fk" FOREIGN KEY ("issued_to_customer_id") REFERENCES "public"."customer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_sale_id_sale_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sale"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_gift_card_id_gift_card_id_fk" FOREIGN KEY ("gift_card_id") REFERENCES "public"."gift_card"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_record" ADD CONSTRAINT "return_record_sale_id_sale_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sale"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_record" ADD CONSTRAINT "return_record_sale_item_id_sale_item_id_fk" FOREIGN KEY ("sale_item_id") REFERENCES "public"."sale_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_record" ADD CONSTRAINT "return_record_processed_by_id_user_id_fk" FOREIGN KEY ("processed_by_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale" ADD CONSTRAINT "sale_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale" ADD CONSTRAINT "sale_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale" ADD CONSTRAINT "sale_cashier_id_user_id_fk" FOREIGN KEY ("cashier_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale" ADD CONSTRAINT "sale_coupon_code_id_coupon_code_id_fk" FOREIGN KEY ("coupon_code_id") REFERENCES "public"."coupon_code"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_item" ADD CONSTRAINT "sale_item_sale_id_sale_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sale"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_item" ADD CONSTRAINT "sale_item_variant_id_product_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bridal_order" ADD CONSTRAINT "bridal_order_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bridal_order" ADD CONSTRAINT "bridal_order_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bridal_order" ADD CONSTRAINT "bridal_order_tailor_id_tailor_id_fk" FOREIGN KEY ("tailor_id") REFERENCES "public"."tailor"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bridal_order" ADD CONSTRAINT "bridal_order_assigned_to_id_user_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bridal_payment" ADD CONSTRAINT "bridal_payment_bridal_order_id_bridal_order_id_fk" FOREIGN KEY ("bridal_order_id") REFERENCES "public"."bridal_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bridal_timeline_event" ADD CONSTRAINT "bridal_timeline_event_bridal_order_id_bridal_order_id_fk" FOREIGN KEY ("bridal_order_id") REFERENCES "public"."bridal_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bridal_timeline_event" ADD CONSTRAINT "bridal_timeline_event_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bridal_trial" ADD CONSTRAINT "bridal_trial_bridal_order_id_bridal_order_id_fk" FOREIGN KEY ("bridal_order_id") REFERENCES "public"."bridal_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alteration" ADD CONSTRAINT "alteration_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alteration" ADD CONSTRAINT "alteration_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alteration" ADD CONSTRAINT "alteration_tailor_id_tailor_id_fk" FOREIGN KEY ("tailor_id") REFERENCES "public"."tailor"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alteration" ADD CONSTRAINT "alteration_received_by_id_user_id_fk" FOREIGN KEY ("received_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alteration_status_history" ADD CONSTRAINT "alteration_status_history_alteration_id_alteration_id_fk" FOREIGN KEY ("alteration_id") REFERENCES "public"."alteration"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alteration_status_history" ADD CONSTRAINT "alteration_status_history_changed_by_id_user_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tailor" ADD CONSTRAINT "tailor_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grn" ADD CONSTRAINT "grn_purchase_order_id_purchase_order_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grn" ADD CONSTRAINT "grn_warehouse_id_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grn" ADD CONSTRAINT "grn_received_by_id_user_id_fk" FOREIGN KEY ("received_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grn_item" ADD CONSTRAINT "grn_item_grn_id_grn_id_fk" FOREIGN KEY ("grn_id") REFERENCES "public"."grn"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grn_item" ADD CONSTRAINT "grn_item_purchase_order_item_id_purchase_order_item_id_fk" FOREIGN KEY ("purchase_order_item_id") REFERENCES "public"."purchase_order_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grn_item" ADD CONSTRAINT "grn_item_variant_id_product_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_vendor_id_vendor_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendor"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_item" ADD CONSTRAINT "purchase_order_item_purchase_order_id_purchase_order_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_item" ADD CONSTRAINT "purchase_order_item_variant_id_product_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_payment" ADD CONSTRAINT "vendor_payment_vendor_id_vendor_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_payment" ADD CONSTRAINT "vendor_payment_purchase_order_id_purchase_order_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_order"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission" ADD CONSTRAINT "commission_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_attendance" ADD CONSTRAINT "staff_attendance_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_target" ADD CONSTRAINT "staff_target_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_target" ADD CONSTRAINT "staff_target_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "variant_product_size_color_idx" ON "product_variant" USING btree ("product_id","size","color");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_variant_warehouse_idx" ON "inventory" USING btree ("variant_id","warehouse_id");