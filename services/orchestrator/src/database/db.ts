import knex, { Knex } from 'knex';
import path from 'path';

export const db: Knex = knex({
  client: 'sqlite3',
  connection: {
    filename: path.join(process.cwd(), 'junimo-db.sqlite'),
  },
  useNullAsDefault: true,
});

export async function initDatabase() {
  if (!await db.schema.hasTable('hosts')) {
    await db.schema.createTable('hosts', (table) => {
      table.uuid('id').primary();
      table.string('name').notNullable();
      table.string('status', 20).notNullable();
      table.string('containerId').nullable();
      table.string('steamAuthId').nullable();
      
      table.integer('vnc_port').unique();
      table.integer('api_port').unique();
      table.integer('game_port').unique();
      table.integer('query_port').unique();
      
      table.string('apiKey').notNullable();
      table.string('farmName').nullable();
      table.string('serverPassword').nullable();
      
      table.timestamp('createdAt').defaultTo(db.fn.now());
      table.timestamp('lastStartedAt').nullable();
    });
  }
}
