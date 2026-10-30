import { ActionButton } from '../components/ActionButton'
import { Icon } from '../components/Icon'
import { StatusBadge } from '../components/StatusBadge'
import { SurfaceCard } from '../components/SurfaceCard'

export function HomePage({ onPlay, onLobby }: { onPlay: () => void; onLobby: () => void }) {
  return <div className="home-page">
    <section className="home-hero" aria-labelledby="demo-home-title">
      <div className="home-hero-copy">
        <span className="eyebrow"><i /> معاينة محلية · سمكرو</span>
        <h1 id="demo-home-title">قدّرها صح.<br /><em>كمّلها بحدسك.</em></h1>
        <p>سؤال، تلميح خاص، وتخمينات أصحابك. دي معاينة محلية للواجهة على جهازك — من غير اتصال بالخادم.</p>
        <div className="hero-facts">
          <span><Icon name="users" size={16} /> ٣–٧ لاعبين</span>
          <span><Icon name="sparkle" size={16} /> تلميح سرّي</span>
          <span><Icon name="trophy" size={16} /> ٥ جولات</span>
        </div>
        <div className="hero-actions"><ActionButton onClick={onPlay}>جرّب جولة محلية <Icon name="arrow" size={18} /></ActionButton><ActionButton tone="quiet" onClick={onLobby}>افتح الردهة</ActionButton></div>
      </div>
      <div className="hero-stage" aria-hidden="true">
        <span className="hero-stage-orbit orbit-one" />
        <span className="hero-stage-orbit orbit-two" />
        <div className="hero-question-card"><span className="hero-question-label">معاينة</span><strong>؟</strong><span className="hero-question-hint"><Icon name="sparkle" size={14} /> تلميحك ليك بس</span></div>
        <span className="hero-chip chip-one"><StatusBadge tone="neutral">بدون خادم</StatusBadge></span>
        <span className="hero-chip chip-two"><Icon name="play" size={14} /> جولة تجريبية</span>
      </div>
    </section>
    <section className="home-entry-grid">
      <SurfaceCard className="entry-card">
        <span className="eyebrow"><i /> تجربة الواجهة</span>
        <h2>شوف اللعبة من جوه</h2>
        <p>ابدأ جولة محلية عشان تشوف شكل الطاولة، التلميح، الرهان، وشاشة النتيجة.</p>
        <ActionButton onClick={onPlay}>ابدأ المعاينة <Icon name="arrow" size={18} /></ActionButton>
        <small className="entry-foot">المعاينة محلية على الجهاز ومش بتوصل لخادم اللعب.</small>
      </SurfaceCard>
      <SurfaceCard className="home-side-note">
        <span className="note-icon"><Icon name="shield" size={19} /></span>
        <h2>مش غرفة حقيقية</h2>
        <p>اللعب الجماعي الفعلي محتاج إنترنت وغرفة على الخادم. المعاينة دي للتصميم والتفاعل فقط.</p>
        <StatusBadge tone="warning" dot>معاينة تطوير</StatusBadge>
      </SurfaceCard>
    </section>
    <footer className="site-credit"><bdi lang="en" dir="ltr">Developed by Mohamed Semary</bdi><span aria-hidden="true">·</span><bdi lang="en" dir="ltr">Samkaro</bdi></footer>
  </div>
}
