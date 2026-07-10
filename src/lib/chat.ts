// Server-side data access for conversations and messages.
//
// Prod (Amplify/Lambda): backed by DynamoDB — see ddb.ts.
// Local dev: also backed by DynamoDB if APP_TABLE is set in your .env,
// otherwise Prisma+SQLite (see chat-prisma.ts).
//
// We use dynamic require here so the Prisma path isn't bundled into the
// prod Lambda when it isn't used — reduces cold start.

// eslint-disable-next-line @typescript-eslint/no-require-imports
const impl = process.env.APP_TABLE
  ? require("./ddb")
  : require("./chat-prisma");

export const getConversations = impl.getConversations as (
  userEmail: string,
) => Promise<Array<{ id: string; title: string; updatedAt: Date }>>;

export const getConversation = impl.getConversation as (
  id: string,
  userEmail: string,
) => Promise<
  | null
  | {
      id: string;
      title: string;
      userId: string;
      messages: Array<{
        id: string;
        role: string;
        content: string;
        createdAt: Date;
        conversationId: string;
      }>;
    }
>;

export const createConversation = impl.createConversation as (
  userEmail: string,
  title: string,
) => Promise<{ id: string; title: string; userId: string }>;

export const appendMessage = impl.appendMessage as (
  conversationId: string,
  role: "user" | "assistant" | "system",
  content: string,
) => Promise<{
  id: string;
  role: string;
  content: string;
  createdAt: Date;
  conversationId: string;
}>;

export const getContextMessages = impl.getContextMessages as (
  conversationId: string,
) => Promise<Array<{ role: string; content: string }>>;
