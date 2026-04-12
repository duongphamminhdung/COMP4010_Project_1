// Main App Component - Dũng
import React, { useState } from 'react';
import Page1 from './pages/Page1';
import Page2 from './pages/Page2';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('page1');
  const [selectedIsland, setSelectedIsland] = useState(null);

  const handleIslandClick = (islandName) => {
    setSelectedIsland(islandName);
    setCurrentPage('page2');
  };

  const handleBackToHome = () => {
    setCurrentPage('page1');
    setSelectedIsland(null);
  };

  return (
    <div className="App">
      {/* Skip navigation link for keyboard users */}
      <a href="#main-content" className="skip-nav">
        Skip to main content
      </a>
      <div id="main-content">
        {currentPage === 'page1' && (
          <Page1 onIslandClick={handleIslandClick} />
        )}
        {currentPage === 'page2' && (
          <Page2 island={selectedIsland} onBack={handleBackToHome} />
        )}
      </div>
    </div>
  );
}

export default App;
