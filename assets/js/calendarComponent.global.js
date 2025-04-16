// assets/js/calendarComponent.global.js
(function(window){
  function createCalendarComponent() {
    const calendarEl = document.createElement("div");
    calendarEl.classList.add("calendar");

    // ----- Options (month/year selects) -----
    const opts = document.createElement("div");
    opts.classList.add("calendar__opts");
    const selectMonth = document.createElement("select");
    selectMonth.id = "calendar__month";
    ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
      .forEach((m, i) => {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = m;
        selectMonth.append(opt);
      });
    const selectYear = document.createElement("select");
    selectYear.id = "calendar__year";
    [2025, 2026].forEach(y => {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      selectYear.append(opt);
    });
    opts.append(selectMonth, selectYear);
    calendarEl.append(opts);

    // ----- Body (day headers + dates) -----
    const bodyEl = document.createElement("div");
    bodyEl.classList.add("calendar__body");
    const daysEl = document.createElement("div");
    daysEl.classList.add("calendar__days");
    ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"]
      .forEach(d => {
        const div = document.createElement("div");
        div.textContent = d;
        daysEl.append(div);
      });
    const datesEl = document.createElement("div");
    datesEl.classList.add("calendar__dates");
    bodyEl.append(daysEl, datesEl);
    calendarEl.append(bodyEl);

    // ----- Buttons -----
    const buttonsEl = document.createElement("div");
    buttonsEl.classList.add("calendar__buttons");
    const btnBack = document.createElement("button");
    btnBack.className = "calendar__button calendar__button--grey";
    btnBack.textContent = "Voltar";
    const btnApply = document.createElement("button");
    btnApply.className = "calendar__button calendar__button--primary";
    btnApply.textContent = "Confirmar";
    buttonsEl.append(btnBack, btnApply);
    calendarEl.append(buttonsEl);

    // ----- Helpers -----
    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const weekdayIdx = date => (date.getDay() + 6) % 7;

    let cells = [], start = null, end = null;
    function build(year, month) {
      datesEl.innerHTML = "";
      cells = [];
      const totalDays = getDaysInMonth(year, month);
      const firstDay = new Date(year, month, 1);
      const offset = weekdayIdx(firstDay);

      // Previous month tail
      if (offset > 0) {
        const prevMonth = month - 1 < 0 ? 11 : month - 1;
        const prevYear = month - 1 < 0 ? year - 1 : year;
        const prevDays = getDaysInMonth(prevYear, prevMonth);
        for (let i = offset; i > 0; i--) {
          cells.push({ day: prevDays - i + 1, inCurrent: false });
        }
      }
      // Current month
      for (let d = 1; d <= totalDays; d++) {
        cells.push({ day: d, inCurrent: true });
      }
      // Next month head
      while (cells.length < 42) {
        cells.push({ day: cells.length - totalDays + 1, inCurrent: false });
      }

      cells.forEach((obj, i) => {
        const cell = document.createElement("div");
        cell.classList.add("calendar__date");
        if (!obj.inCurrent) cell.classList.add("calendar__date--grey");
        const span = document.createElement("span");
        span.textContent = obj.day;
        cell.append(span);
        cell.addEventListener("click", () => selectDate(i, cell));
        datesEl.append(cell);
      });
    }

    function clearSelection() {
      calendarEl.querySelectorAll(".calendar__date--selected").forEach(el => {
        el.classList.remove(
          "calendar__date--selected",
          "calendar__date--first-date",
          "calendar__date--last-date",
          "calendar__date--range-start",
          "calendar__date--range-end"
        );
      });
      start = end = null;
    }

    function selectDate(idx, el) {
      if (start !== null && end !== null) clearSelection();
      if (start === null) {
        start = idx;
        el.classList.add(
          "calendar__date--selected",
          "calendar__date--first-date",
          "calendar__date--range-start"
        );
      } else {
        if (idx === start) {
          el.classList.remove(
            "calendar__date--selected",
            "calendar__date--first-date",
            "calendar__date--range-start"
          );
          start = null;
          return;
        }
        end = idx;
        const s = Math.min(start, end);
        const e = Math.max(start, end);
        Array.from(datesEl.children).forEach((c, i) => {
          if (i === s) {
            c.classList.add(
              "calendar__date--selected",
              "calendar__date--first-date",
              "calendar__date--range-start"
            );
          } else if (i === e) {
            c.classList.add(
              "calendar__date--selected",
              "calendar__date--last-date",
              "calendar__date--range-end"
            );
          } else if (i > s && i < e) {
            c.classList.add("calendar__date--selected");
          }
        });
      }
    }

    // Rebuild on change
    selectMonth.addEventListener("change", () => {
      start = end = null;
      build(+selectYear.value, +selectMonth.value);
    });
    selectYear.addEventListener("change", () => {
      start = end = null;
      build(+selectYear.value, +selectMonth.value);
    });

    // Initial build
    build(+selectYear.value, +selectMonth.value);

    return calendarEl;
  }

  // Export globally
  window.createCalendarComponent = createCalendarComponent;
})(window);
