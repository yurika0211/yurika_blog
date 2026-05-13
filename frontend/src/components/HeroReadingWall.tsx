import { useEffect, useRef, type ReactNode } from 'react';

type ReadingWallPanel = {
  id: string;
  widthClass: string;
  title?: string;
  body: ReactNode;
};

function Ruby({ base, note }: { base: string; note: string }) {
  return (
    <ruby className="reading-wall-ruby">
      {base}
      <rt>{note}</rt>
    </ruby>
  );
}

function Kaeri({ mark }: { mark: string }) {
  return <span className="reading-wall-kaeri">{mark}</span>;
}

function Paragraph({ children }: { children: ReactNode }) {
  return <p className="reading-wall-vertical-copy">{children}</p>;
}

function CopyStack({ children }: { children: ReactNode }) {
  return <div className="reading-wall-copy-stack">{children}</div>;
}

const READING_WALL_PANELS: ReadingWallPanel[] = [
  {
    id: 'quote-liubei',
    widthClass: 'reading-wall-panel-narrow',
    body: (
      <Paragraph>
        孤之有
        <Ruby base="孔明" note="こうめい" />
        ，猶
        <Ruby base="魚" note="ぎょ" />
        之有
        <Ruby base="水" note="みず" />
        也。
      </Paragraph>
    ),
  },
  {
    id: 'complex-layout',
    widthClass: 'reading-wall-panel-medium',
    title: '复杂情况测试',
    body: (
      <Paragraph>
        这类内容会比普通段落更占横向空间，所以页面应当保持向左展开的余地。手机上则重点确认两件事：一是行长不要超出屏幕高度太多，二是横向滚动时不要被外层容器截断。
      </Paragraph>
    ),
  },
  {
    id: 'spring-view-poem',
    widthClass: 'reading-wall-panel-wide',
    body: (
      <CopyStack>
        <Paragraph>
          国<Kaeri mark="レ" />破山河在，城春草木深。
        </Paragraph>
        <Paragraph>
          感<Kaeri mark="二" />
          時<Kaeri mark="一" />
          花
          <Ruby base="濺" note="ゲン" />
          淚，恨<Kaeri mark="二" />別鳥驚心。
        </Paragraph>
        <Paragraph>
          烽火連<Kaeri mark="二" />三月，家書抵<Kaeri mark="二" />萬金。
        </Paragraph>
        <Paragraph>
          白頭
          <Ruby base="搔" note="ハ" />
          更<Kaeri mark="二" />短，渾欲<Kaeri mark="レ" />不勝簪。
        </Paragraph>
      </CopyStack>
    ),
  },
  {
    id: 'material-guide',
    widthClass: 'reading-wall-panel-medium',
    title: '训点材料',
    body: (
      <Paragraph>
        下面放一首稍长一点的古诗作为测试材料。这里不追求训读的严格校勘，只用于观察句子换行、返点位置、送假名密度，以及长篇训点材料在纯直排页面中的横向展开效果。每一联都单独写成一个段落，避免五言半句被拆成两行。
      </Paragraph>
    ),
  },
  {
    id: 'spring-view-note',
    widthClass: 'reading-wall-panel-medium',
    title: '春望训点',
    body: (
      <Paragraph>
        这里测试返点、送假名和正文列距是否能共存。返点应嵌入汉字基字与下一个汉字之间的左侧空隙，送假名则贴近对应汉字并保持较小字号。
      </Paragraph>
    ),
  },
  {
    id: 'quote-liji',
    widthClass: 'reading-wall-panel-narrow',
    body: (
      <Paragraph>
        故人不<Kaeri mark="レ" />獨親其親，不<Kaeri mark="レ" />獨子其子。
      </Paragraph>
    ),
  },
];

export default function HeroReadingWall() {
  const railRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      if (window.innerWidth < 1024) {
        return;
      }
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }

      event.preventDefault();
      rail.scrollBy({
        left: event.deltaY,
        behavior: 'smooth',
      });
    };

    rail.addEventListener('wheel', handleWheel, { passive: false });
    return () => rail.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <section className="reading-wall-section relative overflow-hidden">
      <div className="hero-grid absolute inset-0 opacity-55 dark:opacity-22" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(232,246,248,0.97)_0%,rgba(220,240,243,0.84)_42%,rgba(228,244,247,0.95)_100%)] dark:bg-[linear-gradient(180deg,rgba(4,18,28,0.96)_0%,rgba(5,24,36,0.88)_44%,rgba(3,14,24,0.94)_100%)]" />
        <div className="absolute left-[-8rem] top-[14%] h-52 w-80 rounded-full bg-cyan-200/34 blur-3xl dark:bg-cyan-400/16" />
        <div className="absolute right-[-6rem] top-[18%] h-56 w-72 rounded-full bg-sky-200/28 blur-3xl dark:bg-sky-500/14" />
        <div className="absolute bottom-[-8rem] left-[18%] h-56 w-80 rounded-full bg-teal-100/32 blur-3xl dark:bg-teal-500/12" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-[120rem] items-stretch px-3 py-4 md:px-5 md:py-6 xl:px-8">
        <div
          ref={railRef}
          className="reading-wall-rail reading-wall-rail-full min-w-0"
          aria-label="Vertical reading wall"
        >
          {READING_WALL_PANELS.map((panel) => (
            <article
              key={panel.id}
              className={`reading-wall-panel ${panel.widthClass}`}
            >
              <div className="reading-wall-panel-surface">
                <div className="reading-wall-panel-shell">
                  {panel.title ? (
                    <>
                      <div className="reading-wall-column reading-wall-title-column">
                        <h2 className="reading-wall-vertical-title">{panel.title}</h2>
                      </div>
                      <div className="reading-wall-rule" />
                    </>
                  ) : null}

                  <div className="reading-wall-column reading-wall-copy-column">
                    {panel.body}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
