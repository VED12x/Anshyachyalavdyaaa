import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add share_diet_detail to care_links (Phase 13)
  await knex.schema.alterTable('care_links', (table) => {
    table.boolean('share_diet_detail').defaultTo(false).notNullable();
  });

  // Food Items (Phase 16)
  await knex.schema.createTable('food_items', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name').notNullable();
    table.specificType('aliases', 'text[]'); // Array of strings for aliases
    table.string('region');
    table.decimal('carbs_per_serving_g', 5, 2).notNullable();
    table.string('serving_description').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Chatbot Config (Phase 14)
  await knex.schema.createTable('chatbot_menu_config', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('parent_id').references('id').inTable('chatbot_menu_config').onDelete('CASCADE');
    table.string('label').notNullable();
    table.text('response_text');
    table.string('action').notNullable(); // show_submenu, answer, escalate_to_doctor, escalate_to_support
  });

  // Chatbot Sessions
  await knex.schema.createTable('chatbot_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.string('status').notNullable().defaultTo('bot_active'); // bot_active, escalated, resolved
    table.string('escalation_target'); // doctor, support
    table.timestamp('started_at').defaultTo(knex.fn.now());
    table.timestamp('resolved_at');
  });

  // Chatbot Messages
  await knex.schema.createTable('chatbot_messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('session_id').references('id').inTable('chatbot_sessions').onDelete('CASCADE').notNullable();
    table.string('sender').notNullable(); // bot, user
    table.text('content').notNullable();
    table.string('option_key');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('chatbot_messages');
  await knex.schema.dropTableIfExists('chatbot_sessions');
  await knex.schema.dropTableIfExists('chatbot_menu_config');
  await knex.schema.dropTableIfExists('food_items');
  
  await knex.schema.alterTable('care_links', (table) => {
    table.dropColumn('share_diet_detail');
  });
}
