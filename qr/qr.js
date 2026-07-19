/*
 * QR code generator — 100% in the browser.
 * Uses node-qrcode (MIT), bundled locally. No CDN, no server fallback —
 * your data never leaves the device.
 */
(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const { saveBlob } = window.ImgUtil;

  const canvas = $("#qrCanvas");
  const placeholder = $("#qrPlaceholder");
  const actions = $("#qrActions");
  const dataPreview = $("#dataPreview");
  const dataText = $("#dataText");
  const copyBtn = $("#copyBtn");
  const downloadBtn = $("#downloadBtn");

  let activeType = "url";
  let currentData = "";

  // ---------- Tabs ----------
  document.querySelectorAll(".tab[data-type]").forEach((tab) => {
    tab.addEventListener("click", () => {
      activeType = tab.dataset.type;
      document.querySelectorAll(".tab[data-type]").forEach((t) => {
        const on = t === tab;
        t.classList.toggle("active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
      });
      for (const type of ["url", "text", "contact"]) {
        $(`#form-${type}`).hidden = type !== activeType;
      }
      update();
    });
  });

  // ---------- Inputs ----------
  const inputs = ["urlInput", "textInput", "cFirst", "cLast", "cPhone", "cEmail", "cOrg", "cUrl"];
  inputs.forEach((id) => $("#" + id).addEventListener("input", update));

  $("#clearBtn").addEventListener("click", () => {
    inputs.forEach((id) => ($("#" + id).value = ""));
    update();
  });

  // ---------- Data builders ----------
  function formatUrl(url) {
    url = url.trim();
    if (!url) return "";
    return /^https?:\/\//i.test(url) ? url : "https://" + url;
  }

  // Escape vCard special chars per RFC 6350.
  const esc = (s) => (s || "").replace(/([\\,;])/g, "\\$1").replace(/\n/g, "\\n");

  function buildVCard() {
    const first = $("#cFirst").value.trim(), last = $("#cLast").value.trim();
    const phone = $("#cPhone").value.trim(), email = $("#cEmail").value.trim();
    const org = $("#cOrg").value.trim(), url = $("#cUrl").value.trim();
    if (!first && !last && !phone && !email && !org && !url) return "";
    const lines = ["BEGIN:VCARD", "VERSION:3.0"];
    lines.push(`N:${esc(last)};${esc(first)};;;`);
    lines.push(`FN:${esc((first + " " + last).trim())}`);
    if (org) lines.push(`ORG:${esc(org)}`);
    if (phone) lines.push(`TEL;TYPE=CELL:${esc(phone)}`);
    if (email) lines.push(`EMAIL:${esc(email)}`);
    if (url) lines.push(`URL:${esc(url)}`);
    lines.push("END:VCARD");
    return lines.join("\n");
  }

  function currentText() {
    if (activeType === "url") return formatUrl($("#urlInput").value);
    if (activeType === "text") return $("#textInput").value.trim();
    return buildVCard();
  }

  // ---------- Render ----------
  function update() {
    const text = currentText();
    currentData = text;

    if (!text) {
      canvas.hidden = true;
      placeholder.hidden = false;
      actions.hidden = true;
      dataPreview.hidden = true;
      return;
    }

    window.QRCode.toCanvas(canvas, text, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0d1117", light: "#ffffff" }, // on-brand dark on white for reliable scanning
    }, (err) => {
      if (err) {
        placeholder.hidden = false;
        placeholder.innerHTML = `<div class="dz-icon">⚠️</div><p>Too much data for one QR code — try shortening it.</p>`;
        canvas.hidden = true;
        actions.hidden = true;
        return;
      }
      placeholder.hidden = true;
      canvas.hidden = false;
      actions.hidden = false;
      dataPreview.hidden = false;
      dataText.textContent = text;
    });
  }

  // ---------- Download / copy ----------
  downloadBtn.addEventListener("click", () => {
    if (canvas.hidden) return;
    canvas.toBlob((b) => { if (b) saveBlob(b, `qr-${activeType}.png`); }, "image/png");
  });

  copyBtn.addEventListener("click", async () => {
    if (!currentData) return;
    try {
      await navigator.clipboard.writeText(currentData);
      const orig = copyBtn.textContent;
      copyBtn.textContent = "✓ Copied!";
      setTimeout(() => (copyBtn.textContent = orig), 1500);
    } catch { /* clipboard blocked */ }
  });

  update();
})();
