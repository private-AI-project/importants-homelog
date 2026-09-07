// 출산전후휴가급여 계산기.
//
// 이 제도에서 가장 헷갈리는 건 금액이 아니라 "누가 주는지" 다. 휴가 기간 전체를
// 정부가 주는 게 아니라, 최초 60일(다태아 75일)은 원래 회사 몫이고 정부는 남은
// 30일(다태아 45일)만 지원한다. 그런데 우선지원대상기업이면 정부가 전 기간을
// 대신 낸다. 그래서 회사 규모를 입력으로 받는다.
//
// 통상임금이 월 상한을 넘으면 그 차액은 회사가 채운다. 어느 쪽이든 받는 총액은
// 통상임금 100% 다. 이 계산기는 그 총액을 정부 몫과 회사 몫으로 갈라 보여준다.
//
// 상수는 아래 한 곳에 모았다. 상한액이 바뀌면 여기만 고치면 된다.

(function () {
  "use strict";

  // ── 상수 ──────────────────────────────────────────────────

  // 2026년 고용보험 출산전후휴가급여 월 상한액.
  // 근거: 2026-09-05 출산전후휴가급여 글 (찾기쉬운 생활법령정보·정부24)
  var MONTHLY_CAP = 2200000;

  // 급여는 30일을 한 달로 봐서 일수로 환산한다. 글에 실린 최대치가 이 값으로
  // 맞는다. 90일 660만원, 미숙아 100일 7,333,330원, 다태아 120일 880만원.
  var DAYS_PER_MONTH = 30;
  var DAILY_CAP = MONTHLY_CAP / DAYS_PER_MONTH;

  // 출산 유형별 총 휴가일수와, 근로기준법상 회사가 유급으로 낼 최초 구간.
  // 다태아만 최초 75일로 따로 정해져 있다. 미숙아 100일은 최초 구간이 글에
  // 없어 일반과 같은 60일로 두고, 화면에서 확인하라고 알린다.
  var BIRTH_TYPES = {
    single: { label: "일반",   total: 90,  firstPaid: 60, note: "" },
    preterm: { label: "미숙아", total: 100, firstPaid: 60,
               note: "미숙아 출산의 최초 구간 구분은 고용노동부령에 따릅니다. 대규모기업 소속이면 고용센터에 확인하세요." },
    twins:  { label: "다태아", total: 120, firstPaid: 75, note: "" },
  };

  var MAX_WAGE = 30000000;   // 월 3천만원. 실수로 0을 더 눌렀을 때를 막는다

  // ── 계산 ──────────────────────────────────────────────────

  function calculate(input) {
    var b = BIRTH_TYPES[input.birth] || BIRTH_TYPES.single;
    var monthly = input.wage;
    var daily = monthly / DAYS_PER_MONTH;

    // 우선지원대상기업이면 정부가 전 기간을 낸다. 대규모기업이면 최초 구간은
    // 회사 몫이고 정부는 나머지만 낸다.
    var isSmall = input.company === "small";
    var govDays = isSmall ? b.total : (b.total - b.firstPaid);
    var firmOnlyDays = b.total - govDays;

    var perDay = Math.min(daily, DAILY_CAP);
    var gov = Math.floor(perDay * govDays);

    // 받는 총액은 통상임금 100% 다. 정부가 낸 나머지는 회사가 채운다.
    var total = Math.floor(daily * b.total);
    var firm = Math.max(0, total - gov);

    return {
      birth: b,
      monthly: monthly,
      daily: daily,
      isSmall: isSmall,
      govDays: govDays,
      firmOnlyDays: firmOnlyDays,
      gov: gov,
      firm: firm,
      total: total,
      capped: daily > DAILY_CAP,
      // 통상임금이 상한 이상일 때 정부가 낼 수 있는 최대치
      govMax: Math.floor(DAILY_CAP * govDays),
    };
  }

  // ── 화면 ──────────────────────────────────────────────────

  function won(n) { return Math.round(n).toLocaleString("ko-KR") + "원"; }

  function render(r) {
    var box = document.getElementById("calc-result");
    var html = "";

    html += '<p class="calc-label">' + r.birth.label + " · " + r.birth.total +
            "일 · " + (r.isSmall ? "우선지원대상기업" : "대규모기업") + "</p>";
    html += '<p class="calc-amount">' + won(r.gov) + "</p>";
    html += '<p class="calc-sub">고용보험이 지급하는 금액</p>';

    html += '<div class="calc-table-wrap"><table class="calc-table"><thead><tr>' +
            "<th>주는 곳</th><th>기간</th><th>금액</th></tr></thead><tbody>";
    html += "<tr><td>고용보험(정부)</td><td>" + r.govDays + "일</td><td>" + won(r.gov) + "</td></tr>";
    if (r.firmOnlyDays > 0 || r.firm > 0) {
      html += "<tr><td>회사</td><td>" +
              (r.firmOnlyDays > 0 ? "최초 " + r.firmOnlyDays + "일" : "상한 초과분 보전") +
              "</td><td>" + won(r.firm) + "</td></tr>";
    }
    html += '<tr class="on"><td>합계</td><td>' + r.birth.total + "일</td><td>" +
            won(r.total) + "</td></tr>";
    html += "</tbody></table></div>";

    html += '<ul class="calc-notes">';
    html += "<li>휴가 기간 " + r.birth.total + "일 동안 <strong>통상임금 100%</strong>를 받습니다. 위 표는 그 돈을 누가 내는지 가른 것입니다</li>";
    if (r.isSmall) {
      html += "<li>우선지원대상기업(중소기업 등)이라 정부가 전 기간을 지급합니다</li>";
    } else {
      html += "<li>대규모기업은 최초 " + r.firmOnlyDays + "일이 회사 몫이고 정부는 남은 " +
              r.govDays + "일만 지급합니다</li>";
    }
    if (r.capped) {
      html += "<li>통상임금이 월 상한 " + won(MONTHLY_CAP) + "을 넘어서, 정부 지급액이 " +
              won(r.govMax) + "에서 멈춥니다. 차액 " + won(r.firm) + "은 회사가 채웁니다</li>";
    } else {
      html += "<li>통상임금이 월 상한 " + won(MONTHLY_CAP) + " 안이라 상한에 걸리지 않습니다</li>";
    }
    if (r.monthly < 1000000) {
      // 하한액은 시간급 최저임금으로 산정되는데 그 값이 근거 글에 없다.
      // 계산하지 않고 알리기만 한다.
      html += "<li>넣으신 통상임금이 낮아 <strong>하한액</strong>이 적용될 수 있습니다. 하한액은 시간급 최저임금을 기준으로 산정되며 이 계산에는 반영되지 않았습니다</li>";
    }
    html += "<li>신청은 휴가 시작 후 1개월부터 휴가 종료 후 12개월 안에 고용24에서 합니다. 휴가 전에는 신청이 안 됩니다</li>";
    if (r.birth.note) {
      html += "<li>" + r.birth.note + "</li>";
    }
    html += "</ul>";

    html += '<div class="calc-actions">';
    html += '<a class="calc-btn primary" href="https://www.work24.go.kr" target="_blank" rel="noopener">고용24에서 출산전후휴가급여 신청</a>';
    html += "</div>";

    html += '<div class="calc-share">';
    html += '<span class="calc-share-label">결과 공유하기</span>';
    html += '<div class="calc-share-btns">';
    html += '<button class="share-btn kakao" type="button" data-share="native">카카오톡·메시지</button>';
    html += '<button class="share-btn x" type="button" data-share="x">X</button>';
    html += '<button class="share-btn link" type="button" data-share="copy">링크 복사</button>';
    html += "</div></div>";

    html += '<p class="calc-disclaimer">통상임금과 상한액만 반영한 <strong>간이 계산</strong>입니다. 하한액은 시간급 최저임금을 기준으로 따로 산정되고, 회사가 휴가 중 지급한 금품이 있으면 정부 지급액에서 조정됩니다. 우선지원대상기업 해당 여부와 실제 지급액은 회사 인사팀이나 관할 고용센터(국번없이 1350)에 확인하세요.</p>';

    box.innerHTML = html;
    box.hidden = false;

    var url = "https://home.importants-studio.com/tools/maternity-leave-calculator/";
    var shareText = "출산전후휴가 " + r.birth.total + "일 동안 고용보험에서 " + won(r.gov) +
                    " 지급 대상이래요 (홈로그 간이계산기)";

    box.querySelectorAll("[data-share]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var mode = btn.getAttribute("data-share");
        if (mode === "native") {
          if (navigator.share) {
            navigator.share({ title: "출산전후휴가급여 계산기", text: shareText, url: url }).catch(function () {});
          } else {
            copyTo(btn, shareText + "\n" + url, "복사됨 (카톡에 붙여넣기)");
          }
        } else if (mode === "x") {
          window.open(
            "https://twitter.com/intent/tweet?text=" + encodeURIComponent(shareText) + "&url=" + encodeURIComponent(url),
            "_blank", "noopener"
          );
        } else {
          copyTo(btn, url, "링크 복사됨");
        }
      });
    });

    function copyTo(btn, text, done) {
      var original = btn.textContent;
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = done;
        setTimeout(function () { btn.textContent = original; }, 2000);
      });
    }

    // 스크롤은 마지막에 한다. 위에 두면 이게 터질 때 공유 버튼 연결까지 같이 죽는다.
    if (box.scrollIntoView) box.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("maternity-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var wage = parseInt(String(form.elements.wage.value).replace(/[,\s원]/g, ""), 10);
      if (!wage || wage < 100000 || wage > MAX_WAGE) { form.elements.wage.select(); return; }
      render(calculate({
        wage: wage,
        birth: form.elements.birth.value,
        company: form.elements.company.value,
      }));
    });
  });

  window.__maternity = { calculate: calculate, MONTHLY_CAP: MONTHLY_CAP, DAILY_CAP: DAILY_CAP, BIRTH_TYPES: BIRTH_TYPES };
})();
