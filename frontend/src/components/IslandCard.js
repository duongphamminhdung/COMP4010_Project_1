// Island Card Component - Dũng
import React, { useState } from 'react';
import './IslandCard.css';

const IslandCard = ({ island, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Island data with preview stats
  const islandData = {
    Biscoe: {
      species: ['Adelie', 'Gentoo'],
      penguinCount: 168,
      avgBodyMass: '4723g',
      avgFlipperLength: '209mm',
      description: 'Largest island with diverse penguin population',
      color: '#A5D8FF'
    },
    Dream: {
      species: ['Adelie', 'Chinstrap'],
      penguinCount: 124,
      avgBodyMass: '3714g',
      avgFlipperLength: '193mm',
      description: 'Home to Adelie and Chinstrap penguins',
      color: '#FFD43B'
    },
    Torgersen: {
      species: ['Adelie'],
      penguinCount: 52,
      avgBodyMass: '3706g',
      avgFlipperLength: '191mm',
      description: 'Smallest island with only Adelie penguins',
      color: '#FFFFFF'
    }
  };

  const data = islandData[island];

  return (
    <div 
      className={`island-card ${isHovered ? 'hovered' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ borderColor: data.color === '#FFFFFF' ? '#000000' : data.color }}
    >
      {/* Island Header */}
      <div className="island-card-header">
        <h3>{island}</h3>
        <div 
          className="island-color-indicator"
          style={{ backgroundColor: data.color }}
        ></div>
      </div>

      {/* Species Info */}
      <div className="island-card-section">
        <p className="section-label">Species Present:</p>
        <div className="species-tags">
          {data.species.map((species, index) => (
            <span key={index} className="species-tag">
              🐧 {species}
            </span>
          ))}
        </div>
      </div>

      {/* Preview Stats */}
      <div className="island-card-stats">
        <div className="stat-item">
          <span className="stat-label">Total Penguins:</span>
          <span className="stat-value">{data.penguinCount}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Avg Body Mass:</span>
          <span className="stat-value">{data.avgBodyMass}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Avg Flipper Length:</span>
          <span className="stat-value">{data.avgFlipperLength}</span>
        </div>
      </div>

      {/* Description */}
      <p className="island-description">{data.description}</p>

      {/* Explore Button */}
      <button className="explore-button">
        Explore {island} →
      </button>
    </div>
  );
};

export default IslandCard;
