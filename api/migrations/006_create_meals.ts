import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('meals', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('description').notNullable();
    table.string('photo_url', 500).nullable();
    table.float('estimated_carbs_g').nullable();
    table.float('protein_g').nullable();
    table.float('fat_g').nullable();
    table.float('fiber_g').nullable();
    table.float('calories').nullable();
    table.string('tag', 50).nullable(); // 'Balanced', 'High Carb', 'Low Carb', 'Moderate'
    table.text('recommendation').nullable();
    table.timestamp('logged_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();

    table.index(['user_id', 'logged_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('meals');
}
