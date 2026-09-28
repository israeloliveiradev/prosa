import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { brandedMail } from "../src/services/mail-templates.ts";

describe("brandedMail", () => {
  it("puts the code in both the letter and the plain text", () => {
    const letter = brandedMail({ locale: "pt", kind: "reset", code: "123456" });
    assert.match(letter.subject, /código/i);
    assert.match(letter.text, /123456/);
    assert.match(letter.html, /1/);
    assert.match(letter.html, /2/);
    assert.match(letter.html, /Prosa/);
    assert.match(letter.html, /9A3412/);
  });

  it("keeps the code plate inside the card with the new type", () => {
    const letter = brandedMail({ locale: "pt", kind: "reset", code: "188026" });
    assert.match(letter.html, /Newsreader/);
    assert.match(letter.html, /Source Sans 3/);
    assert.doesNotMatch(letter.html, /Playfair|Plus Jakarta|font:italic|font-style:italic/);
    assert.match(letter.html, />1<\/td>/);
    assert.match(letter.html, />8<\/td>/);
    assert.match(letter.html, />0<\/td>/);
    assert.match(letter.html, />2<\/td>/);
    assert.match(letter.html, />6<\/td>/);
    const labelIndex = letter.html.indexOf("O seu código");
    const actionIndex = letter.html.indexOf("expira em 15 minutos");
    const signoffIndex = letter.html.indexOf("A redação da Prosa");
    assert.ok(labelIndex > 0 && actionIndex > labelIndex && signoffIndex > actionIndex);
  });

  it("omits the code plate on a reminder", () => {
    const letter = brandedMail({ locale: "pt", kind: "reminder" });
    assert.doesNotMatch(letter.html, /O seu código/);
    assert.match(letter.html, /A prosa de hoje espera/);
  });

  it("writes the account confirmation letter", () => {
    const letter = brandedMail({ locale: "pt", kind: "verify", code: "644007" });
    assert.match(letter.subject, /Valide/);
    assert.match(letter.html, /Confirme que é você/);
    assert.match(letter.html, />6<\/td>/);
    assert.match(letter.text, /644007/);
  });
});
