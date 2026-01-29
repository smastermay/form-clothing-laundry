(() => {
  // ====== Config ======
  const FORM_URL = "https://forms.office.com/r/qAsT3PeL60";
  const TIMEOUT_MS = 12000;

  // ✅ OneDrive/SharePoint download link ของคุณ
  const DATA_URL =
    "https://hoyagw-my.sharepoint.com/personal/kaikaewsu_hoya_com/_layouts/15/download.aspx?UniqueId=3e6f477d99a84e76af34d9048e08a34f";

  // ====== DOM helpers ======
  const $ = (id) => document.getElementById(id);

  const render = (el, html) => (el.innerHTML = html);

  const renderError = (el, message, extra = "") => {
    render(
      el,
      `<span class="error">${message}${extra ? `<br>${extra}` : ""}</span>`
    );
  };

  const renderLoading = (el) => {
    render(el, `<span class="loading">กำลังโหลดข้อมูล…</span>`);
  };

  const esc = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  const renderSuccess = (el, rec) => {
    const name = rec.name ?? rec.Name ?? "";
    const boxNo = rec.boxNo ?? rec.BoxNo ?? "";
    const code = rec.Code ?? rec.code ?? "";
    const type = rec.type ?? rec.Type ?? "";
    const ts = rec.timestamp ?? rec.Timestamp ?? "";

    render(
      el,
      `
      <div>คุณ <strong>${esc(name)}</strong></div>
      <div>ได้ทำการส่ง <span class="box">Box หมายเลข ${esc(boxNo)}</span> เรียบร้อยแล้ว ✅</div>
      <div style="margin-top:8px;opacity:.85;font-size:.95em">
        <div><b>Code:</b> ${esc(code)} | <b>Type:</b> ${esc(type)}</div>
        ${ts ? `<div><b>Timestamp:</b> ${esc(ts)}</div>` : ""}
      </div>
      `
    );
  };

  // ====== Fetch with timeout ======
  const fetchTextWithTimeout = async (url, timeoutMs = TIMEOUT_MS) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { cache: "no-store", signal: controller.signal });
      return res;
    } finally {
      clearTimeout(timer);
    }
  };

  // ====== Parsing (รองรับหลายรูปแบบ) ======
  // 1) JSON array ปกติ: [ {...}, {...} ]
  // 2) NDJSON: {"..."}\n{"..."}
  // 3) แบบ append แปลก ๆ: [] [ {...} ] [ {...} ] หรือ [] [{".."}]
  //    (ของคุณเป็นแนวนี้) [1](https://hoyagw-my.sharepoint.com/personal/kaikaewsu_hoya_com/Documents/data_json/data.json)

  const tryParseJson = (s) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };

  // state machine ดึงทุก JSON object {...} ออกมาแบบไม่พังกับ quote/escape
  const extractJsonObjects = (text) => {
    const out = [];
    let i = 0;

    while (i < text.length) {
      // หา '{'
      while (i < text.length && text[i] !== "{") i++;
      if (i >= text.length) break;

      let start = i;
      let depth = 0;
      let inStr = false;
      let escNext = false;

      for (; i < text.length; i++) {
        const ch = text[i];

        if (inStr) {
          if (escNext) {
            escNext = false;
          } else if (ch === "\\") {
            escNext = true;
          } else if (ch === '"') {
            inStr = false;
          }
          continue;
        } else {
          if (ch === '"') inStr = true;
          else if (ch === "{") depth++;
          else if (ch === "}") {
            depth--;
            if (depth === 0) {
              const chunk = text.slice(start, i + 1);
              const obj = tryParseJson(chunk);
              if (obj && typeof obj === "object" && !Array.isArray(obj)) out.push(obj);
              i++; // move past '}'
              break;
            }
          }
        }
      }
    }
    return out;
  };

  const parseDataToArray = (text) => {
    const trimmed = text.trim();

    // A) ถ้าเป็น JSON ปกติ
    const parsed = tryParseJson(trimmed);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") return [parsed];

    // B) NDJSON (หลายบรรทัด)
    const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const nd = [];
    let allLinesJson = true;
    for (const line of lines) {
      if (!line.startsWith("{")) { allLinesJson = false; break; }
      const o = tryParseJson(line);
      if (!o) { allLinesJson = false; break; }
      nd.push(o);
    }
    if (allLinesJson && nd.length) return nd;

    // C) fallback: ดึงทุก {...} ในไฟล์ (เหมาะกับรูปแบบ append ของคุณ) [1](https://hoyagw-my.sharepoint.com/personal/kaikaewsu_hoya_com/Documents/data_json/data.json)
    return extractJsonObjects(trimmed);
  };

  // ====== Search ======
  const norm = (s) =>
    String(s ?? "").trim().replace(/\s+/g, " ").toLowerCase();

  const findRecord = (arr, code, type) => {
    const c = norm(code);
    const t = norm(type);

    // ถ้าหลายรายการตรงกัน ให้เอา "ล่าสุด" โดยดู timestamp ถ้ามี
    const matches = arr.filter((r) => {
      const rc = norm(r?.Code ?? r?.code);
      const rt = norm(r?.type ?? r?.Type);
      return rc === c && rt === t;
    });

    if (!matches.length) return null;

    matches.sort((a, b) => {
      const ta = Date.parse(a?.timestamp ?? a?.Timestamp ?? "") || 0;
      const tb = Date.parse(b?.timestamp ?? b?.Timestamp ?? "") || 0;
      return tb - ta;
    });

    return matches[0];
  };

  // ====== Main ======
  const backBtn = $("backToForm");
  if (backBtn) backBtn.href = FORM_URL;

  const resultEl = $("result");
  const codeEl = $("code");
  const typeEl = $("type");
  const btn = $("btnSearch");

  if (!resultEl || !codeEl || !typeEl || !btn) return;

  const loadData = async () => {
    const url = `${DATA_URL}&v=${Date.now()}`; // กัน cache
    const res = await fetchTextWithTimeout(url);

    if (!res.ok) {
      throw new Error(`โหลด data.json ไม่สำเร็จ: ${res.status}`);
    }

    const text = await res.text();
    const arr = parseDataToArray(text);

    if (!Array.isArray(arr) || arr.length === 0) {
      throw new Error("ไม่พบข้อมูลใน data.json หรือรูปแบบข้อมูลไม่ถูกต้อง");
    }

    return arr;
  };

  const onSearch = async () => {
    const code = codeEl.value.trim();
    const type = typeEl.value.trim();

    if (!code || !type) {
      renderError(resultEl, "กรุณากรอก Code และเลือก Type ให้ครบ");
      return;
    }

    renderLoading(resultEl);

    try {
      const arr = await loadData();
      const rec = findRecord(arr, code, type);

      if (!rec) {
        renderError(
          resultEl,
          "ไม่พบข้อมูลที่ตรงกับ Code + Type",
          "ตรวจสอบว่า Code/Type ถูกต้อง และข้อมูลถูกบันทึกลง data.json แล้ว"
        );
        return;
      }

      renderSuccess(resultEl, rec);
    } catch (err) {
      console.error(err);
      const timeoutMsg = err?.name === "AbortError" ? "หมดเวลาเชื่อมต่อ (timeout)" : "";
      renderError(
        resultEl,
        "ไม่สามารถโหลด/ค้นหาข้อมูลได้",
        timeoutMsg || err?.message || "โปรดลองอีกครั้ง"
      );
    }
  };

(() => {
  // ====== Config ======
  const FORM_URL = "https://forms.office.com/r/qAsT3PeL60";
  const TIMEOUT_MS = 12000;

  // ✅ OneDrive/SharePoint download link ของคุณ
  const DATA_URL =
    "https://hoyagw-my.sharepoint.com/personal/kaikaewsu_hoya_com/_layouts/15/download.aspx?UniqueId=3e6f477d99a84e76af34d9048e08a34f";

  // ====== DOM helpers ======
  const $ = (id) => document.getElementById(id);

  const render = (el, html) => (el.innerHTML = html);

  const renderError = (el, message, extra = "") => {
    render(
      el,
      `<span class="error">${message}${extra ? `<br>${extra}` : ""}</span>`
    );
  };

  const renderLoading = (el) => {
    render(el, `<span class="loading">กำลังโหลดข้อมูล…</span>`);
  };

  const esc = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  const renderSuccess = (el, rec) => {
    const name = rec.name ?? rec.Name ?? "";
    const boxNo = rec.boxNo ?? rec.BoxNo ?? "";
    const code = rec.Code ?? rec.code ?? "";
    const type = rec.type ?? rec.Type ?? "";
    const ts = rec.timestamp ?? rec.Timestamp ?? "";

    render(
      el,
      `
      <div>คุณ <strong>${esc(name)}</strong></div>
      <div>ได้ทำการส่ง <span class="box">Box หมายเลข ${esc(boxNo)}</span> เรียบร้อยแล้ว ✅</div>
      <div style="margin-top:8px;opacity:.85;font-size:.95em">
        <div><b>Code:</b> ${esc(code)} | <b>Type:</b> ${esc(type)}</div>
        ${ts ? `<div><b>Timestamp:</b> ${esc(ts)}</div>` : ""}
      </div>
      `
    );
  };

  // ====== Fetch with timeout ======
  const fetchTextWithTimeout = async (url, timeoutMs = TIMEOUT_MS) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { cache: "no-store", signal: controller.signal });
      return res;
    } finally {
      clearTimeout(timer);
    }
  };

  // ====== Parsing (รองรับหลายรูปแบบ) ======
  // 1) JSON array ปกติ: [ {...}, {...} ]
  // 2) NDJSON: {"..."}\n{"..."}
  // 3) แบบ append แปลก ๆ: [] [ {...} ] [ {...} ] หรือ [] [{".."}]
  //    (ของคุณเป็นแนวนี้) [1](https://hoyagw-my.sharepoint.com/personal/kaikaewsu_hoya_com/Documents/data_json/data.json)

  const tryParseJson = (s) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };

  // state machine ดึงทุก JSON object {...} ออกมาแบบไม่พังกับ quote/escape
  const extractJsonObjects = (text) => {
    const out = [];
    let i = 0;

    while (i < text.length) {
      // หา '{'
      while (i < text.length && text[i] !== "{") i++;
      if (i >= text.length) break;

      let start = i;
      let depth = 0;
      let inStr = false;
      let escNext = false;

      for (; i < text.length; i++) {
        const ch = text[i];

        if (inStr) {
          if (escNext) {
            escNext = false;
          } else if (ch === "\\") {
            escNext = true;
          } else if (ch === '"') {
            inStr = false;
          }
          continue;
        } else {
          if (ch === '"') inStr = true;
          else if (ch === "{") depth++;
          else if (ch === "}") {
            depth--;
            if (depth === 0) {
              const chunk = text.slice(start, i + 1);
              const obj = tryParseJson(chunk);
              if (obj && typeof obj === "object" && !Array.isArray(obj)) out.push(obj);
              i++; // move past '}'
              break;
            }
          }
        }
      }
    }
    return out;
  };

  const parseDataToArray = (text) => {
    const trimmed = text.trim();

    // A) ถ้าเป็น JSON ปกติ
    const parsed = tryParseJson(trimmed);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") return [parsed];

    // B) NDJSON (หลายบรรทัด)
    const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const nd = [];
    let allLinesJson = true;
    for (const line of lines) {
      if (!line.startsWith("{")) { allLinesJson = false; break; }
      const o = tryParseJson(line);
      if (!o) { allLinesJson = false; break; }
      nd.push(o);
    }
    if (allLinesJson && nd.length) return nd;

    // C) fallback: ดึงทุก {...} ในไฟล์ (เหมาะกับรูปแบบ append ของคุณ) [1](https://hoyagw-my.sharepoint.com/personal/kaikaewsu_hoya_com/Documents/data_json/data.json)
    return extractJsonObjects(trimmed);
  };

  // ====== Search ======
  const norm = (s) =>
    String(s ?? "").trim().replace(/\s+/g, " ").toLowerCase();

  const findRecord = (arr, code, type) => {
    const c = norm(code);
    const t = norm(type);

    // ถ้าหลายรายการตรงกัน ให้เอา "ล่าสุด" โดยดู timestamp ถ้ามี
    const matches = arr.filter((r) => {
      const rc = norm(r?.Code ?? r?.code);
      const rt = norm(r?.type ?? r?.Type);
      return rc === c && rt === t;
    });

    if (!matches.length) return null;

    matches.sort((a, b) => {
      const ta = Date.parse(a?.timestamp ?? a?.Timestamp ?? "") || 0;
      const tb = Date.parse(b?.timestamp ?? b?.Timestamp ?? "") || 0;
      return tb - ta;
    });

    return matches[0];
  };

  // ====== Main ======
  const backBtn = $("backToForm");
  if (backBtn) backBtn.href = FORM_URL;

  const resultEl = $("result");
  const codeEl = $("code");
  const typeEl = $("type");
  const btn = $("btnSearch");

  if (!resultEl || !codeEl || !typeEl || !btn) return;

  const loadData = async () => {
    const url = `${DATA_URL}&v=${Date.now()}`; // กัน cache
    const res = await fetchTextWithTimeout(url);

    if (!res.ok) {
      throw new Error(`โหลด data.json ไม่สำเร็จ: ${res.status}`);
    }

    const text = await res.text();
    const arr = parseDataToArray(text);

    if (!Array.isArray(arr) || arr.length === 0) {
      throw new Error("ไม่พบข้อมูลใน data.json หรือรูปแบบข้อมูลไม่ถูกต้อง");
    }

    return arr;
  };

  const onSearch = async () => {
    const code = codeEl.value.trim();
    const type = typeEl.value.trim();

    if (!code || !type) {
      renderError(resultEl, "กรุณากรอก Code และเลือก Type ให้ครบ");
      return;
    }

    renderLoading(resultEl);

    try {
      const arr = await loadData();
      const rec = findRecord(arr, code, type);

      if (!rec) {
        renderError(
          resultEl,
          "ไม่พบข้อมูลที่ตรงกับ Code + Type",
          "ตรวจสอบว่า Code/Type ถูกต้อง และข้อมูลถูกบันทึกลง data.json แล้ว"
        );
        return;
      }

      renderSuccess(resultEl, rec);
    } catch (err) {
      console.error(err);
      const timeoutMsg = err?.name === "AbortError" ? "หมดเวลาเชื่อมต่อ (timeout)" : "";
      renderError(
        resultEl,
        "ไม่สามารถโหลด/ค้นหาข้อมูลได้",
        timeoutMsg || err?.message || "โปรดลองอีกครั้ง"
      );
    }
  };

btn.addEventListener("click", onSearch);

// กด Enter ในช่อง Code เพื่อค้นหาได้
codeEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") onSearch();
});
})();
})();

