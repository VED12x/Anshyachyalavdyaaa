import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('care_links', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('patient_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('provider_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('provider_role', ['caregiver', 'clinician']).notNullable();
    table.enum('status', ['pending', 'active', 'revoked']).notNullable().defaultTo('pending');
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    // A patient can only have one link to a specific provider
    table.unique(['patient_id', 'provider_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('care_links');
}
