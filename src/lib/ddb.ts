// DynamoDB client + adapter for Alpha Assist.
//
// Single table (alpha-assist-app) with pk/sk composite key. Access patterns:
//
//   Conversation:
//     pk = USER#<email>,  sk = CONV#<updatedAt-inv>#<id>   (list newest-first)
//     attrs: { id, title, createdAt, updatedAt }
//
//   Message:
//     pk = CONV#<id>,     sk = MSG#<iso-timestamp>#<mid>
//     attrs: { id, role, content, createdAt, userEmail }
//
// `updatedAt-inv` is `9999999999999 - updatedAt.getTime()` so a plain
// begins_with query on sk=CONV# returns newest first without an extra GSI.

import {
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION ?? "eu-north-1";
const TABLE = process.env.APP_TABLE ?? "alpha-assist-app";

const raw = new DynamoDBClient({ region: REGION });
export const ddb = DynamoDBDocumentClient.from(raw, {
  marshallOptions: { removeUndefinedValues: true },
});

const MAX_TIME = 9999999999999;

function encodeUpdatedAt(d: Date | number) {
  const t = typeof d === "number" ? d : d.getTime();
  return String(MAX_TIME - t).padStart(13, "0");
}

function newId(prefix: string) {
  // cuid-like but zero-dep: base36 timestamp + random suffix
  return (
    prefix +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10)
  );
}

// ---- Conversation records ------------------------------------------------

type ConvRow = {
  pk: string;
  sk: string;
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

type MsgRow = {
  pk: string;
  sk: string;
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
  userEmail: string;
};

// ---- Public API — mirrors src/lib/chat.ts signatures --------------------

export async function getConversations(userEmail: string) {
  const out = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userEmail}`,
        ":sk": "CONV#",
      },
      // sk is CONV#<inv-time>#<id> so ascending == newest-first already
      ScanIndexForward: true,
      Limit: 100,
    }),
  );
  const items = (out.Items ?? []) as ConvRow[];
  return items.map((r) => ({
    id: r.id,
    title: r.title,
    updatedAt: new Date(r.updatedAt),
  }));
}

export async function createConversation(userEmail: string, title: string) {
  const id = newId("c_");
  const now = Date.now();
  const cleanTitle = title.trim().slice(0, 60) || "New chat";
  const row: ConvRow = {
    pk: `USER#${userEmail}`,
    sk: `CONV#${encodeUpdatedAt(now)}#${id}`,
    id,
    title: cleanTitle,
    createdAt: now,
    updatedAt: now,
  };
  await ddb.send(new PutCommand({ TableName: TABLE, Item: row }));
  return { id, title: cleanTitle, userId: userEmail };
}

export async function getConversation(id: string, userEmail: string) {
  // We don't know the encoded-time in sk. Query the user's convos and filter.
  // Fast enough at demo scale (dozens of convs); add a GSI if this ever grows.
  const out = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userEmail}`,
        ":sk": "CONV#",
      },
    }),
  );
  const items = (out.Items ?? []) as ConvRow[];
  const conv = items.find((r) => r.id === id);
  if (!conv) return null;

  const msgsOut = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
      ExpressionAttributeValues: {
        ":pk": `CONV#${id}`,
        ":sk": "MSG#",
      },
      ScanIndexForward: true, // oldest first
    }),
  );
  const msgs = (msgsOut.Items ?? []) as MsgRow[];
  return {
    id: conv.id,
    title: conv.title,
    userId: userEmail,
    createdAt: new Date(conv.createdAt),
    updatedAt: new Date(conv.updatedAt),
    messages: msgs.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: new Date(m.createdAt),
      conversationId: id,
    })),
  };
}

export async function appendMessage(
  conversationId: string,
  role: "user" | "assistant" | "system",
  content: string,
) {
  const now = Date.now();
  const id = newId("m_");
  // Need userEmail for authz on message reads. Look it up by scanning user
  // convs — cached in-memory would be nicer but this stays simple.
  //
  // For MVP we skip the userEmail lookup and store empty; message reads
  // don't check it since access is gated by getConversation() which does
  // check ownership.
  const row: MsgRow = {
    pk: `CONV#${conversationId}`,
    sk: `MSG#${new Date(now).toISOString()}#${id}`,
    id,
    role,
    content,
    createdAt: now,
    userEmail: "",
  };
  await ddb.send(new PutCommand({ TableName: TABLE, Item: row }));

  // Bump the conversation's updatedAt so it floats to the top of the
  // history list. We don't know the exact sk (contains an old encoded time),
  // so re-query the user's convs, find this one, delete + put with new sk.
  // That's expensive; skip for MVP and let ordering drift slightly.
  return { id, role, content, createdAt: new Date(now), conversationId };
}

export async function getContextMessages(conversationId: string) {
  const out = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
      ExpressionAttributeValues: {
        ":pk": `CONV#${conversationId}`,
        ":sk": "MSG#",
      },
      ScanIndexForward: false, // newest first for LIMIT
      Limit: 20,
    }),
  );
  const items = (out.Items ?? []) as MsgRow[];
  return items
    .map((m) => ({ role: m.role, content: m.content }))
    .reverse();
}
