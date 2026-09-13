import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('medications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.string('dosage', 100).notNullable();
    table.integer('times_per_day').notNullable().defaultTo(1);
    table.specificType('schedule_times', 'TIME[]').nullable(); // e.g., ['08:00', '20:00']
    table.text('notes').nullable();
    table.boolean('active').notNullable().defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    table.index(['user_id', 'active']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('medications');
}
