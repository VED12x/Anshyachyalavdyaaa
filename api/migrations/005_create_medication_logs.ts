import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('medication_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('medication_id').notNullable().references('id').inTable('medications').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('scheduled_for').notNullable();
    table.timestamp('taken_at').nullable();
    table.enum('status', ['pending', 'taken', 'missed']).notNullable().defaultTo('pending');
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();

    table.index(['user_id', 'scheduled_for']);
    table.index(['medication_id', 'status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('medication_logs');
}
