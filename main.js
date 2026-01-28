
    // // Back to form
    // const FORM_URL = "https://forms.office.com/r/qAsT3PeL60";
    // document.getElementById("backToForm").href = FORM_URL;

    // const params = new URLSearchParams(window.location.search);
    // const name = params.get("Name");
    // const box = params.get("BoxNo");

    // const result = document.getElementById("result");


    // if (Name && BoxNo) {
    //   result.innerHTML = `
    //     คุณ <strong>${Name}</strong><br>
    //     ได้ทำการส่ง <span class="box">Box หมายเลข ${BoxNo}</span><br>
    //     เรียบร้อยแล้ว ✅
    //   `;
    // } else {
    //   result.innerHTML = `
    //     <span class="error">
    //       ไม่พบข้อมูล<br>
    //       กรุณาเข้าผ่านลิงก์ที่ได้รับหลังจากส่งแบบฟอร์ม
    //     </span>
    //   `;
    // }



 (function () {
  // 1) ตั้งลิงก์กลับแบบฟอร์ม
  const FORM_URL = "https://forms.office.com/r/qAsT3PeL60";
  const backBtn = document.getElementById("backToForm");
  if (backBtn) backBtn.href = FORM_URL;

  // 2) ที่แสดงผล
  const result = document.getElementById("result");
  if (!result) return; // ถ้าไม่มี result ให้หยุดอย่างปลอดภัย

  // 3) อ่านค่าพารามิเตอร์
  const params = new URLSearchParams(window.location.search);
  const dataParam = params.get("data");

  let name = "";
  let box  = "";

  if (dataParam) {
    try {
      const jsonStr = decodeURIComponent(dataParam);
      const obj = JSON.parse(jsonStr);

      // รองรับทั้ง key แบบเล็กและใหญ่
      name = (
        obj?.name ??
        obj?.Name ??
        ""
      ).toString().trim();

      box = (
        obj?.boxNo ??
        obj?.BoxNo ??
        ""
      ).toString().trim();
    } catch (err) {
      console.error("Cannot parse data param:", err);
    }
  } else {
    // Fallback: ลิงก์เก่าแบบ query เดี่ยว
    name = (params.get("Name") ?? params.get("name") ?? "").toString().trim();
    box  = (params.get("BoxNo") ?? params.get("box") ?? "").toString().trim();
  }

  // 4) แสดงผล
  if (name && box) {
    const strong = document.createElement("strong");
    strong.textContent = name;

    const boxSpan = document.createElement("span");
    boxSpan.className = "box";
    boxSpan.textContent = `Box หมายเลข ${box}`;

    result.innerHTML = "";
    const line1 = document.createTextNode("คุณ ");
    const br1 = document.createElement("br");
    const br2 = document.createElement("br");
    const tail = document.createTextNode("เรียบร้อยแล้ว ✅");

    result.appendChild(line1);
    result.appendChild(strong);
    result.appendChild(br1);
    result.appendChild(boxSpan);
    result.appendChild(br2);
    result.appendChild(tail);
  } else {
    result.innerHTML = `
      <span class="error">
        ไม่พบข้อมูล<br>
        กรุณาเข้าผ่านลิงก์ที่ได้รับหลังจากส่งแบบฟอร์ม
      </span>
    `;
  }
})();
``
