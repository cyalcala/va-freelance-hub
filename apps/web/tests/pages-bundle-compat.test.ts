import { expect, test } from "bun:test";
import astroConfig from "../astro.config.mjs";

test("server chunks install MessageChannel before React evaluates", () => {
  const plugins = (astroConfig.vite?.plugins ?? []).flat().filter(Boolean) as Array<{
    name?: string;
    generateBundle?: (options: unknown, bundle: Record<string, unknown>) => void;
  }>;
  const compatibilityPlugin = plugins.find((plugin) => plugin.name === "pages-messagechannel-compat");
  const chunk = {
    type: "chunk",
    code: "const channel = new MessageChannel();",
  };

  expect(compatibilityPlugin?.generateBundle).toBeFunction();
  compatibilityPlugin?.generateBundle?.({}, { "react-renderer.mjs": chunk });
  expect(chunk.code.indexOf("globalThis.MessageChannel")).toBeGreaterThanOrEqual(0);
  expect(chunk.code.indexOf("globalThis.MessageChannel")).toBeLessThan(
    chunk.code.indexOf("new MessageChannel()"),
  );
});
