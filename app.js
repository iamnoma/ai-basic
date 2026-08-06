/* ===================================================
   매일 체크리스트 - 동작
   체크, 저장, 날짜 계산을 담당합니다.
   =================================================== */


/* --------------------------------------------------
   1. 저장하기 / 불러오기
   기록은 브라우저 안(localStorage)에만 저장됩니다.
   -------------------------------------------------- */

const STORAGE_KEY = "dailyChecklistData";

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch (e) { /* 저장된 게 깨졌으면 아래 기본값으로 */ }
  }
  // 처음 실행할 때 예시 항목 넣어주기
  return {
    items: [
      { id: "sample1", name: "약 먹기" },
      { id: "sample2", name: "운동" },
      { id: "sample3", name: "물 마시기" }
    ],
    records: {}
  };
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let data = loadData();


/* --------------------------------------------------
   2. 날짜 다루기
   날짜는 "2026-08-05" 같은 글자 형태로 저장합니다.
   -------------------------------------------------- */

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getTodayKey() {
  return formatDateKey(new Date());
}

// "2026-08-05" 같은 글자를 다시 날짜로 되돌립니다
function parseDateKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

let todayKey = getTodayKey();   // 진짜 오늘 (자정이 지나면 갱신됨)
let selectedKey = todayKey;     // 지금 화면에서 보고 있는 날짜

const WEEKDAY_KR = ["일", "월", "화", "수", "목", "금", "토"];


/* --------------------------------------------------
   3. 화면 위쪽 날짜 표시
   -------------------------------------------------- */

function renderTodayLabel() {
  const d = parseDateKey(selectedKey);
  const label = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY_KR[d.getDay()]})`;
  document.getElementById("todayLabel").textContent = label;

  // 오늘/어제면 알아보기 쉽게 표시해줍니다
  const yesterday = parseDateKey(todayKey);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = formatDateKey(yesterday);

  let tag = "";
  if (selectedKey === todayKey) tag = "오늘";
  else if (selectedKey === yesterdayKey) tag = "어제 (지난 날 채우는 중)";
  else tag = "지난 날 채우는 중";
  document.getElementById("dateTag").textContent = tag;

  // 과거를 보고 있으면 배경을 살짝 바꾸고 "오늘로 돌아가기"를 띄웁니다
  document.body.classList.toggle("viewing-past", selectedKey !== todayKey);
  // 내일은 아직 오지 않았으니 못 넘어가게 막습니다
  document.getElementById("nextDayBtn").disabled = (selectedKey === todayKey);
}

// 창을 켜둔 채 날짜가 바뀌었는지 확인합니다
function checkDateRollover() {
  const nowKey = getTodayKey();
  if (nowKey === todayKey) return;
  const wasOnToday = (selectedKey === todayKey);
  todayKey = nowKey;
  if (wasOnToday) selectedKey = nowKey;  // 오늘을 보고 있었으면 새 오늘로 따라갑니다
  renderTodayLabel();
  renderList();
}

// 하루 앞/뒤로 이동 (미래로는 못 갑니다)
function shiftDay(delta) {
  const d = parseDateKey(selectedKey);
  d.setDate(d.getDate() + delta);
  const key = formatDateKey(d);
  if (key > todayKey) return;
  selectedKey = key;
  renderTodayLabel();
  renderList();
}


/* --------------------------------------------------
   4. 한 달치 계산 (네모 줄에 쓰입니다)
   -------------------------------------------------- */

// 보고 있는 달의 하루하루를 훑어서 { 날짜키, 상태 } 목록을 만듭니다
function getMonthDays(itemId) {
  const base = parseDateKey(selectedKey);
  const year = base.getFullYear();
  const month = base.getMonth();
  // 다음 달의 0일 = 이번 달 마지막 날 (28/29/30/31 자동 계산)
  const lastDay = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let day = 1; day <= lastDay; day++) {
    const key = formatDateKey(new Date(year, month, day));
    let state;
    if (key > todayKey) state = "future";                                  // 아직 안 온 날
    else if (data.records[key] && data.records[key][itemId]) state = "done"; // 체크한 날
    else state = "miss";                                                   // 안 한 날
    days.push({ key, day, state });
  }
  return days;
}


/* --------------------------------------------------
   5. 체크 / 추가 / 삭제
   -------------------------------------------------- */

function toggleCheck(itemId, checked) {
  // 자정을 넘겼는데 아직 어제 화면을 보고 있었다면, 이 클릭은 무시하고 갱신만 합니다
  const before = selectedKey;
  checkDateRollover();
  if (selectedKey !== before) return;

  const key = selectedKey;  // 오늘이 아니라 "보고 있는 날짜"에 기록합니다
  if (!data.records[key]) data.records[key] = {};
  if (checked) {
    data.records[key][itemId] = true;
  } else {
    delete data.records[key][itemId];
  }
  saveData();
  renderList();
}

function addItem(name) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const id = "item_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
  data.items.push({ id, name: trimmed });
  saveData();
  renderList();
}

function deleteItem(itemId) {
  if (!confirm("이 항목을 삭제할까요? 기록도 함께 사라집니다.")) return;
  data.items = data.items.filter(it => it.id !== itemId);
  Object.keys(data.records).forEach(dateKey => {
    delete data.records[dateKey][itemId];
  });
  saveData();
  renderList();
}


/* --------------------------------------------------
   6. 항목 카드 그리기
   -------------------------------------------------- */

function renderList() {
  const viewKey = selectedKey;  // 지금 보고 있는 날짜 기준으로 그립니다
  const listEl = document.getElementById("itemList");
  const emptyMsg = document.getElementById("emptyMsg");
  listEl.innerHTML = "";

  if (data.items.length === 0) {
    emptyMsg.style.display = "block";
    return;
  }
  emptyMsg.style.display = "none";

  data.items.forEach(item => {
    const isChecked = !!(data.records[viewKey] && data.records[viewKey][item.id]);
    const monthDays = getMonthDays(item.id);
    const doneCount = monthDays.filter(d => d.state === "done").length;

    const row = document.createElement("div");
    row.className = "item" + (isChecked ? " done" : "");

    const top = document.createElement("div");
    top.className = "item-top";

    // label로 감싸면 그 안쪽 아무 데나 눌러도 체크박스가 켜집니다
    const main = document.createElement("label");
    main.className = "item-main";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = isChecked;
    checkbox.addEventListener("change", () => toggleCheck(item.id, checkbox.checked));

    const nameSpan = document.createElement("div");
    nameSpan.className = "name";
    nameSpan.textContent = item.name;

    const countSpan = document.createElement("div");
    countSpan.className = "month-count";
    countSpan.textContent = `✓ ${doneCount}일`;

    const delBtn = document.createElement("button");
    delBtn.className = "del-btn";
    delBtn.textContent = "×";
    delBtn.title = "삭제";
    delBtn.addEventListener("click", () => deleteItem(item.id));

    main.appendChild(checkbox);
    main.appendChild(nameSpan);
    main.appendChild(countSpan);
    top.appendChild(main);
    top.appendChild(delBtn);

    // 한 달치 네모 줄 (누르는 기능 없이 보기만)
    const strip = document.createElement("div");
    strip.className = "month-strip";
    // 넓은 화면이면 한 줄, 좁으면 반으로 접어 두 줄 (31일 -> 16칸 + 15칸)
    strip.style.setProperty("--cols", monthDays.length);
    strip.style.setProperty("--cols-half", Math.ceil(monthDays.length / 2));
    monthDays.forEach(d => {
      const cell = document.createElement("div");
      cell.className = "day-cell " + d.state + (d.key === selectedKey ? " is-selected" : "");
      const month = parseDateKey(d.key).getMonth() + 1;
      const label = d.state === "future" ? "아직 안 온 날"
                  : d.state === "done"   ? "함"
                  : "안 함";
      cell.title = `${month}월 ${d.day}일 · ${label}`;
      strip.appendChild(cell);
    });

    row.appendChild(top);
    row.appendChild(strip);
    listEl.appendChild(row);
  });
}


/* --------------------------------------------------
   7. 버튼 연결 및 시작
   -------------------------------------------------- */

document.getElementById("addBtn").addEventListener("click", () => {
  const input = document.getElementById("newItemInput");
  addItem(input.value);
  input.value = "";
  input.focus();
});

document.getElementById("newItemInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    document.getElementById("addBtn").click();
  }
});

document.getElementById("prevDayBtn").addEventListener("click", () => shiftDay(-1));
document.getElementById("nextDayBtn").addEventListener("click", () => shiftDay(1));
document.getElementById("backTodayBtn").addEventListener("click", () => {
  selectedKey = todayKey;
  renderTodayLabel();
  renderList();
});

// 날짜가 바뀌었는지 감시하는 세 가지 방법
setInterval(checkDateRollover, 30000);                // 30초마다 확인
window.addEventListener("focus", checkDateRollover);  // 창을 다시 클릭했을 때
document.addEventListener("visibilitychange", () => { // 탭을 다시 열었을 때
  if (!document.hidden) checkDateRollover();
});

// 화면 그리기 시작
renderTodayLabel();
renderList();
