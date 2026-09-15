import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create calls table
  await knex.schema.createTable('calls', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('caller_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('recipient_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('call_type', 20).notNullable().defaultTo('audio'); // 'audio', 'video'
    table.string('room_id', 50).notNullable().unique();
    table.string('status', 20).notNullable().defaultTo('ringing'); // 'ringing', 'active', 'ended'
    table.timestamp('answered_at');
    table.timestamp('ended_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Create WebRTC signaling table
  await knex.schema.createTable('call_signals', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('room_id', 50).notNullable();
    table.uuid('sender_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('signal_type', 50).notNullable(); // 'offer', 'answer', 'ice-candidate'
    table.text('signal_data').notNullable(); // JSON payload
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index('room_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('call_signals');
  await knex.schema.dropTableIfExists('calls');
}
