"use client";

const TIMEFRAMES = [
  { tf: "1H", weight: 20, label: "짧은 흐름", desc: "스윙·진입 타이밍 확인용" },
  { tf: "4H", weight: 30, label: "중간 흐름", desc: "추세 확인용" },
  { tf: "1D", weight: 50, label: "큰 흐름", desc: "가장 중요. 종합 점수의 절반" },
];

const INDICATORS = [
  {
    name: "RSI",
    title: "지금 너무 비싸졌나? 너무 싸졌나?",
    body: [
      "0~100 사이 숫자로 가격이 쏠려있는 정도를 보여줘요.",
      "70 이상 → 과매수 (너무 많이 올라서 식을 가능성)",
      "30 이하 → 과매도 (너무 떨어져서 반등할 가능성)",
    ],
  },
  {
    name: "EMA",
    title: "최근 가격의 평균선",
    body: [
      "가격의 평균을 부드럽게 그어 추세를 보여주는 선이에요.",
      "20일선 / 50일선 / 200일선을 봅니다.",
      "20 > 50 > 200 순서로 위에 있으면 \"상승 정배열\" → 추세가 위쪽.",
      "반대로 200 > 50 > 20이면 \"하락 정배열\" → 추세가 아래쪽.",
    ],
  },
  {
    name: "MACD",
    title: "오르려는 힘 vs 내리려는 힘",
    body: [
      "두 평균선이 교차할 때 추세 전환을 알려줘요.",
      "골든크로스 = 매수 신호 (빠른 선이 느린 선을 위로 뚫음)",
      "데드크로스 = 매도 신호 (반대로 아래로 뚫음)",
    ],
  },
  {
    name: "BB (볼린저밴드)",
    title: "가격이 평소보다 얼마나 튀었나?",
    body: [
      "가격을 위·중간·아래 세 개의 띠로 감싸요.",
      "가격이 상단에 닿으면 → 너무 올랐다 (반전 가능)",
      "가격이 하단에 닿으면 → 너무 떨어졌다 (반등 가능)",
    ],
  },
  {
    name: "거래량",
    title: "사람들이 얼마나 많이 사고팔았나?",
    body: [
      "20일 평균 대비 몇 배인지 봅니다.",
      "강한 신호엔 보통 거래량이 따라옵니다 (확신의 신호).",
      "거래량 없는 가격 변동은 신뢰도가 낮아요.",
    ],
  },
  {
    name: "피보나치",
    title: "어디서 멈출지 그어놓는 선",
    body: [
      "직전 고점·저점을 38.2% / 50% / 61.8%로 나눠 선을 긋습니다.",
      "가격이 이 선 근처에 오면 잘 멈추거나 반전하는 경향이 있어요.",
      "오르는 중이면 지지선, 내리는 중이면 저항선 역할.",
    ],
  },
  {
    name: "패턴",
    title: "차트 모양으로 다음 움직임 예상",
    body: [
      "상승 삼각형 → 위쪽으로 뚫고 갈 가능성",
      "하락 삼각형 → 아래로 빠질 가능성",
      "대칭 삼각형 → 곧 한쪽으로 터질 거지만 방향 미정",
    ],
  },
];

const TRIGGERS = [
  {
    title: "방향 전환",
    icon: "🔄",
    body: "이전엔 매수였던 종목이 매도로 바뀜 (또는 반대). 추세가 뒤집힌 강한 신호.",
  },
  {
    title: "강한 신호",
    icon: "⚡",
    body: "중립이었다가 점수가 ±0.5 이상으로 크게 쏠림. 새 방향이 잡힌 순간.",
  },
];

const SCORE_RANGES = [
  { range: "±0.5 이상", label: "강한 추세", tone: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  { range: "±0.3 ~ 0.5", label: "보통", tone: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  { range: "±0.3 미만", label: "약함 / 중립", tone: "text-zinc-400 bg-zinc-800/40 border-zinc-700" },
];

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded border border-zinc-800 bg-zinc-900 p-5 ${className}`}
    >
      {children}
    </div>
  );
}

function Section({
  title,
  emoji,
  children,
}: {
  title: string;
  emoji: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <span>{emoji}</span>
        <span>{title}</span>
      </h2>
      {children}
    </section>
  );
}

export default function HelpView() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-10">
      <header>
        <h1 className="text-2xl font-semibold">사용 안내</h1>
        <p className="text-sm text-zinc-400 mt-1">
          이 사이트와 디스코드 알림이 어떻게 동작하는지 차근차근 설명할게요.
        </p>
      </header>

      <Section emoji="📊" title="이게 뭔가요?">
        <Card>
          <p className="text-sm leading-relaxed text-zinc-300">
            주식과 코인 차트를 매시간 자동으로 분석해서, 보조지표 여러 개를 종합한
            <strong className="text-zinc-100"> 매수 / 매도 / 중립</strong> 신호를 보여주는 도구예요.
          </p>
          <p className="text-sm leading-relaxed text-zinc-400 mt-3">
            왼쪽에서 종목을 고르면 가운데에 차트, 오른쪽에 신호 종합이 나타납니다.
            중요한 변화가 생기면 디스코드로 알림이 와요.
          </p>
        </Card>
      </Section>

      <Section emoji="🔔" title="알림은 언제 오나요?">
        <p className="text-sm text-zinc-400 -mt-2">
          아래 두 경우에만 디스코드로 알림이 갑니다. (이 외에는 조용함)
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {TRIGGERS.map((t) => (
            <Card key={t.title}>
              <div className="text-2xl mb-2">{t.icon}</div>
              <div className="font-semibold mb-1">{t.title}</div>
              <p className="text-sm text-zinc-400 leading-relaxed">{t.body}</p>
            </Card>
          ))}
        </div>
        <Card className="bg-zinc-900/50">
          <p className="text-sm text-zinc-400">
            <strong className="text-zinc-200">같은 신호 두 번 안 보내요.</strong> 디스코드 채팅창
            도배 방지용이에요. 한번 알림 간 종목은 상태가 바뀌어야 다시 알림이 갑니다.
          </p>
        </Card>
      </Section>

      <Section emoji="⏰" title="얼마나 자주 오나요?">
        <Card>
          <p className="text-sm text-zinc-300">
            매시간 정각(UTC 기준)에 자동 분석을 돌려요. 단, 위 트리거 조건을 만족할 때만 발송됩니다.
          </p>
          <ul className="mt-3 text-sm text-zinc-400 space-y-1.5 list-disc pl-5">
            <li>조용한 날 → 하루에 한 번도 안 올 수 있음</li>
            <li>변동성이 큰 날 → 여러 번 올 수 있음</li>
          </ul>
        </Card>
      </Section>

      <Section emoji="🕐" title="시간프레임 가중치">
        <p className="text-sm text-zinc-400 -mt-2">
          1시간봉 / 4시간봉 / 1일봉을 모두 보고 합쳐요. 큰 시간프레임일수록 비중이 큽니다.
        </p>
        <div className="space-y-2">
          {TIMEFRAMES.map((t) => (
            <Card key={t.tf} className="!p-4">
              <div className="flex items-center gap-4">
                <div className="text-base font-semibold w-12">{t.tf}</div>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm font-medium">{t.label}</span>
                    <span className="text-xs text-zinc-500">{t.desc}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded overflow-hidden">
                    <div
                      className="h-full bg-zinc-400"
                      style={{ width: `${t.weight}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm tabular-nums text-zinc-300 w-12 text-right">
                  {t.weight}%
                </div>
              </div>
            </Card>
          ))}
        </div>
        <p className="text-xs text-zinc-500">
          세 시간프레임이 모두 같은 방향을 가리키면 신호가 강하고, 엇갈리면 약해요.
        </p>
      </Section>

      <Section emoji="📖" title="지표 하나하나 설명">
        <p className="text-sm text-zinc-400 -mt-2">
          각 지표가 뭘 보는 건지 쉽게 풀어 썼어요. 알림에 나오는 용어들이에요.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {INDICATORS.map((ind) => (
            <Card key={ind.name}>
              <div className="text-base font-semibold mb-1">{ind.name}</div>
              <div className="text-sm text-zinc-300 mb-3">{ind.title}</div>
              <ul className="text-xs text-zinc-400 space-y-1.5">
                {ind.body.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </Section>

      <Section emoji="🎯" title="종합 점수 읽는 법">
        <p className="text-sm text-zinc-400 -mt-2">
          모든 지표의 매수/매도/중립을 가중치로 합친 한 줄 점수예요. <strong className="text-zinc-200">−1 ~ +1</strong> 사이.
        </p>
        <div className="space-y-2">
          {SCORE_RANGES.map((r) => (
            <div
              key={r.range}
              className={`rounded border px-4 py-3 flex items-center justify-between ${r.tone}`}
            >
              <span className="text-sm tabular-nums font-mono">{r.range}</span>
              <span className="text-sm font-semibold">{r.label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-zinc-500">
          + 양수 = 매수 우세, − 음수 = 매도 우세. 0에 가까우면 방향이 모호한 거예요.
        </p>
      </Section>

      <Section emoji="⚠️" title="꼭 알아둘 것">
        <Card className="bg-red-500/5 border-red-500/30">
          <p className="text-sm text-zinc-200 leading-relaxed">
            이 도구는 <strong className="text-red-300">현재 상태를 요약</strong>하는 거지,
            <strong className="text-red-300"> 미래를 예측</strong>하는 게 아닙니다.
          </p>
          <ul className="mt-3 text-sm text-zinc-400 space-y-1.5 list-disc pl-5">
            <li>보조지표 신호는 100% 맞지 않아요. 참고용으로만 쓰세요.</li>
            <li>여러 지표가 같은 방향을 가리켜도 시장이 반대로 갈 수 있습니다.</li>
            <li>매매 결정과 그 결과에 대한 책임은 본인에게 있어요.</li>
          </ul>
        </Card>
      </Section>
    </div>
  );
}
