import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('activity_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('type', 100).notNullable(); // 'walking', 'running', 'cycling', etc.
    table.integer('duration_minutes').notNullable();
    table.integer('calories_burned').nullable();
    table.text('notes').nullable();
    table.timestamp('logged_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();

    table.index(['user_id', 'logged_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('activity_logs');
}
