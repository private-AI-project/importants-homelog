// 6+6 부모육아휴직 급여 계산기.
//
// 기존 계산기들은 6+6 을 본문에서 설명만 하고 계산은 안 한다. 입력이
// 통상임금과 개월 수뿐이라 부모 두 사람을 넣을 수가 없기 때문이다.
// 그런데 6+6 이 제일 복잡하고 제일 돈이 크다. 6개월차 상한이 450만원이다.
//
// 여기서 사람들이 모르는 것이 하나 있다. 특례가 적용되는 개월 수는
// 부모 중 "짧게 쓰는 쪽"이 정한다. 아빠가 1개월만 쓰면 엄마도 1개월분만
// 특례를 받는다. 이 도구는 그 손해를 숫자로 보여준다.
//
// 근거: 고용보험법 시행령 제95조·제95조의3, 2025년 개편 기준
//       (사후지급금은 2025년 1월 1일부터 폐지되어 매달 전액 지급)

(function () {
  "use strict";

  // ── 기준값 ────────────────────────────────────────────────

  // 6+6 특례 월별 상한. 부모 각자의 육아휴직 1~6개월차에 붙는다.
  var SPECIAL_CAPS = [2500000, 2500000, 3000000, 3500000, 4000000, 4500000];
  var SPECIAL_MAX = 6;

  // 일반 육아휴직. 개월차에 따라 지급률과 상한이 갈린다.
  var NORMAL = [
    { until: 3,  rate: 1.0, cap: 2500000, label: "1~3개월차" },
    { until: 6,  rate: 1.0, cap: 2000000, label: "4~6개월차" },
    { until: 12, rate: 0.8, cap: 1600000, label: "7~12개월차" },
  ];

  var FLOOR = 700000;      // 하한. 통상임금이 이보다 적어도 70만원은 나온다.
  var MAX_MONTHS = 12;

  // ── 계산 ──────────────────────────────────────────────────

  function normalRow(month) {
    for (var i = 0; i < NORMAL.length; i += 1) {
      if (month <= NORMAL[i].until) return NORMAL[i];
    }
    return NORMAL[NORMAL.length - 1];
  }

  // 한 사람의 월별 지급액. specialMonths 개월차까지는 특례 상한을 쓴다.
  function schedule(wage, months, specialMonths) {
    var rows = [], total = 0;
    for (var m = 1; m <= months; m += 1) {
      var rate, cap, kind;
      if (m <= specialMonths) {
        rate = 1.0;
        cap = SPECIAL_CAPS[m - 1];
        kind = "특례";
      } else {
        var n = normalRow(m);
        rate = n.rate;
        cap = n.cap;
        kind = "일반";
      }
      var pay = Math.min(wage * rate, cap);
      if (pay < FLOOR) pay = Math.min(FLOOR, cap);
      pay = Math.round(pay);
      rows.push({ month: m, rate: rate, cap: cap, kind: kind, pay: pay,
                  cappedByLimit: wage * rate > cap });
      total += pay;
    }
    return { rows: rows, total: total };
  }

  function calculate(i) {
    // 특례는 부모가 모두 쓴 기간에만 붙는다. 짧게 쓰는 쪽이 한도를 정한다.
    var special = i.both ? Math.min(i.monthsA, i.monthsB, SPECIAL_MAX) : 0;

    var a = schedule(i.wageA, i.monthsA, special);
    var b = schedule(i.wageB, i.monthsB, special);

    // 특례가 없었다면 얼마였을지. 이득을 보여주려면 기준선이 있어야 한다.
    var plainA = schedule(i.wageA, i.monthsA, 0);
    var plainB = schedule(i.wageB, i.monthsB, 0);

    // 둘 다 6개월을 채웠다면 얼마였을지. 짧게 써서 잃는 금액이다.
    var full = null;
    if (i.both && special < SPECIAL_MAX) {
      var fa = schedule(i.wageA, Math.max(i.monthsA, SPECIAL_MAX), SPECIAL_MAX);
      var fb = schedule(i.wageB, Math.max(i.monthsB, SPECIAL_MAX), SPECIAL_MAX);
      full = { total: fa.total + fb.total, gain: fa.total + fb.total - (a.total + b.total) };
    }

    return {
      both: i.both,
      special: special,
      a: a, b: b,
      wageA: i.wageA, wageB: i.wageB,
      monthsA: i.monthsA, monthsB: i.monthsB,
      total: a.total + b.total,
      plainTotal: plainA.total + plainB.total,
      benefit: (a.total + b.total) - (plainA.total + plainB.total),
      full: full,
      maxMonths: Math.max(i.monthsA, i.monthsB),
    };
  }

  // ── 화면 ──────────────────────────────────────────────────

  function won(n) { return Math.round(n).toLocaleString("ko-KR") + "원"; }
  function man(n) { return (Math.round(n / 10000)).toLocaleString("ko-KR") + "만"; }

  function render(r) {
    var box = document.getElementById("calc-result");
    var html = "";

    html += '<p class="calc-label">부모 합산 · ' +
            (r.both ? "6+6 특례 " + r.special + "개월 적용" : "일반 육아휴직") + "</p>";
    html += '<p class="calc-amount">' + won(r.total) + " 안팎</p>";
    html += '<p class="calc-sub">' +
            (r.both ? "부모 A " + won(r.a.total) + " · 부모 B " + won(r.b.total)
                    : r.monthsA + "개월 동안 받는 총액입니다") + "</p>";

    // 월별 표. 특례 상한이 개월차마다 올라가는 걸 눈으로 봐야 이해된다.
    // 혼자 쓰면 B 열을 아예 빼야 한다. 0원짜리 빈 열은 읽는 사람을 헷갈리게 한다.
    html += '<div class="calc-breakdown"><h4>월별 지급액</h4>';
    html += '<table class="calc-table"><thead><tr><th>개월차</th><th>' +
            (r.both ? "부모 A</th><th>부모 B" : "지급액") + "</th></tr></thead><tbody>";
    for (var m = 1; m <= r.maxMonths; m += 1) {
      var ra = r.a.rows[m - 1], rb = r.b.rows[m - 1];
      var isSpecial = m <= r.special;
      html += '<tr' + (isSpecial ? ' class="special"' : "") + "><td>" + m + "개월" +
              (isSpecial ? ' <span class="tag">특례</span>' : "") + "</td>";
      html += "<td>" + (ra ? won(ra.pay) : "-") + "</td>";
      if (r.both) html += "<td>" + (rb ? won(rb.pay) : "-") + "</td>";
      html += "</tr>";
    }
    html += '<tr class="sum"><td>합계</td><td>' + won(r.a.total) + "</td>" +
            (r.both ? "<td>" + won(r.b.total) + "</td>" : "") + "</tr>";
    html += "</tbody></table></div>";

    html += '<ul class="calc-notes">';
    if (r.both && r.benefit > 0) {
      html += "<li>일반 육아휴직만 썼다면 " + won(r.plainTotal) + " 이었습니다. 6+6 특례로 <strong>" +
              won(r.benefit) + " 더 받습니다</strong></li>";
    }
    if (r.full && r.full.gain > 0) {
      html += "<li><strong>여기가 핵심입니다.</strong> 특례가 붙는 개월 수는 부모 중 <strong>짧게 쓰는 쪽</strong>이 정합니다. 지금은 " +
              r.special + "개월만 적용됩니다. 두 분 다 6개월을 채우면 " + won(r.full.gain) +
              " 을 더 받습니다</li>";
    }
    if (r.both && r.special === 6) {
      html += "<li>두 분 다 6개월 이상 쓰셔서 특례를 전부 받습니다. 상한이 " +
              man(SPECIAL_CAPS[0]) + "원에서 " + man(SPECIAL_CAPS[5]) + "원까지 올라갑니다</li>";
    }
    if (!r.both) {
      html += "<li>한 사람만 쓰면 특례가 없습니다. 배우자가 <strong>단 1개월이라도</strong> 함께 쓰면 두 사람 모두 1개월차에 상한 " +
              man(SPECIAL_CAPS[0]) + "원짜리 특례를 받습니다</li>";
    }
    html += "<li>6+6 특례는 자녀가 <strong>생후 18개월 이내</strong>일 때만 됩니다. 동시에 쓰지 않고 순차로 써도 인정됩니다</li>";
    html += "<li>2025년 1월 1일부터 <strong>사후지급금이 폐지</strong>됐습니다. 예전처럼 75%만 받고 복직 6개월 뒤에 나머지를 받는 게 아니라 매달 전액 나옵니다</li>";
    html += "<li>7개월차부터는 통상임금의 80%, 상한 " + man(1600000) + "원으로 내려갑니다. 하한은 " +
            man(FLOOR) + "원입니다</li>";
    html += "</ul>";

    html += '<div class="calc-actions">';
    html += '<a class="calc-btn primary" href="https://www.work24.go.kr" target="_blank" rel="noopener">고용24에서 신청하기</a>';
    html += "</div>";

    html += '<div class="calc-share">';
    html += '<span class="calc-share-label">결과 공유하기</span>';
    html += '<div class="calc-share-btns">';
    html += '<button class="share-btn kakao" type="button" data-share="native">카카오톡·메시지</button>';
    html += '<button class="share-btn x" type="button" data-share="x">X</button>';
    html += '<button class="share-btn link" type="button" data-share="copy">링크 복사</button>';
    html += "</div></div>";

    html += '<p class="calc-disclaimer">고용보험법 시행령의 지급 기준을 반영한 <strong>간이 계산</strong>입니다. 통상임금 산정은 회사마다 다르고, 한부모 특례나 지자체 지원금은 반영하지 않았습니다. 실제 지급액은 고용센터가 확인한 통상임금으로 정해집니다. 고용24나 고용노동부 1350으로 확인하세요.</p>';

    box.innerHTML = html;
    box.hidden = false;
    if (window.gtag) gtag("event", "tool_result", { tool_path: location.pathname });

    var url = "https://home.importants-studio.com/tools/parental-leave-66/";
    var shareText = "부모가 함께 육아휴직을 쓰면 " + won(r.total) + " 정도라고 합니다 (홈로그 계산기)";

    box.querySelectorAll("[data-share]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var mode = btn.getAttribute("data-share");
        if (mode === "native") {
          if (navigator.share) {
            navigator.share({ title: "육아휴직 급여 계산기 (부모 함께 6+6)", text: shareText, url: url }).catch(function () {});
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

    if (box.scrollIntoView) box.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // ── 입력 ──────────────────────────────────────────────────

  function num(el) {
    if (!el) return 0;
    var v = parseInt(String(el.value).replace(/[,\s원]/g, ""), 10);
    return isNaN(v) || v < 0 ? 0 : v;
  }

  function months(el) {
    var v = parseInt(el.value, 10);
    if (isNaN(v) || v < 1) return 1;
    return Math.min(v, MAX_MONTHS);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("parental-66-form");
    if (!form) return;

    var bBox = document.getElementById("parent-b-fields");
    function sync() { bBox.hidden = !form.elements.both.checked; }
    form.elements.both.addEventListener("change", sync);
    sync();

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var both = form.elements.both.checked;
      render(calculate({
        both: both,
        wageA: num(form.elements.wageA),
        monthsA: months(form.elements.monthsA),
        wageB: both ? num(form.elements.wageB) : 0,
        monthsB: both ? months(form.elements.monthsB) : 0,
      }));
    });
  });

  window.__parental66 = {
    calculate: calculate, schedule: schedule, normalRow: normalRow,
    SPECIAL_CAPS: SPECIAL_CAPS, NORMAL: NORMAL, FLOOR: FLOOR,
  };
})();
