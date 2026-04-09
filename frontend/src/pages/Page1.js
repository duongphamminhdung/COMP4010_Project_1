// Page 1 - Island Selection - Dũng
import React from 'react';
import EarthMap from '../components/EarthMap';
import './Page1.css';

const Page1 = () => {
  return (
    <div className="page1-container">
      {/* Header */}
      <header className="page1-header">
        <h1>🐧 Palmer Archipelago Penguins</h1>
      </header>

      {/* Earth Map Component */}
      <EarthMap />
    </div>
  );
};

export default Page1;
