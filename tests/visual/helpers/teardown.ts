import { cleanup } from "./seed";

export default async function globalTeardown() {
  await cleanup();
}
