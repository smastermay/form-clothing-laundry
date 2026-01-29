
(() => {
  // ====== Config ======
  const FORM_URL = "https://forms.office.com/r/qAsT3PeL60";
  const SUBMISSION_DIR = "./submissions";
  const TIMEOUT_MS = 8000;

  const DATA_URL =
  "https://hoyagw-my.sharepoint.com/personal/kaikaewsu_hoya_com/_layouts/15/download.aspx?UniqueId=3e6f477d99a84e76af34d9048e08a34f"

  
async function loadData() {
  const res = await fetch(DATA_URL, {
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error("โหลด JSON ไม่สำเร็จ");
  }

  const data = await res.json();
  console.log(data);
}


  // ====== Helpers ======
  const $ = (id) => document.getElementById(id);

  const setBackLink = () => {
    const backBtn = $("backToForm");
    if (backBtn) backBtn.href = FORM_URL;
  };

  // อนุญาตเฉพาะ a-z A-Z 0-9 _ - (กัน ../ หรืออักขระแปลก)
  const sanitizeId = (raw) => {
    if (!raw) return "";
    const trimmed = String(raw).trim();
    return /^[A-Za-z0-9_-]+$/.test(trimmed) ? trimmed : "";
  };

  const pickValue = (obj, keys) => {
    for (const k of keys) {
      const v = obj?.[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
    }
    return "";
  };

  const renderError = (resultEl, message, extra = "") => {
    // ใช้ innerHTML เฉพาะ markup ที่เราคุมเอง (ไม่ใส่ input user)
    resultEl.innerHTML = `
      <span class="error">
        ${message}${extra ? `<br>${extra}` : ""}
      </span>
    `;
  };

  const renderLoading = (resultEl) => {
    resultEl.innerHTML = `
      <span class="loading">กำลังโหลดผลลัพธ์…</span>
    `;
  };

  const renderSuccess = (resultEl, name, boxNo) => {
    // ปลอดภัย: สร้าง DOM ด้วย textContent
    resultEl.textContent = ""; // clear

    const line1 = document.createElement("div");
    line1.append("คุณ ");
    const strong = document.createElement("strong");
    strong.textContent = name;
    line1.appendChild(strong);

    const line2 = document.createElement("div");
    line2.append("ได้ทำการส่ง ");
    const box = document.createElement("span");
    box.className = "box";
    box.textContent = `Box หมายเลข ${boxNo}`;
    line2.appendChild(box);

    const line3 = document.createElement("div");
    line3.textContent = "เรียบร้อยแล้ว ✅";

    resultEl.append(line1, line2, line3);
  };

  const fetchWithTimeout = async (url, options = {}, timeoutMs = TIMEOUT_MS) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      return res;
    } finally {
      clearTimeout(timer);
    }
  };

  // ====== Main ======
  setBackLink();

  const resultEl = $("result");
  if (!resultEl) return;

  const params = new URLSearchParams(window.location.search);
  const id = sanitizeId(params.get("id"));

  if (!id) {
    renderError(
      resultEl,
      "ไม่พบรหัสผลลัพธ์ (id)",
    );
    return;
  }

  const fileUrl = `${SUBMISSION_DIR}/${encodeURIComponent(id)}.json?v=${Date.now()}`;

  const load = async () => {
    renderLoading(resultEl);

    try {
      const res = await fetchWithTimeout(fileUrl, { cache: "no-store" });

      if (!res.ok) {
        throw new Error(`โหลดไฟล์ไม่สำเร็จ: ${res.status}`);
      }

      const data = await res.json();

      const name = pickValue(data, ["name", "Name", "employeeName", "EmployeeName"]);
      const boxNo = pickValue(data, ["boxNo", "BoxNo", "boxNumber", "BoxNumber"]);

      if (!name || !boxNo) {
        renderError(resultEl, "พบข้อมูลแล้ว แต่ไม่ครบ (name/boxNo)");
        return;
      }

      renderSuccess(resultEl, name, boxNo);
    } catch (err) {
      console.error(err);

      // ถ้า abort (timeout)
      const timeoutMsg =
        err?.name === "AbortError" ? "หมดเวลาเชื่อมต่อ (timeout)" : "";

      renderError(
        resultEl,
        "ไม่สามารถโหลดผลลัพธ์ได้",
        timeoutMsg || "โปรดลองอีกครั้งในอีก 5–10 วินาที"
      );

      // (optional) ใส่ปุ่ม Retry ให้เลย
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "btn";
      retry.style.marginTop = "12px";
      retry.textContent = "ลองใหม่ (Retry)";
      retry.addEventListener("click", load);
      resultEl.appendChild(retry);
    }
  };

  load();
})();
