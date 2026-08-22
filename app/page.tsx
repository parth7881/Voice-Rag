import VoiceExperience from "@/components/VoiceExperience";


function GoaMiniScene() {
  return (
    <div className="goa-mini-scene" aria-hidden="true">
      <div className="goa-sun" />

      <div className="goa-palm">
        <span className="palm-trunk" />
        <span className="leaf leaf-1" />
        <span className="leaf leaf-2" />
        <span className="leaf leaf-3" />
        <span className="leaf leaf-4" />
        <span className="leaf leaf-5" />
      </div>

      <div className="goa-wave wave-one" />
      <div className="goa-wave wave-two" />
    </div>
  );
}


function ReceiptCard() {
  return (
    <aside
      className="receipt-card"
      aria-label="Grounded answer information"
    >
      <span className="receipt-kicker">
        BUILT FOR TRUST
      </span>

      <h2>
        Answers with
        <br />
        evidence.
      </h2>

      <p>
        Every response is checked against retrieved
        MSMARCO-XI knowledge before it is shown.
      </p>

      <div className="receipt-divider" />

      <div className="receipt-feature">
        <span className="receipt-number">01</span>

        <div>
          <strong>Hybrid retrieval</strong>
          <small>Dense + sparse search</small>
        </div>
      </div>

      <div className="receipt-feature">
        <span className="receipt-number">02</span>

        <div>
          <strong>Grounded generation</strong>
          <small>Answers based on evidence</small>
        </div>
      </div>

      <div className="receipt-feature">
        <span className="receipt-number">03</span>

        <div>
          <strong>Safe refusal</strong>
          <small>No evidence, no invented answer</small>
        </div>
      </div>

      <div className="receipt-stamp">
        <span className="stamp-dot" />
        MSMARCO-XI
      </div>
    </aside>
  );
}


function GoaWaterScene() {
  return (
    <section
      className="water-scene"
      aria-hidden="true"
    >
      <div className="water-copy">
        Experience with voice - assistent.
      </div>

      <div className="boat-track">
        <div className="boat">
          <div className="boat-person">
            <span className="person-head" />
            <span className="person-body" />
          </div>

          <span className="boat-mast" />
          <span className="boat-flag" />

          <div className="boat-cabin">
            <span />
            <span />
          </div>

          <div className="boat-hull" />
        </div>
      </div>

      <div className="water-layer water-layer-one" />
      <div className="water-layer water-layer-two" />
      <div className="water-layer water-layer-three" />
    </section>
  );
}


export default function HomePage() {
  return (
    <main className="home-page">
      <section className="pro-hero">
        <div className="pro-layout">
          {/* LEFT */}
          <aside
            className="pro-editorial"
            aria-label="Product introduction"
          >
            <span className="editorial-kicker">
              MULTILINGUAL VOICE RAG
            </span>

            <h1>
              Ask
              <br />
              naturally.
              <em>
                Know with
                <br />
                proof.
              </em>
            </h1>

            <div
              className="feature-tags"
              aria-label="Product highlights"
            >
              <span>14 Indic languages</span>
              <span>Grounded answers</span>
              <span>Sources included</span>
            </div>

            <div className="pro-goa-art">
              <GoaMiniScene />
            </div>
          </aside>


          {/* CENTER */}
          <section
            className="pro-center"
            aria-label="Voice assistant"
          >
            <VoiceExperience />
          </section>


          {/* RIGHT */}
          <div className="pro-receipt">
            <ReceiptCard />
          </div>
        </div>
      </section>

      <GoaWaterScene />


      <style>{`
        :root {
          --goa-green: #004c3f;
          --goa-green-deep: #003f35;
          --goa-yellow: #ffd62e;
          --goa-pink: #ff2f78;
          --goa-cream: #fff8e9;
          --goa-paper: #fffdf8;
          --goa-ink: #062d27;
          --goa-muted: #61766e;
        }

        * {
          box-sizing: border-box;
        }

        .home-page {
          min-height: calc(100vh - 74px);
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(255, 214, 46, 0.09),
              transparent 33%
            ),
            #fff8e9;
          color: var(--goa-ink);
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
        }

        .pro-hero {
          flex: 1;
          width: 100%;
          padding:
            clamp(52px, 6vw, 92px)
            0
            clamp(48px, 6vw, 78px);
          display: flex;
          align-items: flex-start;
        }

        .pro-layout {
          width: min(
            1600px,
            calc(100% - 72px)
          );
          margin: 0 auto;

          display: grid;
          grid-template-columns:
            minmax(270px, 0.82fr)
            minmax(520px, 1.28fr)
            minmax(300px, 0.88fr);

          column-gap:
            clamp(34px, 5vw, 82px);

          align-items: start;
        }


        /* LEFT */

        .pro-editorial {
          justify-self: start;
          width: 100%;
          max-width: 430px;
          padding-top: 28px;
          text-align: left;
        }

        .editorial-kicker {
          display: block;
          margin-bottom: 20px;

          color: var(--goa-pink);

          font-family:
            ui-monospace,
            SFMono-Regular,
            Menlo,
            Monaco,
            Consolas,
            monospace;

          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.18em;
        }

        .pro-editorial h1 {
          margin: 0;

          color: var(--goa-green-deep);

          font-family:
            Georgia,
            "Times New Roman",
            serif;

          font-size:
            clamp(48px, 4.2vw, 72px);

          line-height: 0.94;
          letter-spacing: -0.055em;
          font-weight: 500;
        }

        .pro-editorial h1 em {
          display: block;
          margin-top: 14px;

          font-size: 0.57em;
          line-height: 1.04;

          font-weight: 500;
          font-style: italic;

          color: #0b6554;
          letter-spacing: -0.035em;
        }

        .feature-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;

          margin-top: 30px;
        }

        .feature-tags span {
          display: inline-flex;
          align-items: center;

          min-height: 32px;
          padding: 7px 12px;

          border:
            1px solid
            rgba(0, 76, 63, 0.17);

          border-radius: 999px;

          background:
            rgba(255, 255, 255, 0.64);

          color: #315f55;

          font-size: 11px;
          font-weight: 700;
        }

        .pro-goa-art {
          margin-top: 34px;
        }

        .goa-mini-scene {
          position: relative;

          width: 180px;
          height: 105px;

          overflow: hidden;
        }

        .goa-sun {
          position: absolute;
          top: 11px;
          right: 22px;

          width: 39px;
          height: 39px;

          border-radius: 50%;

          background: var(--goa-yellow);

          border:
            2px solid
            var(--goa-green-deep);
        }

        .goa-palm {
          position: absolute;
          left: 42px;
          bottom: 21px;

          width: 58px;
          height: 73px;
        }

        .palm-trunk {
          position: absolute;
          left: 26px;
          bottom: -4px;

          width: 7px;
          height: 53px;

          border-radius: 999px;

          background: var(--goa-green-deep);

          transform:
            rotate(8deg);

          transform-origin: bottom;
        }

        .leaf {
          position: absolute;
          left: 26px;
          top: 17px;

          width: 38px;
          height: 7px;

          border-radius:
            100% 10% 100% 10%;

          background: var(--goa-green);

          transform-origin: left center;
        }

        .leaf-1 {
          transform: rotate(-60deg);
        }

        .leaf-2 {
          transform: rotate(-25deg);
        }

        .leaf-3 {
          transform: rotate(10deg);
        }

        .leaf-4 {
          transform: rotate(45deg);
        }

        .leaf-5 {
          transform: rotate(82deg);
        }

        .goa-wave {
          position: absolute;
          left: 0;

          width: 178px;
          height: 26px;

          border:
            3px solid
            #2c9ea0;

          border-left: 0;
          border-right: 0;
          border-bottom: 0;

          border-radius: 50%;
        }

        .wave-one {
          bottom: 13px;
        }

        .wave-two {
          bottom: -1px;
          left: 27px;
        }


        /* CENTER */

        .pro-center {
          justify-self: center;

          width: 100%;
          max-width: 620px;

          min-width: 0;
        }


        /* RIGHT */

        .pro-receipt {
          justify-self: end;

          width: 100%;
          max-width: 370px;

          padding-top: 18px;
        }

        .receipt-card {
          position: relative;

          width: 100%;

          padding:
            34px 32px 30px;

          overflow: hidden;

          border-radius: 28px;

          background:
            linear-gradient(
              155deg,
              #075747 0%,
              #003e34 100%
            );

          box-shadow:
            0 24px 60px
            rgba(0, 53, 44, 0.16);

          color: white;
        }

        .receipt-card::before {
          content: "";

          position: absolute;
          top: -60px;
          right: -62px;

          width: 170px;
          height: 170px;

          border-radius: 50%;

          border:
            30px solid
            rgba(255, 214, 46, 0.10);
        }

        .receipt-kicker {
          position: relative;
          z-index: 2;

          display: block;

          margin-bottom: 20px;

          color: var(--goa-yellow);

          font-family:
            ui-monospace,
            SFMono-Regular,
            Menlo,
            Monaco,
            Consolas,
            monospace;

          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.17em;
        }

        .receipt-card h2 {
          position: relative;
          z-index: 2;

          margin: 0;

          font-family:
            Georgia,
            "Times New Roman",
            serif;

          font-size: 39px;
          line-height: 0.98;

          font-weight: 500;
          letter-spacing: -0.04em;
        }

        .receipt-card > p {
          position: relative;
          z-index: 2;

          margin:
            19px 0 0;

          max-width: 280px;

          color:
            rgba(255, 255, 255, 0.70);

          font-size: 13px;
          line-height: 1.65;
        }

        .receipt-divider {
          height: 1px;
          margin:
            26px 0 10px;

          background:
            rgba(255, 255, 255, 0.14);
        }

        .receipt-feature {
          position: relative;
          z-index: 2;

          display: grid;
          grid-template-columns:
            31px 1fr;

          gap: 12px;

          align-items: center;

          padding: 13px 0;
        }

        .receipt-number {
          color: var(--goa-yellow);

          font-size: 10px;
          font-weight: 900;

          font-family:
            ui-monospace,
            monospace;
        }

        .receipt-feature strong {
          display: block;

          color: white;

          font-size: 12px;
          font-weight: 800;
        }

        .receipt-feature small {
          display: block;

          margin-top: 3px;

          color:
            rgba(255, 255, 255, 0.52);

          font-size: 10px;
        }

        .receipt-stamp {
          position: relative;
          z-index: 2;

          display: inline-flex;
          align-items: center;
          gap: 8px;

          margin-top: 14px;

          padding: 9px 12px;

          border:
            1px solid
            rgba(255, 255, 255, 0.16);

          border-radius: 999px;

          color:
            rgba(255, 255, 255, 0.78);

          font-family:
            ui-monospace,
            monospace;

          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .stamp-dot {
          width: 7px;
          height: 7px;

          border-radius: 50%;

          background: var(--goa-yellow);

          box-shadow:
            0 0 0 4px
            rgba(255, 214, 46, 0.10);
        }


        /* WATER */

        .water-scene {
          position: relative;

          width: 100%;
          height: 118px;

          margin-top: auto;

          overflow: hidden;

          background:
            linear-gradient(
              180deg,
              rgba(255, 248, 233, 0) 0%,
              rgba(65, 181, 190, 0.10) 28%,
              rgba(30, 154, 167, 0.42) 100%
            );
        }

        .water-copy {
          position: absolute;
          left: 50%;
          top: 38px;

          z-index: 8;

          transform:
            translateX(-50%);

          white-space: nowrap;

          color: #00493f;

          font-family:
            Georgia,
            "Times New Roman",
            serif;

          font-size:
            clamp(18px, 1.7vw, 27px);

          font-weight: 700;

          letter-spacing: -0.02em;
        }

        .water-layer {
          position: absolute;
          left: -5%;
          width: 110%;

          border-radius: 50% 50% 0 0;
        }

        .water-layer-one {
          bottom: -72px;
          height: 114px;

          background:
            rgba(32, 164, 176, 0.52);

          animation:
            waveMoveOne 8s
            ease-in-out infinite;
        }

        .water-layer-two {
          bottom: -83px;
          height: 132px;

          background:
            rgba(25, 128, 151, 0.34);

          animation:
            waveMoveTwo 11s
            ease-in-out infinite;
        }

        .water-layer-three {
          bottom: -96px;
          height: 144px;

          background:
            rgba(0, 83, 89, 0.13);

          animation:
            waveMoveOne 14s
            ease-in-out infinite reverse;
        }

        @keyframes waveMoveOne {
          0%,
          100% {
            transform:
              translateX(-2%)
              rotate(-0.3deg);
          }

          50% {
            transform:
              translateX(2%)
              rotate(0.4deg);
          }
        }

        @keyframes waveMoveTwo {
          0%,
          100% {
            transform:
              translateX(2%);
          }

          50% {
            transform:
              translateX(-3%);
          }
        }

        .boat-track {
          position: absolute;
          left: -180px;
          bottom: 37px;

          z-index: 10;

          animation:
            boatTravel 18s
            linear infinite;
        }

        @keyframes boatTravel {
          0% {
            transform:
              translateX(0);
          }

          100% {
            transform:
              translateX(
                calc(100vw + 360px)
              );
          }
        }

        .boat {
          position: relative;

          width: 122px;
          height: 65px;

          animation:
            boatBob 2.2s
            ease-in-out infinite;
        }

        @keyframes boatBob {
          0%,
          100% {
            transform:
              translateY(0)
              rotate(-1deg);
          }

          50% {
            transform:
              translateY(4px)
              rotate(1deg);
          }
        }

        .boat-hull {
          position: absolute;
          left: 8px;
          bottom: 2px;

          width: 109px;
          height: 27px;

          background: #f0543f;

          border:
            2px solid
            #003f35;

          border-radius:
            4px 5px 28px 28px;

          transform:
            skewX(-8deg);
        }

        .boat-cabin {
          position: absolute;
          left: 42px;
          bottom: 28px;

          width: 47px;
          height: 24px;

          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;

          background: #fff6d7;

          border:
            2px solid
            #003f35;

          border-radius:
            6px 6px 2px 2px;
        }

        .boat-cabin span {
          width: 10px;
          height: 9px;

          border-radius: 2px;

          background: #63b9c2;

          border:
            1px solid
            #003f35;
        }

        .boat-mast {
          position: absolute;
          left: 53px;
          bottom: 51px;

          width: 2px;
          height: 25px;

          background:
            #003f35;
        }

        .boat-flag {
          position: absolute;
          left: 55px;
          bottom: 64px;

          width: 18px;
          height: 10px;

          background:
            var(--goa-yellow);

          clip-path:
            polygon(
              0 0,
              100% 50%,
              0 100%
            );
        }

        .boat-person {
          position: absolute;
          left: 91px;
          bottom: 27px;

          width: 20px;
          height: 33px;

          z-index: 4;
        }

        .person-head {
          position: absolute;
          left: 5px;
          top: 0;

          width: 9px;
          height: 9px;

          border-radius: 50%;

          background: #7a4a2d;

          border:
            1.5px solid
            #003f35;
        }

        .person-body {
          position: absolute;
          left: 4px;
          top: 9px;

          width: 11px;
          height: 18px;

          border-radius:
            6px 6px 2px 2px;

          background:
            var(--goa-pink);

          border:
            1.5px solid
            #003f35;
        }


        /* RESPONSIVE */

        @media (
          max-width: 1380px
        ) {
          .pro-layout {
            width:
              min(
                1280px,
                calc(100% - 48px)
              );

            grid-template-columns:
              minmax(230px, 0.78fr)
              minmax(500px, 1.34fr)
              minmax(275px, 0.82fr);

            column-gap: 34px;
          }

          .pro-editorial h1 {
            font-size:
              clamp(
                45px,
                4vw,
                61px
              );
          }

          .receipt-card {
            padding:
              30px 26px 27px;
          }
        }


        @media (
          max-width: 1050px
        ) {
          .pro-hero {
            padding:
              42px 0 54px;
          }

          .pro-layout {
            width:
              min(
                760px,
                calc(100% - 36px)
              );

            grid-template-columns:
              1fr;

            gap: 34px;
          }

          .pro-editorial,
          .pro-center,
          .pro-receipt {
            justify-self: center;
          }

          .pro-editorial {
            max-width: 620px;
            padding-top: 0;
          }

          .pro-editorial h1 {
            font-size:
              clamp(
                48px,
                9vw,
                68px
              );
          }

          .feature-tags {
            margin-top: 23px;
          }

          .pro-goa-art {
            display: none;
          }

          .pro-center {
            max-width: 640px;
          }

          .pro-receipt {
            max-width: 640px;
            padding-top: 0;
          }

          .receipt-card h2 br {
            display: none;
          }
        }


        @media (
          max-width: 720px
        ) {
          .pro-hero {
            padding:
              30px 0 40px;
          }

          .pro-layout {
            width:
              calc(100% - 24px);

            gap: 24px;
          }

          .pro-editorial {
            padding: 8px 8px 0;
          }

          .editorial-kicker {
            margin-bottom: 13px;
          }

          .pro-editorial h1 {
            font-size:
              clamp(
                43px,
                13vw,
                59px
              );
          }

          .feature-tags {
            gap: 6px;
            margin-top: 19px;
          }

          .feature-tags span {
            min-height: 29px;
            padding: 6px 10px;
            font-size: 10px;
          }

          .receipt-card {
            padding:
              27px 23px 24px;

            border-radius: 24px;
          }

          .receipt-card h2 {
            font-size: 34px;
          }

          .water-scene {
            height: 104px;
          }

          .water-copy {
            top: 34px;
            font-size: 17px;
          }

          .boat-track {
            bottom: 31px;
          }

          .boat {
            transform:
              scale(0.86);
          }
        }


        @media (
          prefers-reduced-motion:
          reduce
        ) {
          .boat-track,
          .boat,
          .water-layer-one,
          .water-layer-two,
          .water-layer-three {
            animation: none;
          }

          .boat-track {
            left: 40px;
          }
        }
      `}</style>
    </main>
  );
}