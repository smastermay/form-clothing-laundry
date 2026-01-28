
    // Back to form
    const FORM_URL = "https://forms.office.com/r/qAsT3PeL60";
    document.getElementById("backToForm").href = FORM_URL;

    const params = new URLSearchParams(window.location.search);
    const name = params.get("Name");
    const box = params.get("BoxNo");

    const result = document.getElementById("result");


    if (Name && BoxNo) {
      result.innerHTML = `
        คุณ <strong>${Name}</strong><br>
        ได้ทำการส่ง <span class="box">Box หมายเลข ${BoxNo}</span><br>
        เรียบร้อยแล้ว ✅
      `;
    } else {
      result.innerHTML = `
        <span class="error">
          ไม่พบข้อมูล<br>
          กรุณาเข้าผ่านลิงก์ที่ได้รับหลังจากส่งแบบฟอร์ม
        </span>
      `;
    }

    // 🌙 Dark mode (จำค่าไว้)
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.body.classList.add("dark");
    }

    function toggleDarkMode() {
      document.body.classList.toggle("dark");
      localStorage.setItem(
        "theme",
        document.body.classList.contains("dark") ? "dark" : "light"
      );
    }