/**
 * DynamoDB table creation script.
 *
 * Usage:
 *   npx tsx scripts/create-tables.ts
 *   # or via npm:
 *   npm run create-tables
 *
 * Requires AWS credentials with DynamoDB:CreateTable permission.
 * Reads region and table prefix from .env / environment variables.
 */

import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  type CreateTableCommandInput,
  type GlobalSecondaryIndex,
  type KeySchemaElement,
  type AttributeDefinition,
} from "@aws-sdk/client-dynamodb";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const region = process.env.AWS_REGION || "us-east-1";
const prefix = process.env.DYNAMODB_TABLE_PREFIX || "beacon_";

const client = new DynamoDBClient({ region });

// ─── Table definitions ──────────────────────────────────────────────────────

interface TableDef {
  name: string;
  keys: KeySchemaElement[];
  attributes: AttributeDefinition[];
  gsis?: GlobalSecondaryIndex[];
}

const tables: TableDef[] = [
  // ── sessions ───────────────────────────────────────────────────────
  {
    name: `${prefix}sessions`,
    keys: [
      { AttributeName: "userId", KeyType: "HASH" },
      { AttributeName: "sessionId", KeyType: "RANGE" },
    ],
    attributes: [
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "sessionId", AttributeType: "S" },
      { AttributeName: "date", AttributeType: "S" },
      { AttributeName: "timestamp", AttributeType: "S" },
    ],
    gsis: [
      {
        IndexName: "byDate",
        KeySchema: [
          { AttributeName: "date", KeyType: "HASH" },
          { AttributeName: "timestamp", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
  },

  // ── events ────────────────────────────────────────────────────────
  {
    name: `${prefix}events`,
    keys: [
      { AttributeName: "sessionId", KeyType: "HASH" },
      { AttributeName: "eventId", KeyType: "RANGE" },
    ],
    attributes: [
      { AttributeName: "sessionId", AttributeType: "S" },
      { AttributeName: "eventId", AttributeType: "S" },
      { AttributeName: "eventType", AttributeType: "S" },
      { AttributeName: "date", AttributeType: "S" },
      { AttributeName: "timestamp", AttributeType: "S" },
    ],
    gsis: [
      {
        IndexName: "byType",
        KeySchema: [
          { AttributeName: "eventType", KeyType: "HASH" },
          { AttributeName: "timestamp", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
      {
        IndexName: "byDate",
        KeySchema: [
          { AttributeName: "date", KeyType: "HASH" },
          { AttributeName: "timestamp", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
  },

  // ── pageviews ─────────────────────────────────────────────────────
  {
    name: `${prefix}pageviews`,
    keys: [
      { AttributeName: "sessionId", KeyType: "HASH" },
      { AttributeName: "timestamp", KeyType: "RANGE" },
    ],
    attributes: [
      { AttributeName: "sessionId", AttributeType: "S" },
      { AttributeName: "timestamp", AttributeType: "S" },
      { AttributeName: "pagePath", AttributeType: "S" },
      { AttributeName: "date", AttributeType: "S" },
    ],
    gsis: [
      {
        IndexName: "byPage",
        KeySchema: [
          { AttributeName: "pagePath", KeyType: "HASH" },
          { AttributeName: "timestamp", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
      {
        IndexName: "byDate",
        KeySchema: [
          { AttributeName: "date", KeyType: "HASH" },
          { AttributeName: "timestamp", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
  },

  // ── users ─────────────────────────────────────────────────────────
  {
    name: `${prefix}users`,
    keys: [{ AttributeName: "userId", KeyType: "HASH" }],
    attributes: [{ AttributeName: "userId", AttributeType: "S" }],
  },
];

// ─── Create logic ───────────────────────────────────────────────────────────

async function tableExists(name: string): Promise<boolean> {
  try {
    await client.send(new DescribeTableCommand({ TableName: name }));
    return true;
  } catch (err) {
    if ((err as Error).name === "ResourceNotFoundException") return false;
    throw err;
  }
}

async function createTable(def: TableDef): Promise<void> {
  const exists = await tableExists(def.name);
  if (exists) {
    console.log(`  [skip] ${def.name} already exists`);
    return;
  }

  const params: CreateTableCommandInput = {
    TableName: def.name,
    KeySchema: def.keys,
    AttributeDefinitions: def.attributes,
    BillingMode: "PAY_PER_REQUEST",
  };

  if (def.gsis && def.gsis.length > 0) {
    // Remove ProvisionedThroughput from GSIs when using PAY_PER_REQUEST
    params.GlobalSecondaryIndexes = def.gsis.map((gsi) => ({
      IndexName: gsi.IndexName,
      KeySchema: gsi.KeySchema,
      Projection: gsi.Projection,
    }));
  }

  await client.send(new CreateTableCommand(params));
  console.log(`  [created] ${def.name}`);
}

async function main(): Promise<void> {
  console.log(`Creating DynamoDB tables (region: ${region}, prefix: ${prefix})\n`);

  for (const table of tables) {
    try {
      await createTable(table);
    } catch (err) {
      console.error(`  [error] ${table.name}:`, (err as Error).message);
    }
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
