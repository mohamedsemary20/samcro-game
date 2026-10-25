import { ActionButton } from '../components/ActionButton'

export function HomePage({ onPlay, onLobby }: { onPlay: () => void; onLobby: () => void }) {
  return <div className="sam-home sam-demo-home">
    <section className="sam-hero-copy">
      <span className="sam-eyebrow"><i /> سمكرو · Samkaro</span>
      <h1>المعلومة ناقصة؟<br /><em>كمّلها بحدسك.</em></h1>
      <p>سؤال، تلميح خاص، وتخمينات أصحابك. دي معاينة محلية للواجهة على جهازك.</p>
      <div className="sam-hero-art" aria-hidden="true"><span className="sam-art-index">معاينة ٠١</span><span className="sam-art-number">؟</span><span className="sam-art-answer">قدّرها صح</span><span className="sam-art-stamp">قريب؟</span></div>
      <div className="sam-demo-actions"><ActionButton onClick={onPlay}>جرّب جولة محلية <span aria-hidden="true">←</span></ActionButton><ActionButton tone="quiet" onClick={onLobby}>افتح الردهة</ActionButton></div>
    </section>
    <aside className="sam-demo-side"><span className="sam-demo-index">01 / 03</span><strong>فكّرها.<br />قدّرها.<br /><em>اكسبها.</em></strong><p>أصحابك هيشوفوا مين أقرب رقم للسؤال.</p></aside>
    <footer className="sam-founder"><bdi lang="en" dir="ltr">Developed by Mohamed Semary</bdi><i aria-hidden="true">✳</i></footer>
  </div>
}
