/**
 * Einfache, barrierefreie Dialoge mit dem nativen <dialog>-Element
 * (Fokus bleibt im Dialog, Escape schließt). Wird z. B. von Blockly für
 * "Variable erstellen" verwendet.
 */
function createDialog(content: (dialog: HTMLDialogElement) => HTMLElement): HTMLDialogElement {
  const dialog = document.createElement("dialog");
  dialog.className = "cf-card m-auto w-[min(26rem,calc(100vw-2rem))] p-0 text-ink backdrop:bg-black/40";
  dialog.appendChild(content(dialog));
  document.body.appendChild(dialog);
  dialog.addEventListener("close", () => dialog.remove());
  return dialog;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = className;
  if (text) e.textContent = text;
  return e;
}

/** Fragt nach einem Text. Ergebnis: Text oder null (abgebrochen). */
export function askText(message: string, defaultValue = ""): Promise<string | null> {
  return new Promise((resolve) => {
    let result: string | null = null;
    const dialog = createDialog((d) => {
      const form = el("form", "flex flex-col gap-4 p-5");
      form.method = "dialog";
      const label = el("label", "cf-label", message);
      label.htmlFor = "cf-dialog-input";
      const input = el("input", "cf-input");
      input.id = "cf-dialog-input";
      input.value = defaultValue;
      input.maxLength = 30;
      input.autocomplete = "off";
      const row = el("div", "flex justify-end gap-2");
      const cancel = el("button", "cf-btn", "Abbrechen");
      cancel.type = "button";
      cancel.onclick = () => d.close();
      const ok = el("button", "cf-btn cf-btn-primary", "OK");
      ok.type = "submit";
      form.onsubmit = () => { result = input.value.trim() || null; };
      row.append(cancel, ok);
      form.append(label, input, row);
      return form;
    });
    dialog.addEventListener("close", () => resolve(result));
    dialog.showModal();
  });
}

/** Zeigt eine Nachricht. Mit `confirm` gibt es Ja/Nein. */
export function showMessage(message: string, confirm = false): Promise<boolean> {
  return new Promise((resolve) => {
    let result = false;
    const dialog = createDialog((d) => {
      const box = el("div", "flex flex-col gap-4 p-5");
      box.append(el("p", "text-lg", message));
      const row = el("div", "flex justify-end gap-2");
      if (confirm) {
        const no = el("button", "cf-btn", "Nein");
        no.type = "button";
        no.onclick = () => d.close();
        row.append(no);
      }
      const yes = el("button", "cf-btn cf-btn-primary", confirm ? "Ja" : "OK");
      yes.type = "button";
      yes.onclick = () => { result = true; d.close(); };
      row.append(yes);
      box.append(row);
      return box;
    });
    dialog.addEventListener("close", () => resolve(result));
    dialog.showModal();
  });
}
