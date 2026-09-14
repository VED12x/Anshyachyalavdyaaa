import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  try { await knex.raw('ALTER TABLE users DROP CONSTRAINT users_role_check'); } catch(e) {}
  try { await knex.raw('ALTER TABLE care_links DROP CONSTRAINT care_links_provider_role_check'); } catch(e) {}
  
  await knex.raw('ALTER TABLE users ALTER COLUMN role TYPE text');
  await knex.raw('ALTER TABLE care_links ALTER COLUMN provider_role TYPE text');

  await knex('users').where({ role: 'clinician' }).update({ role: 'doctor' });
  await knex('users').where({ role: 'caregiver' }).update({ role: 'relative' });
  await knex('care_links').where({ provider_role: 'clinician' }).update({ provider_role: 'doctor' });
  await knex('care_links').where({ provider_role: 'caregiver' }).update({ provider_role: 'relative' });

  await knex.schema.createTable('admin_audit_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('admin_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.uuid('patient_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.text('reason').notNullable();
    table.timestamp('accessed_at').defaultTo(knex.fn.now()).notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('admin_audit_log');
  await knex('users').where({ role: 'doctor' }).update({ role: 'clinician' });
  await knex('users').where({ role: 'relative' }).update({ role: 'caregiver' });
  await knex('care_links').where({ provider_role: 'doctor' }).update({ provider_role: 'clinician' });
  await knex('care_links').where({ provider_role: 'relative' }).update({ provider_role: 'caregiver' });
}
