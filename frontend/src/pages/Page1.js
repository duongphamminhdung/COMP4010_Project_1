// Page 1 - Island Selection - Dũng
import React from 'react';
import EarthMap from '../components/EarthMap';
import './Page1.css';

const ISLAND_CARDS = [
  {
    name: 'Biscoe',
    color: '#A5D8FF',
    textColor: '#1B4965',
    species: ['Adélie', 'Gentoo'],
    population: 168,
    area: 'Largest island',
    highlight: 'Gentoo penguins here are the deepest divers — reaching up to 200 m.',
    image: '/island-biscoe.png',
    counts: [44, 124],
  },
  {
    name: 'Dream',
    color: '#FFD43B',
    textColor: '#7a5a00',
    species: ['Adélie', 'Chinstrap'],
    population: 124,
    area: 'Mid-size island',
    highlight: 'Chinstrap penguins are named for the thin black line under their chin.',
    image: '/island-dream.png',
    counts: [56, 68],
  },
  {
    name: 'Torgersen',
    color: '#B0C4DE',
    textColor: '#1B4965',
    species: ['Adélie'],
    population: 52,
    area: 'Smallest island',
    highlight: 'An exclusive Adélie colony — one of the southernmost in the study.',
    image: '/island-torgersen.png',
    counts: [52],
  },
];

const SPECIES_COLORS = {
  'Adélie':    '#4DA8DA',
  'Gentoo':    '#38a169',
  'Chinstrap': '#e07b39',
};

const Page1 = ({ onIslandClick, onGoToComparison }) => {
  return (
    <div className="page1-container">
      {/* Header */}
      <header className="page1-header" role="banner">
        <div className="header-left">
          <img src={process.env.PUBLIC_URL + '/vinuni_logo.png'} alt="VinUni Logo" className="logo" />
          <div className="course-info">
            <div className="course-name">Data Visualization</div>
            <div className="course-code">COMP4010</div>
          </div>
        </div>
        <div className="header-center">
          <h1 className="title">Palmer Archipelago Penguins</h1>
          <p className="subtitle">Select an island to explore</p>
        </div>
        <div className="header-right" />
      </header>

      {/* Hero intro strip */}
      <section className="hero-strip" aria-label="About the study">
        <div className="hero-text">
          <h2 className="hero-heading">Penguin Research in Antarctica</h2>
          <p className="hero-desc">
            From 2007 to 2009, Dr. Kristen Gorman and the Palmer LTER team measured
            344 penguins across three islands in the Palmer Archipelago, Antarctica.
            Three species — Adélie, Chinstrap, and Gentoo — were studied for body
            mass, flipper length, bill dimensions, and sex.
          </p>
          <div className="hero-species-badges">
            <span className="species-badge adelie">Adélie</span>
            <span className="species-badge chinstrap">Chinstrap</span>
            <span className="species-badge gentoo">Gentoo</span>
          </div>
        </div>
        <div className="hero-penguin-art" aria-hidden="true">
          <img
            src={process.env.PUBLIC_URL + '/penguin_all.png'}
            alt=""
            className="hero-penguin-img"
          />
        </div>
      </section>

      {/* Earth Map Component */}
      <main aria-label="Island selection map">
        <EarthMap onIslandClick={onIslandClick} />
      </main>

      {/* Island cards */}
      <section className="island-cards-section" aria-label="Island summaries">
        <h2 className="section-heading">Explore the Islands</h2>
        <div className="island-cards-grid">
          {ISLAND_CARDS.map((card) => (
            <button
              key={card.name}
              className="island-card"
              onClick={() => onIslandClick && onIslandClick(card.name)}
              aria-label={`Explore ${card.name} Island — ${card.species.join(' & ')}, ${card.population} penguins`}
              style={{ '--card-accent': card.color }}
            >
              <div className="card-img-wrap">
                <img
                  src={process.env.PUBLIC_URL + card.image}
                  alt={`${card.name} Island`}
                  className="card-img"
                />
                <div className="card-img-overlay" style={{ background: card.color + '33' }} />
              </div>
              <div className="card-body">
                <div className="card-title-row">
                  <h3 className="card-title" style={{ color: card.textColor }}>{card.name}</h3>
                  <span className="card-area">{card.area}</span>
                </div>

                {/* Species bars */}
                <div className="card-species-bars">
                  {card.species.map((sp, idx) => (
                    <div key={sp} className="species-bar-row">
                      <span
                        className="species-dot"
                        style={{ background: SPECIES_COLORS[sp] }}
                        aria-hidden="true"
                      />
                      <span className="species-bar-label">{sp}</span>
                      <div className="species-bar-track">
                        <div
                          className="species-bar-fill"
                          style={{
                            width: `${Math.round((card.counts[idx] / card.population) * 100)}%`,
                            background: SPECIES_COLORS[sp],
                          }}
                        />
                      </div>
                      <span className="species-bar-count">{card.counts[idx]}</span>
                    </div>
                  ))}
                </div>

                <p className="card-highlight">{card.highlight}</p>

                <div className="card-footer">
                  <span className="card-pop-badge" style={{ background: card.color, color: card.textColor }}>
                    {card.population} penguins
                  </span>
                  <span className="card-cta">Explore →</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Media section – video + penguins image */}
      <section className="media-section" aria-label="Penguin footage">
        <h2 className="section-heading">Penguins in the Wild</h2>
        <div className="media-grid">
          <div className="media-video-wrap">
            <video
              className="media-video"
              src={process.env.PUBLIC_URL + '/runnn.mp4'}
              controls
              loop
              muted
              playsInline
              aria-label="Penguins running in Antarctica"
            />
          </div>
          <div className="media-img-wrap">
            <img
              src={process.env.PUBLIC_URL + '/penguins.png'}
              alt="Penguins in the Palmer Archipelago"
              className="media-img"
            />
          </div>
        </div>
      </section>

      {/* Compare Penguins CTA */}
      <section className="compare-cta-section" aria-label="Compare penguin groups">
        <div className="compare-cta-card">
          <div className="compare-cta-text">
            <h2 className="compare-cta-heading">Compare Penguin Groups</h2>
            <p className="compare-cta-desc">
              Pick any two combinations of species, island, and gender to compare side-by-side —
              KPIs, radar chart, boxplots, and AI-generated insights.
            </p>
          </div>
          <button
            className="compare-cta-btn"
            onClick={() => onGoToComparison && onGoToComparison()}
            aria-label="Go to penguin group comparison page"
          >
            Penguin Fight! →
          </button>
        </div>
      </section>

      {/* Footer strip */}
      <footer className="page1-footer" aria-label="Data attribution">
        <p>
          Data: <strong>Gorman KB, Williams TD, Fraser WR</strong> (2014) · Palmer LTER ·
          {' '}<em>PLOS ONE</em> 9(3): e90081 ·{' '}
          <a
            href="https://doi.org/10.1371/journal.pone.0090081"
            target="_blank"
            rel="noreferrer"
          >doi:10.1371/journal.pone.0090081</a>
        </p>
      </footer>
    </div>
  );
};

export default Page1;
