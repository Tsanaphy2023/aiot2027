/**
 * LEQs SciRBRU Digital Precision Farming & Deep AI
 * Interactive Portal Controller (Pure Vanilla JavaScript)
 */

// ==========================================================================
// 1. Navigation & Tab Management
// ==========================================================================
function switchPortalTab(tabId) {
  // Hide all tab panes
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });

  // Remove active state from nav buttons
  document.querySelectorAll('.nav-item-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Activate selected tab pane
  const targetPane = document.getElementById(`tab-${tabId}`);
  if (targetPane) {
    targetPane.classList.add('active');
  }

  // Activate selected nav button
  const targetBtn = document.getElementById(`nav-btn-${tabId}`);
  if (targetBtn) {
    targetBtn.classList.add('active');
  }
  const targetMobileBtn = document.getElementById(`mnav-${tabId}`);
  if (targetMobileBtn) {
    targetMobileBtn.classList.add('active');
  }

  // Scroll to top smoothly
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Toggle Dark / Light Theme
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.textContent = next === 'dark' ? '🌓' : '☀️';
  }
}

// ==========================================================================
// 2. Schedule Day Toggler
// ==========================================================================
function switchScheduleDay(dayNum) {
  document.querySelectorAll('.day-tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.day-content-pane').forEach(pane => pane.style.display = 'none');

  const activeBtn = document.getElementById(`btn-day-${dayNum}`);
  const activePane = document.getElementById(`day-${dayNum}-timeline`);

  if (activeBtn) activeBtn.classList.add('active');
  if (activePane) activePane.style.display = 'flex';
}

// ==========================================================================
// 3. Virtual Lab Simulator
// ==========================================================================
const labState = {
  soil: 45,
  temp: 29.5,
  light: 65,
  valve: false,
  pump: false,
  mist: false,
  fan: false,
  aiAuto: true
};

function updateLabSim() {
  const soilSlider = document.getElementById('sim-soil-slider');
  const tempSlider = document.getElementById('sim-temp-slider');
  const lightSlider = document.getElementById('sim-light-slider');

  if (soilSlider) labState.soil = parseFloat(soilSlider.value);
  if (tempSlider) labState.temp = parseFloat(tempSlider.value);
  if (lightSlider) labState.light = parseFloat(lightSlider.value);

  // Update readouts
  const soilVal = document.getElementById('val-soil');
  const tempVal = document.getElementById('val-temp');
  const lightVal = document.getElementById('val-light');

  if (soilVal) soilVal.textContent = `${labState.soil}%`;
  if (tempVal) tempVal.textContent = `${labState.temp}°C`;
  if (lightVal) lightVal.textContent = `${labState.light} klux`;

  // Plant emotion / health calculation
  const plantEl = document.getElementById('sim-plant-avatar');
  const soilBed = document.getElementById('sim-soil-bed');
  const statusBadge = document.getElementById('sim-health-badge');

  if (plantEl && soilBed) {
    if (labState.soil < 30) {
      plantEl.textContent = '🥀';
      plantEl.style.transform = 'scale(0.85) rotate(-15deg)';
      soilBed.style.background = '#5c4033'; // dry cracked
      if (statusBadge) {
        statusBadge.textContent = '⚠️ ดินแห้งแล้ง (Drought Stress)';
        statusBadge.className = 'status-tag danger';
      }
    } else if (labState.soil > 75) {
      plantEl.textContent = '💧🌿';
      plantEl.style.transform = 'scale(1.05)';
      soilBed.style.background = '#271c19'; // soaked
      if (statusBadge) {
        statusBadge.textContent = '💧 ดินชุ่มน้ำสูง (Saturated)';
        statusBadge.className = 'status-tag info';
      }
    } else {
      plantEl.textContent = '🌱✨';
      plantEl.style.transform = 'scale(1.1) rotate(0deg)';
      soilBed.style.background = '#3e2723';
      if (statusBadge) {
        statusBadge.textContent = '✅ สภาพแวดล้อมสมบูรณ์ (Optimum)';
        statusBadge.className = 'status-tag success';
      }
    }
  }

  // AI Autonomous Irrigation logic
  if (labState.aiAuto) {
    const aiDecisionText = document.getElementById('ai-decision-text');
    if (labState.soil < 40) {
      setActuator('valve', true);
      setActuator('pump', true);
      if (aiDecisionText) aiDecisionText.innerHTML = '<span style="color:#10b981;">⚡ AI ทำงาน: ดิน < 40% สั่งเปิดวาล์ว + ปั๊มน้ำอัตโนมัติ</span>';
    } else if (labState.soil >= 60) {
      setActuator('valve', false);
      setActuator('pump', false);
      if (aiDecisionText) aiDecisionText.innerHTML = '<span style="color:#0ea5e9;">✨ AI สแตนด์บาย: ความชื้นดินเพียงพอแล้ว</span>';
    }

    if (labState.temp > 34) {
      setActuator('fan', true);
      setActuator('mist', true);
    } else if (labState.temp <= 30) {
      setActuator('fan', false);
      setActuator('mist', false);
    }
  }
}

function setActuator(type, state) {
  labState[type] = state;
  const toggle = document.getElementById(`toggle-${type}`);
  const row = document.getElementById(`row-${type}`);
  if (toggle) toggle.checked = state;
  if (row) {
    if (state) row.classList.add('active');
    else row.classList.remove('active');
  }

  // Water spray visual
  const spray = document.getElementById('sim-water-spray');
  if (spray) {
    if (labState.valve || labState.pump) spray.style.display = 'block';
    else spray.style.display = 'none';
  }
}

function toggleActuator(type) {
  const toggle = document.getElementById(`toggle-${type}`);
  if (toggle) {
    setActuator(type, toggle.checked);
  }
}

function toggleAiAuto() {
  const aiToggle = document.getElementById('toggle-ai-auto');
  if (aiToggle) {
    labState.aiAuto = aiToggle.checked;
    updateLabSim();
  }
}

// ==========================================================================
// 4. AI Coding Assistant Presets
// ==========================================================================
const codePresets = {
  arduino_soil: {
    title: "1. อ่านค่าเซนเซอร์ความชื้นดินและแปลงค่า (Arduino C++)",
    lang: "C++ (Arduino IDE)",
    code: `/*
 * LEQs SciRBRU Digital Precision Farming & Deep AI
 * โค้ดอ่านค่า Capacitive Soil Moisture Sensor ด้วยบอร์ด ESP32
 */

#define SOIL_PIN 34    // ขาเซนเซอร์ ADC1 (GPIO34)
#define DRY_VALUE 3100 // ค่า ADC เมื่อเซนเซอร์แห้งสนิท
#define WET_VALUE 1350 // ค่า ADC เมื่อเซนเซอร์จุ่มน้ำ

void setup() {
  Serial.begin(115200);
  analogReadResolution(12); // ตั้งค่าความละเอียด 12-bit (0-4095)
  delay(1000);
  Serial.println("🌱 เริ่มต้นระบบตรวจวัดความชื้นดิน LEQs SciRBRU...");
}

void loop() {
  int rawADC = analogRead(SOIL_PIN);
  
  // แปลงค่า ADC เป็นเปอร์เซ็นต์ความชื้น (0 - 100%)
  int soilPercent = map(rawADC, DRY_VALUE, WET_VALUE, 0, 100);
  soilPercent = constrain(soilPercent, 0, 100); // จำกัดช่วง 0-100%

  Serial.printf("📊 ADC: %d | ความชื้นในดิน: %d %%\n", rawADC, soilPercent);
  
  if (soilPercent < 40) {
    Serial.println("⚠️ ดินแห้งเกินไป: ควรเปิดระบบรดน้ำ");
  }

  delay(2000);
}`
  },

  arduino_ai_edge: {
    title: "2. รันโมเดล Deep Learning พยากรณ์บน ESP32 (Edge AI)",
    lang: "C++ (Arduino IDE)",
    code: `/*
 * LEQs SciRBRU Edge AI: Neural Network Inference on ESP32
 * โหลดค่าน้ำหนัก W1, W2 จากการเทรนบน AI Studio เพื่อพยากรณ์ความชื้นล่วงหน้า
 */

#include "esp32_ai_weights.h" // ไฟล์น้ำหนักที่ Export มาจาก AI Studio

#define RELAY_VALVE_PIN 18    // ขาควบคุมวาล์วน้ำ

// ฟังก์ชันเปิดใช้งาน Activation Function (ReLU)
float relu(float x) {
  return (x > 0.0f) ? x : 0.0f;
}

// ทำการส่งข้อมูลผ่านโครงข่ายประสาทเทียม (Forward Propagation)
void predictIrrigation(float soil, float temp, float humidity, float light) {
  // Normalize Inputs (0.0 - 1.0)
  float inputs[4] = { soil / 100.0f, temp / 50.0f, humidity / 100.0f, light / 100.0f };
  float hidden[8] = {0};
  float outputs[2] = {0}; // [0]: Predicted Soil (+3h), [1]: Plant Stress Index

  // ชั้นที่ 1: Input -> Hidden Layer
  for (int h = 0; h < AI_HIDDEN_DIM; h++) {
    for (int i = 0; i < AI_INPUT_DIM; i++) {
      hidden[h] += inputs[i] * W1[i][h];
    }
    hidden[h] = relu(hidden[h]);
  }

  // ชั้นที่ 2: Hidden -> Output Layer
  for (int o = 0; o < AI_OUTPUT_DIM; o++) {
    for (int h = 0; h < AI_HIDDEN_DIM; h++) {
      outputs[o] += hidden[h] * W2[h][o];
    }
  }

  float predictedSoil = outputs[0] * 100.0f;
  float stressIndex = outputs[1] * 10.0f;

  Serial.printf("🔮 [AI Forecast] ความชื้นอีก 3 ชม.ข้างหน้า: %.1f %%\n", predictedSoil);
  Serial.printf("🚨 [AI Stress Index] ดัชนีความเครียดพืช: %.1f / 10\n", stressIndex);

  // ตัดสินใจสั่งการอัตโนมัติ
  if (predictedSoil < 38.0f || stressIndex > 6.0f) {
    digitalWrite(RELAY_VALVE_PIN, HIGH);
    Serial.println("🤖 AI Action: สั่งเปิดวาล์วรดน้ำป้องกันพืชเหี่ยวเฉาล่วงหน้า!");
  } else {
    digitalWrite(RELAY_VALVE_PIN, LOW);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_VALVE_PIN, OUTPUT);
  digitalWrite(RELAY_VALVE_PIN, LOW);
}

void loop() {
  // อ่านค่าเซนเซอร์จำลอง
  predictIrrigation(42.5f, 31.0f, 65.0f, 75.0f);
  delay(5000);
}`
  },

  micropython_farm: {
    title: "3. ระบบควบคุมฟาร์มอัจฉริยะด้วย MicroPython (Thonny IDE)",
    lang: "Python (MicroPython)",
    code: `# LEQs SciRBRU Digital Precision Farming & Deep AI
# สคริปต์ MicroPython สำหรับบอร์ด ESP32

from machine import Pin, ADC
import time

soil_adc = ADC(Pin(34))
soil_adc.atten(ADC.ATTN_11DB) # 0-3.3V

relay_valve = Pin(18, Pin.OUT)
relay_pump = Pin(19, Pin.OUT)

print("🌱 LEQs SciRBRU MicroPython Smart Farm Ready...")

while True:
    raw = soil_adc.read()
    # คำนวณความชื้นดิน
    soil_percent = max(0, min(100, int((3100 - raw) / (3100 - 1350) * 100)))
    
    print(f"📊 Soil: {soil_percent}% (Raw ADC: {raw})")
    
    if soil_percent < 40:
        relay_valve.value(1) # เปิดวาล์ว
        relay_pump.value(1)  # เปิดปั๊ม
        print("💧 รดน้ำอัตโนมัติ...")
    else:
        relay_valve.value(0)
        relay_pump.value(0)
        
    time.sleep(2)`
  }
};

function selectCodePreset(key) {
  document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
  const btn = document.getElementById(`preset-${key}`);
  if (btn) btn.classList.add('active');

  const preset = codePresets[key];
  if (preset) {
    document.getElementById('code-display-title').textContent = preset.title;
    document.getElementById('code-lang-label').textContent = preset.lang;
    document.getElementById('code-snippet-box').textContent = preset.code;
  }
}

function copyCodeToClipboard() {
  const codeText = document.getElementById('code-snippet-box').textContent;
  navigator.clipboard.writeText(codeText).then(() => {
    const btn = document.getElementById('btn-copy-code');
    const old = btn.innerHTML;
    btn.innerHTML = '✅ คัดลอกสำเร็จ!';
    setTimeout(() => { btn.innerHTML = old; }, 2000);
  });
}

// ==========================================================================
// 5. Pre-test & Post-test Interactive Quiz
// ==========================================================================
const quizQuestions = [
  {
    q: "1. ในสมการพันธุกรรมทางการเกษตร P = G + E + (G × E) องค์ประกอบ G × E สื่อถึงสิ่งใด?",
    options: [
      "ปฏิสัมพันธ์ระหว่างพันธุกรรมกับสิ่งแวดล้อม (Genotype × Environment Interaction)",
      "ผลรวมของคุณภาพอาหารและน้ำที่ให้กับพืช",
      "การเติบโตของจีโนไทป์ในอุดมคติ",
      "การกลายพันธุ์ของลักษณะที่ปรากฏภายนอก"
    ],
    ans: 0,
    explain: "G×E คือการที่พืชแต่ละสายพันธุ์มีการตอบสนองต่อสภาพแวดล้อมที่แตกต่างกัน เป็นหัวใจของการเกษตรแม่นยำ"
  },
  {
    q: "2. อุปกรณ์ชนิดใดทำหน้าที่วัดปริมาณรังสีดวงอาทิตย์หรือความเข้มแสงแดดที่พืชได้รับอย่างแม่นยำ?",
    options: [
      "Pyranometer / เซนเซอร์แสง Lux",
      "Hygrometer วัดความชื้น",
      "Barometer วัดความกดอากาศ",
      "Anemometer วัดความเร็วลม"
    ],
    ans: 0,
    explain: "Pyranometer และ Digital Lux Sensor ใช้สำหรับวัดฟลักซ์การแผ่รังสีของดวงอาทิตย์"
  },
  {
    q: "3. เซนเซอร์วัดความชื้นในดินชนิด Capacitive ดีกว่าชนิด Resistive (ตัวนำสัมผัส) ในแง่ใด?",
    options: [
      "ไม่เกิดการกัดกร่อนจากกระแสไฟฟ้าเคมี (No Corrosion) และมีอายุการใช้งานยาวนานกว่า",
      "ราคาถูกกว่ามาก",
      "ใช้สายไฟเพียงเส้นเดียว",
      "ไม่ต้องใช้แรงดันไฟเลี้ยง"
    ],
    ans: 0,
    explain: "Capacitive Soil Sensor วัดค่าความจุไฟฟ้าผ่านฉนวนเคลือบผิว จึงไม่ถูกกัดกร่อนโดยความชื้นและแร่ธาตุในดิน"
  },
  {
    q: "4. การทำ Edge AI บนบอร์ด ESP32 มีข้อได้เปรียบที่สำคัญที่สุดอย่างไรในการทำฟาร์มเกษตรแม่นยำ?",
    options: [
      "บอร์ดสามารถประมวลผลโมเดลและตัดสินใจรดน้ำได้ทันทีโดยไม่ต้องพึ่งพาอินเทอร์เน็ตตลอดเวลา (Offline Resilience)",
      "ทำให้บอร์ดไม่ต้องใช้ไฟเลี้ยง",
      "เพิ่มระยะสัญญาณ Wi-Fi ได้ 10 กิโลเมตร",
      "ทำให้เซนเซอร์ทุกตัวไม่ต้องต่อสายไฟ"
    ],
    ans: 0,
    explain: "Edge AI ช่วยให้ไมโครคอนโทรลเลอร์ประมวลผลโครงข่ายประสาทเทียมได้ที่ตัวบอร์ดโดยตรง ตอบสนองเร็ว ปลอดภัย และทำงานได้แม้อินเทอร์เน็ตหลุด"
  },
  {
    q: "5. การพยากรณ์ความชื้นในดินล่วงหน้า 3 ชั่วโมงด้วย Deep Learning มีประโยชน์หลักในด้านใด?",
    options: [
      "ช่วยป้องกันความเครียดของพืช (Plant Stress) และประหยัดน้ำด้วยการรดน้ำก่อนดินแห้งจัด",
      "ช่วยเปลี่ยนสีใบพืชได้ตามต้องการ",
      "ทำให้พืชไม่ต้องสังเคราะห์ด้วยแสง",
      "ช่วยกำจัดวัชพืชอัตโนมัติ"
    ],
    ans: 0,
    explain: "การทำนายล่วงหน้าช่วยให้ระบบรดน้ำแบบ Proactive ป้องกันการเหี่ยวเฉาเฉียบพลัน และควบคุมปริมาณการใช้น้ำได้อย่างคุ้มค่าสูงสุด"
  }
];

function renderQuiz() {
  const quizContainer = document.getElementById('quiz-questions-list');
  if (!quizContainer) return;

  quizContainer.innerHTML = '';
  quizQuestions.forEach((item, index) => {
    const qDiv = document.createElement('div');
    qDiv.className = 'question-box';
    qDiv.id = `q-box-${index}`;

    let optionsHtml = '';
    item.options.forEach((opt, optIndex) => {
      optionsHtml += `
        <label class="choice-label" id="label-${index}-${optIndex}">
          <input type="radio" name="q_${index}" value="${optIndex}">
          <span>${opt}</span>
        </label>
      `;
    });

    qDiv.innerHTML = `
      <div class="question-title">${item.q}</div>
      <div class="choice-options">${optionsHtml}</div>
      <div class="quiz-feedback" id="feedback-${index}" style="display:none; margin-top:0.8rem; font-size:0.85rem; padding:0.6rem; border-radius:6px;"></div>
    `;

    quizContainer.appendChild(qDiv);
  });
}

function gradeQuiz() {
  let score = 0;
  let total = quizQuestions.length;

  quizQuestions.forEach((item, index) => {
    const selected = document.querySelector(`input[name="q_${index}"]:checked`);
    const feedback = document.getElementById(`feedback-${index}`);

    if (selected) {
      const val = parseInt(selected.value);
      if (val === item.ans) {
        score++;
        feedback.style.display = 'block';
        feedback.style.background = 'rgba(16, 185, 129, 0.15)';
        feedback.style.color = '#34d399';
        feedback.innerHTML = `✅ <b>ถูกต้อง!</b> ${item.explain}`;
      } else {
        feedback.style.display = 'block';
        feedback.style.background = 'rgba(239, 68, 68, 0.15)';
        feedback.style.color = '#f87171';
        feedback.innerHTML = `❌ <b>คำตอบที่ถูกต้องคือข้อ ${item.ans + 1}:</b> ${item.options[item.ans]}<br><small>${item.explain}</small>`;
      }
    } else {
      feedback.style.display = 'block';
      feedback.style.background = 'rgba(245, 158, 11, 0.15)';
      feedback.style.color = '#fbbf24';
      feedback.innerHTML = `⚠️ <i>ยังไม่ได้ตอบข้อนี้</i>`;
    }
  });

  const resultBox = document.getElementById('quiz-result-score');
  if (resultBox) {
    resultBox.style.display = 'block';
    const percent = Math.round((score / total) * 100);
    resultBox.innerHTML = `
      <h3>🎉 ผลการทดสอบ: ${score} / ${total} คะแนน (${percent}%)</h3>
      <p>${percent >= 80 ? '🌟 ยอดเยี่ยมมาก! ท่านมีความเข้าใจในระบบ AIoT และ Deep Learning เป็นอย่างดี' : '👍 ดีมาก! สามารถทบทวนบทเรียนและทำซ้ำได้ตามต้องการ'}</p>
    `;
    resultBox.scrollIntoView({ behavior: 'smooth' });

    // Send score to backend database
    const certName = document.getElementById('cert-name-input')?.value || 'ผู้เข้าอบรม';
    const certSchool = document.getElementById('cert-school-input')?.value || '-';
    fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullname: certName,
        school: certSchool,
        quiz_type: 'pretest',
        score: score,
        total: total
      })
    }).catch(e => console.log('Saved quiz offline'));
  }
}

// ==========================================================================
// 6. E-Certificate Live Generator
// ==========================================================================
function updateCertificatePreview() {
  const nameInput = document.getElementById('cert-name-input');
  const schoolInput = document.getElementById('cert-school-input');
  const dateInput = document.getElementById('cert-date-input');

  const previewName = document.getElementById('cert-preview-name');
  const previewSchool = document.getElementById('cert-preview-school');
  const previewDate = document.getElementById('cert-preview-date');

  if (nameInput && previewName) {
    previewName.textContent = nameInput.value.trim() || 'ชื่อ-นามสกุล ของท่าน';
  }
  if (schoolInput && previewSchool) {
    previewSchool.textContent = schoolInput.value.trim() || 'โรงเรียน / สถานศึกษา';
  }
  if (dateInput && previewDate) {
    previewDate.textContent = dateInput.value.trim() || '26 ธันวาคม 2568';
  }
}

function printCertificate() {
  window.print();
}

// ==========================================================================
// 7. Public Registration & Participant Directory System
// ==========================================================================
let publicParticipantsList = [];

function handleRoleChange(role) {
  const lbl = document.getElementById('lbl-grade-dept');
  const input = document.getElementById('reg-grade');
  if (role === 'teacher') {
    if (lbl) lbl.textContent = 'กลุ่มสาระการเรียนรู้ / ตำแหน่ง: *';
    if (input) input.placeholder = 'เช่น กลุ่มสาระฯ วิทยาศาสตร์และเทคโนโลยี';
  } else {
    if (lbl) lbl.textContent = 'ระดับชั้นการศึกษา (เช่น ม.4/1): *';
    if (input) input.placeholder = 'เช่น มัธยมศึกษาปีที่ 4/1';
  }
}

async function handlePublicRegistration(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-submit-reg');
  const errBox = document.getElementById('reg-error-box');
  const oldBtnText = btn.innerHTML;

  btn.disabled = true;
  btn.innerHTML = '⏳ กำลังบันทึกข้อมูล...';
  errBox.style.display = 'none';

  const payload = {
    prefix: document.getElementById('reg-prefix').value,
    fullname: document.getElementById('reg-fullname').value,
    role: document.getElementById('reg-role').value,
    food_pref: document.getElementById('reg-food').value,
    school: document.getElementById('reg-school').value,
    grade_dept: document.getElementById('reg-grade').value,
    phone: document.getElementById('reg-phone').value,
    email: document.getElementById('reg-email').value
  };

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    btn.disabled = false;
    btn.innerHTML = oldBtnText;

    if (data.success) {
      // Show confirmation card
      document.getElementById('reg-form-card').style.display = 'none';
      const successCard = document.getElementById('reg-success-card');
      successCard.style.display = 'block';

      document.getElementById('success-reg-code').textContent = data.reg_code;
      document.getElementById('success-reg-fullname').textContent = data.fullname;
      document.getElementById('success-reg-school').textContent = data.school;

      // Auto update Certificate Name & School
      const certName = document.getElementById('cert-name-input');
      const certSchool = document.getElementById('cert-school-input');
      if (certName) certName.value = data.fullname;
      if (certSchool) certSchool.value = data.school;
      updateCertificatePreview();

      // Refresh stats & list
      loadPublicStats();
      loadPublicParticipants();

      successCard.scrollIntoView({ behavior: 'smooth' });
    } else {
      errBox.style.display = 'block';
      errBox.textContent = data.error || 'เกิดข้อผิดพลาดในการลงทะเบียน';
    }
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = oldBtnText;
    errBox.style.display = 'block';
    errBox.textContent = 'ไม่สามารถเชื่อมต่อฐานข้อมูล กรุณาลองใหม่อีกครั้ง';
  }
}

function resetRegForm() {
  document.getElementById('public-reg-form').reset();
  document.getElementById('reg-form-card').style.display = 'block';
  document.getElementById('reg-success-card').style.display = 'none';
}

async function loadPublicStats() {
  try {
    const res = await fetch('/api/stats');
    const d = await res.json();
    if (d.success) {
      const qText = document.getElementById('reg-quota-text');
      const qBar = document.getElementById('reg-quota-bar');
      const pct = Math.min(100, Math.round((d.total / d.capacity) * 100));

      if (qText) qText.textContent = `สมัครแล้ว ${d.total} / ${d.capacity} ท่าน (${pct}%) • เหลืออีก ${Math.max(0, d.capacity - d.total)} ที่นั่ง`;
      if (qBar) qBar.style.width = `${pct}%`;
    }
  } catch (e) {
    console.log('Stats offline fallback');
  }
}

async function loadPublicParticipants() {
  const tbody = document.getElementById('public-participants-table-body');
  try {
    const res = await fetch('/api/participants');
    const d = await res.json();
    if (d.success && d.participants) {
      publicParticipantsList = d.participants;
      renderPublicParticipantsTable(publicParticipantsList);
    }
  } catch (e) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-dim);">ไม่สามารถโหลดข้อมูลรายชื่อได้</td></tr>';
  }
}

function renderPublicParticipantsTable(list) {
  const tbody = document.getElementById('public-participants-table-body');
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-dim);">ยังไม่มีรายชื่อผู้สมัคร</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(p => `
    <tr>
      <td><code style="color:var(--primary); font-weight:700;">${p.reg_code || '-'}</code></td>
      <td><b>${p.prefix} ${p.fullname}</b></td>
      <td>
        <span class="${p.role === 'teacher' ? 'badge-role-teacher' : 'badge-role-student'}">
          ${p.role === 'teacher' ? '👨‍🏫 ครู' : '🎓 นักเรียน'}
        </span>
      </td>
      <td>${p.school}</td>
      <td>${p.grade_dept || '-'}</td>
      <td>
        <span class="tag-badge" style="background:rgba(16,185,129,0.15); color:#34d399; border-color:rgba(16,185,129,0.3);">
          ✅ ยืนยันสิทธิ์แล้ว
        </span>
      </td>
    </tr>
  `).join('');
}

function filterPublicParticipants() {
  const q = document.getElementById('pub-search-input')?.value.toLowerCase().trim() || '';
  const role = document.getElementById('pub-role-select')?.value || 'all';

  const filtered = publicParticipantsList.filter(p => {
    const matchQ = (p.fullname && p.fullname.toLowerCase().includes(q)) ||
                   (p.school && p.school.toLowerCase().includes(q)) ||
                   (p.reg_code && p.reg_code.toLowerCase().includes(q));
    const matchRole = (role === 'all') || (p.role === role);
    return matchQ && matchRole;
  });

  renderPublicParticipantsTable(filtered);
}

async function loadDynamicCmsContent() {
  try {
    const res = await fetch('/api/content');
    const d = await res.json();
    if (d.success && d.content) {
      // Dynamic Announcement Banner
      if (d.content.announcement) {
        const container = document.getElementById('site-announcement-container');
        const textEl = document.getElementById('site-announcement-text');
        if (container && textEl) {
          textEl.textContent = d.content.announcement;
          container.style.display = 'flex';
        }
      }
    }
  } catch (e) {
    console.log('CMS offline fallback');
  }
}

// ==========================================================================
// Initializations
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  renderQuiz();
  selectCodePreset('arduino_soil');
  updateLabSim();
  loadPublicStats();
  loadPublicParticipants();
  loadDynamicCmsContent();
});

