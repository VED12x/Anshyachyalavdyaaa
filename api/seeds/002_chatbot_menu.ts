import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex('chatbot_menu_config').del();

  // Inserts seed entries
  await knex('chatbot_menu_config').insert([
    {
      id: uuidv4(),
      label: 'Report a symptom',
      action: 'escalate_to_doctor',
    },
    {
      id: uuidv4(),
      label: 'Talk to my doctor',
      action: 'escalate_to_doctor',
    },
    {
      id: uuidv4(),
      label: 'App or device issue',
      action: 'escalate_to_support',
    },
    {
      id: uuidv4(),
      label: 'How do I pair my glucometer?',
      response_text: 'Go to Settings > Devices and click "Add Bluetooth Device". Make sure your glucometer is turned on.',
      action: 'answer',
    },
  ]);
}
