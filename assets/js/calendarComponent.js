export function createCalendarComponent() {
  // Cria o contêiner principal do calendário
  const calendarEl = document.createElement("div");
  calendarEl.classList.add("calendar");

  // ----- Cria a seção de opções (selects de mês e ano) -----
  const opts = document.createElement("div");
  opts.classList.add("calendar__opts");

  const selectMonth = document.createElement("select");
  selectMonth.id = "calendar__month";
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  months.forEach((m, index) => {
    const opt = document.createElement("option");
    opt.value = index;
    opt.textContent = m;
    selectMonth.appendChild(opt);
  });

  const selectYear = document.createElement("select");
  selectYear.id = "calendar__year";
  [2025, 2026].forEach(y => {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    selectYear.appendChild(opt);
  });

  opts.appendChild(selectMonth);
  opts.appendChild(selectYear);
  calendarEl.appendChild(opts);

  // ----- Cria o corpo do calendário (dias da semana e datas) -----
  const bodyEl = document.createElement("div");
  bodyEl.classList.add("calendar__body");

  const daysEl = document.createElement("div");
  daysEl.classList.add("calendar__days");
  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  days.forEach(d => {
    const dayDiv = document.createElement("div");
    dayDiv.textContent = d;
    daysEl.appendChild(dayDiv);
  });
  bodyEl.appendChild(daysEl);

  const datesEl = document.createElement("div");
  datesEl.classList.add("calendar__dates");
  datesEl.id = "calendar__dates";
  bodyEl.appendChild(datesEl);

  calendarEl.appendChild(bodyEl);

  // ----- Cria a seção de botões -----
  const buttonsEl = document.createElement("div");
  buttonsEl.classList.add("calendar__buttons");
  const btnBack = document.createElement("button");
  btnBack.className = "calendar__button calendar__button--grey";
  btnBack.textContent = "Voltar";
  const btnApply = document.createElement("button");
  btnApply.className = "calendar__button calendar__button--primary";
  btnApply.textContent = "Confirmar";
  buttonsEl.appendChild(btnBack);
  buttonsEl.appendChild(btnApply);
  calendarEl.appendChild(buttonsEl);

  // ----- Funções de construção do calendário e lógica de seleção -----
  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function getWeekDayIndex(date) {
    return (date.getDay() + 6) % 7;
  }

  let globalClickableDates = [];
  let startSelected = null, endSelected = null;

  function buildCalendar(year, month) {
    datesEl.innerHTML = "";
    globalClickableDates = [];

    const totalDaysCurrent = getDaysInMonth(year, month);
    const firstDay = new Date(year, month, 1);
    const startWeekIndex = getWeekDayIndex(firstDay);
    const totalCells = 42;
    let daysArray = [];

    if (startWeekIndex > 0) {
      let prevMonth = month - 1;
      let prevYear = year;
      if (prevMonth < 0) {
        prevMonth = 11;
        prevYear--;
      }
      const totalDaysPrev = getDaysInMonth(prevYear, prevMonth);
      for (let i = startWeekIndex; i > 0; i--) {
        const dayNum = totalDaysPrev - i + 1;
        daysArray.push({ day: dayNum, inCurrent: false, date: new Date(prevYear, prevMonth, dayNum) });
      }
    }

    for (let d = 1; d <= totalDaysCurrent; d++) {
      daysArray.push({ day: d, inCurrent: true, date: new Date(year, month, d) });
    }

    const remaining = totalCells - daysArray.length;
    if (remaining > 0) {
      let nextMonth = month + 1;
      let nextYear = year;
      if (nextMonth > 11) {
        nextMonth = 0;
        nextYear++;
      }
      for (let d = 1; d <= remaining; d++) {
        daysArray.push({ day: d, inCurrent: false, date: new Date(nextYear, nextMonth, d) });
      }
    }

    daysArray.forEach((obj, i) => {
      const cell = document.createElement("div");
      cell.classList.add("calendar__date");
      if (!obj.inCurrent) cell.classList.add("calendar__date--grey");
      const daySpan = document.createElement("span");
      daySpan.textContent = obj.day.toString();
      cell.appendChild(daySpan);
      globalClickableDates.push(cell);
      cell.addEventListener("click", () => handleDateClick(cell));
      datesEl.appendChild(cell);
    });

    function handleDateClick(clickedEl) {
      if (startSelected !== null && endSelected !== null) {
        clearRange(globalClickableDates);
      }
      const index = globalClickableDates.indexOf(clickedEl);
      if (startSelected === null) {
        startSelected = index;
        clickedEl.classList.add("calendar__date--selected", "calendar__date--first-date", "calendar__date--range-start");
      } else if (endSelected === null) {
        if (index === startSelected) {
          clickedEl.classList.remove("calendar__date--selected", "calendar__date--first-date", "calendar__date--range-start");
          startSelected = null;
          return;
        }
        endSelected = index;
        const startPos = Math.min(startSelected, endSelected);
        const endPos = Math.max(startSelected, endSelected);
        globalClickableDates.forEach((el, i) => {
          if (i === startPos) el.classList.add("calendar__date--selected", "calendar__date--first-date", "calendar__date--range-start");
          else if (i === endPos) el.classList.add("calendar__date--selected", "calendar__date--last-date", "calendar__date--range-end");
          else if (i > startPos && i < endPos) el.classList.add("calendar__date--selected");
        });
      }
    }
  }

  function clearRange(clickableDates) {
    clickableDates.forEach(el => {
      el.classList.remove(
        "calendar__date--selected",
        "calendar__date--first-date",
        "calendar__date--range-start",
        "calendar__date--last-date",
        "calendar__date--range-end"
      );
    });
    startSelected = null;
    endSelected = null;
  }

  function onChangeMonthYear() {
    const year = parseInt(selectYear.value, 10);
    const month = parseInt(selectMonth.value, 10);
    startSelected = null;
    endSelected = null;
    buildCalendar(year, month);
  }

  selectMonth.addEventListener("change", onChangeMonthYear);
  selectYear.addEventListener("change", onChangeMonthYear);

  // Inicia
  onChangeMonthYear();

  return calendarEl;
}
