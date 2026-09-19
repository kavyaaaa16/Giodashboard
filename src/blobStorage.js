import { BlobServiceClient } from "@azure/storage-blob";
import "dotenv/config";

// Only initialized when actually needed (lazily), so the rest of the
// backend keeps working even if artifact download isn't configured yet —
// metrics/encounters endpoints don't need Blob Storage at all.
let client = null;
export function getBlobServiceClient() {
  if (client) return client;
  if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
    throw new Error(
      "AZURE_STORAGE_CONNECTION_STRING is not set — artifact download requires it. See .env.example."
    );
  }
  client = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
  return client;
}
