
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
    const FORM_URL = "https://forms.office.com/r/qAsT3PeL60";
    document.getElementById("backToForm").href = FORM_URL;

    const params = new URLSearchParams(window.location.search);
    const result = document.getElementById("result");

    // --- 1) อ่าน JSON เดียวจากพารามิเตอร์ data ---
    const dataParam = params.get("data");
    let name = "";
    let box = "";

    if (dataParam) {
      try {
        // data ถูกส่งมาด้วย uriComponent(...) ใน Flow → ต้อง decode และ parse
        const jsonStr = decodeURIComponent(dataParam);
        const obj = JSON.parse(jsonStr);
        name = (obj?.name ?? "").toString().trim();
        box  = (obj?.boxNo ?? "").toString().trim();
      } catch (err) {
        console.error("Cannot parse data param:", err);
      }
    } else {
      // --- 2) Fallback: รองรับกรณีส่งเป็น query แยก (เผื่อมีลิงก์เก่า) ---
      name = (params.get("Name") ?? params.get("name") ?? "").toString().trim();
      box  = (params.get("BoxNo") ?? params.get("box") ?? "").toString().trim();
    }

    // --- 3) แสดงผล ---
    if (name && box) {
      // สร้างโหนดให้ปลอดภัยต่อ XSS มากกว่า innerHTML ตรง ๆ
      const strong = document.createElement("strong");
      strong.textContent = name;

      const boxSpan = document.createElement("span");
      boxSpan.className = "box";
      boxSpan.textContent = `Box หมายเลข ${box}`;

      // เคลียร์ก่อน
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

  
