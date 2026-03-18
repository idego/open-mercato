import { Migration } from '@mikro-orm/migrations';

export class Migration20260318100000_add_customer_entity_id extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "manufacturing_work_orders" add column "customer_entity_id" uuid null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "manufacturing_work_orders" drop column "customer_entity_id";`);
  }

}
