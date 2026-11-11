# 작은 도구들 (tiny-tools)

하루 1달러짜리 작은 웹앱을 하나씩 쌓아 가는 프로젝트. 모든 도구를 도메인 하나 아래 하위 경로로 둔다(AdSense 승인 1회, SEO 권한 공유).

## 배포 전 바꿀 것
- 도메인: 현재 `leeyc80.github.io/tiny-tools/` (커스텀 도메인 연결 시 canonical, robots.txt, sitemap.xml 일괄 교체)
- `ca-pub-XXXX` → AdSense 퍼블리셔 ID (각 페이지 head, ads.txt)
- `YOUR-EMAIL` → privacy.html

## 도구 목록 / 후보
- [x] 글자수 세기 `/char-counter/`
- [x] D-day 계산기 `/d-day/`
- [ ] 평수 ↔ ㎡ 변환
- [x] 더치페이 계산기 `/dutch-pay/` (팁, 환율: Frankfurter/ECB API)
- [x] 퍼센트 계산기 `/percent/`
- [x] 캐나다 실수령액 계산기 `/ca-paycheck/` (+ `/en/`) — ON/BC/AB, 2026 세율
- [ ] 대출 이자 계산기 (원리금균등/원금균등)
- [ ] 랜덤 뽑기 / 사다리타기
- [x] 한영 타자 변환기 `/ko-en/`
- [ ] 로또 번호 생성기
- [ ] 단위 변환 (인치/cm, 파운드/kg)

## 매년 업데이트 필요
- `ca-paycheck/calc.js`의 `RATES` — 매년 1월(CRA T4127 1월판, TD1), 7월판에서 중간 변경 여부 확인.
  출처: https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas.html
  - 연방/주 세율·구간(Table 8.1), 기본공제(Table 8.2), CPP(YMPE, YAMPE, 요율), EI(최대 보험소득, 요율)
  - BC 7월판은 하반기 비례값(prorated)이므로 연간값을 사용할 것
