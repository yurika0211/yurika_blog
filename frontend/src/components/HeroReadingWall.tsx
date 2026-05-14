import { useEffect, useRef, type ReactNode } from 'react';

type ReadingWallPanel = {
  id: string;
  widthClass: string;
  layoutClass: string;
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
    id: 'water-fairy-intro',
    widthClass: 'reading-wall-panel-narrow',
    layoutClass: 'reading-wall-panel-plaque',
    title: '水仙女',
    body: (
      <Paragraph>
        凌波照影，素袖生香。
      </Paragraph>
    ),
  },
  {
    id: 'water-fairy-prologue',
    widthClass: 'reading-wall-panel-medium',
    layoutClass: 'reading-wall-panel-folio-tall',
    title: '临波序',
    body: (
      <Paragraph>
        晨雾初开，水面像一封刚被揭开的信。她自浅汀回眸，白瓣拢着月色，金盏藏着微光，连风也只敢轻轻掠过裙角。
      </Paragraph>
    ),
  },
  {
    id: 'water-fairy-poem',
    widthClass: 'reading-wall-panel-wide',
    layoutClass: 'reading-wall-panel-scroll',
    body: (
      <CopyStack>
        <Paragraph>
          清波涵曉月，素影立寒汀。
        </Paragraph>
        <Paragraph>
          金盞盛<Kaeri mark="レ" />
          春色，香痕
          <Ruby base="著" note="ちゃく" />
          水青。
        </Paragraph>
        <Paragraph>
          風來衣袂動，露落佩聲輕。
        </Paragraph>
        <Paragraph>
          若問芳名處，人間喚水靈。
        </Paragraph>
      </CopyStack>
    ),
  },
  {
    id: 'water-fairy-scent',
    widthClass: 'reading-wall-panel-medium',
    layoutClass: 'reading-wall-panel-folio-mid',
    title: '香雾',
    body: (
      <Paragraph>
        她不是浓烈的花神，更像一缕被清水养大的气息。靠近时先闻见冷香，再看见雪白花瓣层层展开，像把春天折成一支细长的灯。
      </Paragraph>
    ),
  },
  {
    id: 'water-fairy-note',
    widthClass: 'reading-wall-panel-medium',
    layoutClass: 'reading-wall-panel-folio-low',
    title: '晓岸小札',
    body: (
      <Paragraph>
        若把清晨的池岸写成一封情书，第一句该是薄雾，第二句该是花影，第三句便是她停在水边时，整片天空都安静下来。
      </Paragraph>
    ),
  },
  {
    id: 'water-fairy-epilogue',
    widthClass: 'reading-wall-panel-narrow',
    layoutClass: 'reading-wall-panel-colophon',
    body: (
      <Paragraph>
        一泓秋水，照見芳魂。
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
        behavior: 'auto',
      });
    };

    rail.addEventListener('wheel', handleWheel, { passive: false });
    return () => rail.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <section className="reading-wall-section relative min-h-screen overflow-hidden bg-[#f5efe2] dark:bg-[#16110c]">
      <div className="hero-grid absolute inset-0 opacity-[0.14] mix-blend-multiply dark:opacity-[0.08]" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(247,242,231,0.98)_0%,rgba(242,234,219,0.95)_46%,rgba(238,229,211,0.98)_100%)] dark:bg-[linear-gradient(180deg,rgba(24,18,13,0.98)_0%,rgba(20,15,11,0.95)_48%,rgba(16,12,9,0.98)_100%)]" />
        <div className="absolute inset-x-[6%] top-[6%] h-px bg-[linear-gradient(90deg,transparent,rgba(120,88,49,0.16),transparent)] dark:bg-[linear-gradient(90deg,transparent,rgba(180,145,98,0.14),transparent)]" />
        <div className="absolute inset-x-[8%] bottom-[8%] h-px bg-[linear-gradient(90deg,transparent,rgba(120,88,49,0.1),transparent)] dark:bg-[linear-gradient(90deg,transparent,rgba(180,145,98,0.1),transparent)]" />
        <div className="absolute left-[-7rem] top-[10%] h-64 w-96 rounded-full bg-[radial-gradient(circle,rgba(84,61,34,0.12)_0%,rgba(84,61,34,0.06)_26%,transparent_68%)] blur-3xl dark:bg-[radial-gradient(circle,rgba(164,130,82,0.08)_0%,rgba(164,130,82,0.04)_22%,transparent_66%)]" />
        <div className="absolute right-[-5rem] top-[18%] h-72 w-80 rounded-full bg-[radial-gradient(circle,rgba(126,94,52,0.1)_0%,rgba(126,94,52,0.04)_24%,transparent_68%)] blur-3xl dark:bg-[radial-gradient(circle,rgba(150,118,73,0.08)_0%,rgba(150,118,73,0.04)_24%,transparent_68%)]" />
        <div className="absolute bottom-[-8rem] left-[24%] h-72 w-[34rem] bg-[radial-gradient(ellipse_at_center,rgba(109,80,42,0.08)_0%,rgba(109,80,42,0.04)_32%,transparent_72%)] blur-3xl dark:bg-[radial-gradient(ellipse_at_center,rgba(145,112,70,0.07)_0%,rgba(145,112,70,0.03)_28%,transparent_72%)]" />
        <div className="absolute left-[12%] top-[22%] h-40 w-24 rotate-[-16deg] rounded-full border border-[rgba(126,90,48,0.08)] opacity-60 dark:border-[rgba(176,140,92,0.08)]" />
        <div className="absolute right-[14%] top-[14%] h-52 w-28 rotate-[12deg] rounded-full border border-[rgba(126,90,48,0.06)] opacity-50 dark:border-[rgba(176,140,92,0.06)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[120rem] items-stretch px-3 py-4 md:px-5 md:py-6 xl:px-8">
        <div
          ref={railRef}
          className="reading-wall-rail reading-wall-rail-full min-w-0"
          aria-label="Vertical reading wall"
        >
          {READING_WALL_PANELS.map((panel) => (
            <article
              key={panel.id}
              className={`reading-wall-panel ${panel.widthClass} ${panel.layoutClass}`}
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
