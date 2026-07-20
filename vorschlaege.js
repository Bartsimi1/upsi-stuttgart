// UPSI - Stuttgart — Verbesserungsvorschläge: reiner Spaß, nichts wird
// gespeichert oder irgendwohin gesendet (kein fetch, kein localStorage) —
// der Text verlässt nie den Browser und wird nach der Animation gelöscht.

const SHRED_ANIMATION_MS = 700;

function updateCharCount() {
  const textarea = document.getElementById("suggestion-text");
  const countEl = document.getElementById("char-count-value");
  const len = textarea.value.length;
  countEl.textContent = String(len);
  countEl.parentElement.classList.toggle("limit-near", len >= 40);
}

function handleSubmit(event) {
  event.preventDefault();
  const textarea = document.getElementById("suggestion-text");
  const text = textarea.value.trim();
  if (!text) return;

  const card = document.getElementById("suggestion-card");
  const form = document.getElementById("suggestion-form");

  // Fliegender Zettel exakt über dem Textfeld positioniert (relativ zur
  // Karte, die als position:relative-Anker dient, siehe style.css).
  const textareaRect = textarea.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  const flying = document.createElement("div");
  flying.className = "flying-paper";
  flying.textContent = text;
  flying.style.top = `${textareaRect.top - cardRect.top}px`;
  flying.style.left = `${textareaRect.left - cardRect.left}px`;
  flying.style.width = `${textareaRect.width}px`;
  card.appendChild(flying);

  // Reflow erzwingen, damit der Browser die Startposition wirklich rendert,
  // BEVOR die Übergangs-Klasse dazukommt -- sonst startet die Animation
  // direkt am Zielzustand, ohne sichtbare Bewegung.
  void flying.offsetWidth;
  flying.classList.add("shredding");

  setTimeout(() => {
    flying.remove();
    textarea.value = "";
    updateCharCount();
    form.hidden = true;
    document.getElementById("shredder-result").hidden = false;
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
