/**
 * Web Worker für Lua (wasmoon = Lua 5.4 als WebAssembly).
 * Lua hat hier keinen Zugriff auf JavaScript oder das Netzwerk – nur auf
 * print/io.write (Ausgabe) und io.read (Eingabe).
 */
import { LuaFactory } from "wasmoon";
import { lockDown } from "../lockdown";

type InMsg = { type: "run"; id: number; code: string; wasmUrl: string; sab?: { control: SharedArrayBuffer; data: SharedArrayBuffer }; inputs?: string[] };
const ctx = self as unknown as { postMessage(m: unknown): void; onmessage: ((e: MessageEvent<InMsg>) => void) | null };
const decoder = new TextDecoder();

ctx.onmessage = async (e) => {
  const msg = e.data;
  const queued = [...(msg.inputs ?? [])];
  const control = msg.sab ? new Int32Array(msg.sab.control) : null;
  const data = msg.sab ? new Uint8Array(msg.sab.data) : null;
  let chars = 0;
  const write = (text: string) => {
    chars += text.length;
    if (chars > 500_000) throw new Error("Zu viel Ausgabe – läuft eine Schleife endlos?");
    ctx.postMessage({ type: "output", id: msg.id, text });
  };
  const read = (): string | null => {
    if (control && data) {
      Atomics.store(control, 0, 0);
      ctx.postMessage({ type: "input-request", id: msg.id });
      Atomics.wait(control, 0, 0);
      const len = control[1];
      if (len < 0) return null;
      const copy = new Uint8Array(len);
      copy.set(data.subarray(0, len));
      return decoder.decode(copy);
    }
    const next = queued.shift();
    if (next === undefined) return null;
    ctx.postMessage({ type: "output", id: msg.id, text: `${next}\n`, stream: "stdin" });
    return next;
  };
  try {
    const factory = new LuaFactory(msg.wasmUrl);
    const lua = await factory.createEngine();
    lockDown();
    lua.global.set("__cf_write", write);
    lua.global.set("__cf_read", read);
    await lua.doString(`
      local __write, __read = __cf_write, __cf_read
      __cf_write, __cf_read = nil, nil
      function print(...)
        local n = select("#", ...)
        local parts = {}
        for i = 1, n do parts[i] = tostring((select(i, ...))) end
        __write(table.concat(parts, "\\t") .. "\\n")
      end
      io.write = function(...)
        for i = 1, select("#", ...) do __write(tostring((select(i, ...)))) end
      end
      io.read = function(fmt)
        local line = __read()
        if line == nil then return nil end
        if fmt == "n" or fmt == "*n" then return tonumber(line) end
        return line
      end
      os.exit = nil; os.execute = nil; os.remove = nil; os.rename = nil; io.open = nil; io.popen = nil
      require = nil; dofile = nil; loadfile = nil
    `);
    await lua.doString(msg.code);
    lua.global.close();
    ctx.postMessage({ type: "done", id: msg.id, ok: true });
  } catch (err) {
    ctx.postMessage({ type: "done", id: msg.id, ok: false, error: String((err as Error)?.message ?? err) });
  }
};
