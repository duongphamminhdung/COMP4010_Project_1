// Page 1 - Island Selection - Dũng
import React from 'react';
import EarthMap from '../components/EarthMap';
import './Page1.css';

const Page1 = ({ onIslandClick }) => {
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

      {/* Earth Map Component */}
      <main aria-label="Island selection map">
        <EarthMap onIslandClick={onIslandClick} />
      </main>
    </div>
  );
};

export default Page1;
