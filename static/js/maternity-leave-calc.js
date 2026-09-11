// 출산전후휴가급여 계산기.
//
// 이 제도에서 가장 헷갈리는 건 금액이 아니라 "누가 주는지" 다. 휴가 기간 전체를
// 정부가 주는 게 아니라, 최초 60일(다태아 75일)은 원래 회사 몫이고 정부는 남은
// 30일(다태아 45일)만 지원한다. 그런데 우선지원대상기업이면 정부가 전 기간을
// 대신 낸다. 그래서 회사 규모를 입력으로 받는다.
//
// 차액 보전이 어디까지 붙는지가 이 계산의 핵심이다. 근로기준법 제74조 제4항은
// 최초 60일(다태아 75일)만 유급휴가로 정하고, 사업주는 통상임금 상당액이 지급된
// 범위에서 지급 책임을 면한다. 그래서 유급 구간에서만 회사가 차액을 채운다.
// 나머지 30일(다태아 45일)은 급여 책임 규정이 없는 무급 구간이라 고용보험 상한이
// 곧 전부다.
//
// 처음에는 총액을 통상임금 90일분으로 잡고 정부 지급액을 뺀 나머지를 회사 몫으로
// 돌렸다. 그러면 무급 구간의 차액까지 회사에 얹혀서, 통상임금 300만원일 때 회사
// 240만원 · 총 900만원이 나왔다. 실제로는 회사 160만원 · 총 820만원이다.
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

    var perDay = Math.min(daily, DAILY_CAP);
    var isSmall = input.company === "small";

    var paidDays = b.firstPaid;                  // 유급 구간
    var unpaidDays = b.total - b.firstPaid;      // 무급 구간

    // 유급 구간은 통상임금 100% 가 보장된다. 우선지원대상기업이면 고용보험이
    // 상한까지 내고 남는 차액을 회사가 채운다. 대규모기업은 이 구간에 고용보험
    // 지원이 없어 회사가 전액 낸다.
    var paidTotal = daily * paidDays;
    var govPaid = isSmall ? perDay * paidDays : 0;
    var firm = Math.max(0, paidTotal - govPaid);

    // 무급 구간은 고용보험 상한까지가 전부다. 회사가 채울 의무가 없다.
    var govUnpaid = perDay * unpaidDays;

    var gov = Math.floor(govPaid + govUnpaid);
    firm = Math.floor(firm);

    return {
      birth: b,
      monthly: monthly,
      daily: daily,
      isSmall: isSmall,
      paidDays: paidDays,
      unpaidDays: unpaidDays,
      govPaid: Math.floor(govPaid),
      govUnpaid: Math.floor(govUnpaid),
      gov: gov,
      firm: firm,
      total: gov + firm,
      capped: daily > DAILY_CAP,
      // 상한에 걸리면 무급 구간에서 통상임금보다 덜 받는다. 그 부족분이다.
      shortfall: Math.floor(Math.max(0, (daily - perDay) * unpaidDays)),
      // 통상임금 전 기간분. 무급 구간 때문에 실제 수령이 이보다 적을 수 있다.
      fullWage: Math.floor(daily * b.total),
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

    // 구간으로 나눠 보여준다. 사람들이 틀리는 것이 금액이 아니라 "어느 구간까지
    // 통상임금이 보장되는지" 라서, 표의 첫 칸이 구간이어야 한다.
    html += '<div class="calc-table-wrap"><table class="calc-table"><thead><tr>' +
            "<th>구간</th><th>주는 곳</th><th>금액</th></tr></thead><tbody>";
    if (r.govPaid > 0) {
      html += "<tr><td>최초 " + r.paidDays + "일 (유급)</td><td>고용보험</td><td>" +
              won(r.govPaid) + "</td></tr>";
    }
    if (r.firm > 0) {
      html += "<tr><td>최초 " + r.paidDays + "일 (유급)</td><td>회사" +
              (r.isSmall ? " 보전" : "") + "</td><td>" + won(r.firm) + "</td></tr>";
    }
    html += "<tr><td>나머지 " + r.unpaidDays + "일 (무급)</td><td>고용보험</td><td>" +
            won(r.govUnpaid) + "</td></tr>";
    html += '<tr class="on"><td>합계</td><td>' + r.birth.total + "일</td><td>" +
            won(r.total) + "</td></tr>";
    html += "</tbody></table></div>";

    html += '<ul class="calc-notes">';
    html += "<li>최초 " + r.paidDays + "일은 근로기준법상 <strong>유급</strong>이라 통상임금 100%가 보장됩니다</li>";
    html += "<li>나머지 " + r.unpaidDays + "일은 급여 책임 규정이 없는 <strong>무급 구간</strong>입니다. 고용보험이 주는 금액까지가 전부고 회사가 채울 의무가 없습니다</li>";
    if (r.isSmall) {
      html += "<li>우선지원대상기업(중소기업 등)이라 고용보험이 전 기간을 지급합니다</li>";
    } else {
      html += "<li>대규모기업은 최초 " + r.paidDays + "일에 고용보험 지원이 없어 회사가 전액 지급하고, 고용보험은 남은 " +
              r.unpaidDays + "일만 지급합니다</li>";
    }
    if (r.capped) {
      html += "<li>통상임금이 월 상한 " + won(MONTHLY_CAP) + "을 넘습니다. 유급 구간의 차액 " +
              won(r.firm) + "은 회사가 채우지만, 무급 구간은 상한까지만 나옵니다</li>";
      html += "<li>그래서 통상임금 " + r.birth.total + "일분인 " + won(r.fullWage) +
              "보다 <strong>" + won(r.shortfall) + " 적은</strong> " + won(r.total) + "을 받습니다</li>";
    } else {
      html += "<li>통상임금이 월 상한 " + won(MONTHLY_CAP) + " 안이라 상한에 걸리지 않습니다. " +
              r.birth.total + "일 전체가 통상임금 100%로 채워집니다</li>";
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
    if (window.gtag) gtag("event", "tool_result", { tool_path: location.pathname });

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
