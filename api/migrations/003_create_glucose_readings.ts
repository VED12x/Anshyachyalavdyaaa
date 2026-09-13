import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('glucose_readings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.decimal('value_mgdl', 5, 2).notNullable();
    table.string('source', 50).notNullable(); // 'manual', 'cgm', 'device'
    table.uuid('device_id').references('id').inTable('devices').onDelete('SET NULL');
    table.timestamp('recorded_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Standard indexing for time-series queries instead of TimescaleDB hypertable
    table.index(['user_id', 'recorded_at']);
    table.index(['recorded_at']);
  });

  // Unique constraint for device idempotency
  await knex.raw(`
    CREATE UNIQUE INDEX idx_glucose_device_recorded_at 
    ON glucose_readings (device_id, recorded_at) 
    WHERE device_id IS NOT NULL;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('glucose_readings');
}
