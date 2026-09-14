import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('devices', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('device_type', ['glucometer', 'cgm', 'wearable']).notNullable();
    table.string('external_id', 255).notNullable(); // vendor device ID
    table.string('name', 255).nullable();
    table.string('manufacturer', 255).nullable();
    table.timestamp('paired_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('last_synced_at').nullable();
    table.boolean('active').notNullable().defaultTo(true);

    table.unique(['user_id', 'external_id']);
    table.index(['user_id', 'active']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('devices');
}
