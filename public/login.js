document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorText = document.getElementById('errorText');
    const togglePassword = document.getElementById('togglePassword');

    const eyeOpen = `<svg viewBox="0 0 24 24" fill="none" stroke="#718096" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px; height:20px;
    "><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    const eyeClose = `<svg viewBox="0 0 24 24" fill="none" stroke="#718096" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px; height:20px;
    "><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

    togglePassword.innerHTML = eyeClose;

    // --- 1. ระบบเปิด-ปิดตา ---
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        // สลับไอคอน
        togglePassword.innerHTML = type === 'password' ? eyeClose : eyeOpen;
    });

    // --- 2. ระบบเช็ค Login ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const user = usernameInput.value;
        const pass = passwordInput.value;
        
        // ล้างค่า Error เก่า
        errorText.style.display = 'none';
        errorText.textContent = '';

        const thaiRegex = /[ก-ฮะ-าํิ-ูเ-์]/;
        const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;

        // เช็คภาษาไทย
        if (thaiRegex.test(pass)) {
            showError("❌ Username หรือ Password ไม่ถูกต้อง");
            return;
        }
        
        // เช็คตัวอักษรพิเศษ
        if (!specialCharRegex.test(pass)) {
            showError("❌ Username หรือ Password ไม่ถูกต้อง");
            return;
        }

        // เช็ค Admin Login
        // ตัวอย่างไฟล์ public/script.js
        // แก้ไขใน login.js บรรทัดที่ 48 เป็นต้นไป
        if (user === "admin" && pass === "MfcdIB?vlE.GYjJ1WXMaF0MFv.Y?0dO.") {
           sessionStorage.setItem("saved_username", user);
            
            // สำคัญ: ต้องเปลี่ยนหน้าไปที่ URL /dashboard (ตามที่ตั้งไว้ใน server.js)
            window.location.href = '/dashboard'; 
        } else {
            showError("❌ Username หรือ Password ไม่ถูกต้อง");
        }
                    });

    function showError(message) {
        errorText.textContent = message;
        errorText.style.display = 'block';
    }
});