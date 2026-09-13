import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('alerts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('type', ['hypo_risk', 'hyper_risk', 'missed_dose', 'device_sync', 'general']).notNullable();
    table.jsonb('payload').nullable(); // flexible payload for alert details
    table.text('message').nullable();
    table.boolean('read').notNullable().defaultTo(false);
    table.timestamp('acknowledged_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();

    table.index(['user_id', 'created_at']);
    table.index(['user_id', 'read']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('alerts');
}
