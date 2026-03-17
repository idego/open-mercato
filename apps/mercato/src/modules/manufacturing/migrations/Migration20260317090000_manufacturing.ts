import { Migration } from '@mikro-orm/migrations';

export class Migration20260317090000_manufacturing extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "manufacturing_work_orders" ("id" uuid not null default gen_random_uuid(), "wo_number" text not null, "status" text not null default 'DRAFT', "customer_name" text null, "industry" text null, "priority" text not null default 'NORMAL', "material" text null, "quantity" integer null, "due_date" text null, "materials_available" boolean not null default false, "notes" text null, "organization_id" uuid null, "tenant_id" uuid null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, constraint "manufacturing_work_orders_pkey" primary key ("id"));`);

    this.addSql(`create table "manufacturing_inspection_records" ("id" uuid not null default gen_random_uuid(), "inspection_number" text not null, "work_order_ref" text null, "inspector_name" text null, "result" text null, "defect_description" text null, "inspection_date" text null, "organization_id" uuid null, "tenant_id" uuid null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "deleted_at" timestamptz null, constraint "manufacturing_inspection_records_pkey" primary key ("id"));`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "manufacturing_work_orders" cascade;`);

    this.addSql(`drop table if exists "manufacturing_inspection_records" cascade;`);
  }

}
