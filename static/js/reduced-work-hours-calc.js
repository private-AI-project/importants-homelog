// 육아기 근로시간 단축 급여 예상 계산기
// 기준: 2026년 1월 기준 고용24 제도 안내. 근거 데이터는 blog 글에서 교차 검증.
// 산정 방식은 고용보험법 시행령 산식을 그대로 적용한 "간이 계산"이며,
// 수당·상여가 섞인 실제 급여와는 차이가 날 수 있어 고용24 모의계산이 기준.

(function () {
  "use strict";

  // 최초 10시간분: 통상임금 100% 기준, 상한 250만원 / 하한 50만원
  var TIER1_CAP = 250;
  var TIER1_FLOOR = 50;
  // 10시간 초과분: 통상임금 80% 기준, 상한 160만원 (하한 없음)
  var TIER2_RATE = 0.8;
  var TIER2_CAP = 160;
  // 제도상 단축 후 근로시간 허용 범위: 주 15~35시간
  var MIN_AFTER_HOURS = 15;
  var MAX_AFTER_HOURS = 35;

  function calculate(input) {
    var wage = input.wage;
    var before = input.before;
    var after = input.after;
    var result = { notes: [] };

    if (wage <= 0 || before <= 0) {
      result.amount = 0;
      result.reason = "통상임금과 단축 전 근로시간을 입력해주세요.";
      return result;
    }

    var reduced = before - after;
    if (reduced <= 0) {
      result.amount = 0;
      result.reason = "단축 후 근로시간이 단축 전보다 적어야 계산할 수 있습니다.";
      return result;
    }

    if (after < MIN_AFTER_HOURS || after > MAX_AFTER_HOURS) {
      result.notes.push("단축 후 근로시간은 주 15~35시간이어야 제도 대상입니다. 입력하신 시간은 이 범위를 벗어나 참고용으로만 계산했습니다.");
    }

    var first10 = Math.min(reduced, 10);
    var over10 = Math.max(reduced - 10, 0);

    var base1 = Math.min(wage, TIER1_CAP);
    if (base1 < TIER1_FLOOR) base1 = TIER1_FLOOR;
    var base2 = Math.min(wage * TIER2_RATE, TIER2_CAP);

    var pay1 = base1 * (first10 / before);
    var pay2 = base2 * (over10 / before);

    result.amount = pay1 + pay2;
    result.reducedHours = reduced;
    return result;
  }

  // 범위로 제시 (간이 계산임을 반영해 ±10%)
  function toRange(v) {
    if (v <= 0) return null;
    var low = Math.max(0, Math.round(v * 0.9));
    var high = Math.round(v * 1.1);
    return { low: low, high: high };
  }

  function render(result) {
    var box = document.getElementById("calc-result");
    var html = "";

    if (result.amount <= 0) {
      html += '<p class="calc-amount none">계산할 수 없습니다</p>';
      html += '<p class="calc-reason">' + result.reason + "</p>";
    } else {
      var range = toRange(result.amount);
      html += '<p class="calc-label">예상 월 급여 보전액</p>';
      html += '<p class="calc-amount">약 ' + range.low.toLocaleString() + "만~" + range.high.toLocaleString() + "만원</p>";
    }

    if (result.notes.length) {
      html += '<ul class="calc-notes">';
      result.notes.forEach(function (n) { html += "<li>" + n + "</li>"; });
      html += "</ul>";
    }

    html += '<div class="calc-actions">';
    html += '<a class="calc-btn primary" href="https://www.work24.go.kr/cm/c/f/1100/selecSimulate13.do?currentPageNo=1&recordCountPerPage=10&upprSystClId=SC00000245&systClId=SC00000252&systId=SI00000397&systCnntId=CI00001582" target="_blank" rel="noopener">고용24 모의계산에서 정확한 금액 확인</a>';
    html += "</div>";
    html += '<div class="calc-share">';
    html += '<span class="calc-share-label">결과 공유하기</span>';
    html += '<div class="calc-share-btns">';
    html += '<button class="share-btn kakao" type="button" data-share="native">카카오톡·메시지</button>';
    html += '<button class="share-btn x" type="button" data-share="x">X</button>';
    html += '<button class="share-btn link" type="button" data-share="copy">링크 복사</button>';
    html += "</div></div>";
    html += '<p class="calc-disclaimer">이 계산기는 고용24 안내 기준을 단순화한 <strong>간이 모의계산</strong>이며, 입력값은 서버로 전송되지 않고 브라우저 안에서만 계산됩니다. 실제 수당·상여가 포함된 급여와는 차이가 날 수 있으니 확정 금액은 고용24 모의계산에서 확인하세요.</p>';

    box.innerHTML = html;
    box.hidden = false;
    box.scrollIntoView({ behavior: "smooth", block: "center" });

    var url = "https://home.importants-studio.com/tools/reduced-work-hours-calculator/";
    var range = toRange(result.amount);
    var summary = result.amount > 0
      ? "육아기 근로시간 단축 급여, 예상 월 보전액이 약 " + range.low + "만~" + range.high + "만원이래요"
      : "육아기 근로시간 단축 급여 예상액을 계산기로 확인해봤어요";
    var shareText = summary + " (홈로그 간이계산기)";

    box.querySelectorAll("[data-share]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var mode = btn.getAttribute("data-share");
        if (mode === "native") {
          if (navigator.share) {
            navigator.share({ title: "육아기 근로시간 단축 급여 계산기", text: shareText, url: url }).catch(function () {});
          } else {
            copyTo(btn, shareText + "\n" + url, "복사됨 (카톡에 붙여넣기)");
          }
        } else if (mode === "x") {
          window.open("https://twitter.com/intent/tweet?text=" + encodeURIComponent(shareText) + "&url=" + encodeURIComponent(url), "_blank", "noopener");
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
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("reduced-hours-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = {
        wage: parseFloat(form.elements.wage.value) || 0,
        before: parseFloat(form.elements.before.value) || 0,
        after: parseFloat(form.elements.after.value) || 0
      };
      render(calculate(input));
    });
  });

  // 테스트용 노출
  window.__reducedHoursCalc = { calculate: calculate };
})();
