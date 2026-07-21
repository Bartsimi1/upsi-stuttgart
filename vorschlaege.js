// UPSI - Stuttgart — Verbesserungsvorschläge: reiner Spaß, nichts wird
// gespeichert oder irgendwohin gesendet (kein fetch, kein localStorage) —
// der Text verlässt nie den Browser und wird nach der Animation gelöscht.

const SHRED_ANIMATION_MS = 700;

function updateCharCount() {
  const textarea = document.getElementById("suggestion-text");
  const countEl = document.getElementById("char-count-value");
  const len = textarea.value.length;
  countEl.textContent = String(len);
  countEl.parentElement.classList.toggle("limit-near", len >= 16);
}

function handleSubmit(event) {
  event.preventDefault();
  const textarea = document.getElementById("suggestion-text");
  const text = textarea.value.trim();
  if (!text) return;

  const card = document.getElementById("suggestion-card");
  const result = document.getElementById("shredder-result");
  const messageGroup = document.getElementById("shredder-message-group");
  const shredderImg = document.getElementById("shredder-gif");

  // Shredder zuerst sichtbar machen -- er ist das ZIEL der Flug-Animation,
  // die Ablehnungsmeldung bleibt bis danach verborgen (siehe setTimeout
  // unten). Erst NACH diesem Reveal lässt sich seine reale Position messen.
  result.hidden = false;
  messageGroup.hidden = true;

  const textareaRect = textarea.getBoundingClientRect();
  const shredderRect = shredderImg.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();

  // Fliegender Zettel startet exakt über dem Textfeld (relativ zur Karte,
  // die als position:relative-Anker dient, siehe style.css).
  const flying = document.createElement("div");
  flying.className = "flying-paper";
  flying.textContent = text;
  flying.style.top = `${textareaRect.top - cardRect.top}px`;
  flying.style.left = `${textareaRect.left - cardRect.left}px`;
  flying.style.width = `${textareaRect.width}px`;
  card.appendChild(flying);

  // Reflow erzwingen, damit der Browser die Startposition wirklich rendert,
  // BEVOR das Ziel-Transform gesetzt wird -- sonst startet die Animation
  // direkt am Zielzustand, ohne sichtbare Bewegung.
  void flying.offsetWidth;

  // Ziel: der Einzugsschlitz oben am Shredder (~15% seiner Höhe von oben),
  // horizontal mittig -- reale gemessene Position, kein fester Schätzwert.
  const deltaX =
    shredderRect.left + shredderRect.width / 2 -
    (textareaRect.left + textareaRect.width / 2);
  const deltaY = shredderRect.top + shredderRect.height * 0.15 - textareaRect.top;
  flying.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.15) rotate(8deg)`;
  flying.style.opacity = "0";

  setTimeout(() => {
    flying.remove();
    textarea.value = "";
    updateCharCount();
    document.getElementById("suggestion-form").hidden = true;
    messageGroup.hidden = false;
  }, SHRED_ANIMATION_MS);
}

function handleTryAgain() {
  document.getElementById("shredder-result").hidden = true;
  document.getElementById("suggestion-form").hidden = false;
  document.getElementById("suggestion-text").focus();
}

function init() {
  document.getElementById("suggestion-text").addEventListener("input", updateCharCount);
  document.getElementById("suggestion-form").addEventListener("submit", handleSubmit);
  document.getElementById("try-again-btn").addEventListener("click", handleTryAgain);
}

document.addEventListener("DOMContentLoaded", init);
