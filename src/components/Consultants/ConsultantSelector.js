import React, { useState, useRef, useEffect } from 'react';
import './ConsultantSelector.css';
import LisaMagnan from './LisaMagnan';
import PriscillaC from './PriscillaC';
import AustinTouey from './AustinTouey';
import KeithTalty from './KeithTalty';

const consultantComponents = {
  'Lisa Magnan': LisaMagnan,
  'Priscilla C.': PriscillaC,
  'Austin Touey': AustinTouey,
  'Keith Talty': KeithTalty,
};

export default function ConsultantSelector({ data }) {
  const [selected, setSelected] = useState('Lisa Magnan'); // default selection
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownTop, setDropdownTop] = useState(0);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownTop(rect.bottom + 8);
    }
  }, [isOpen]);

  // Dynamically pick the component to render
  const SelectedComponent = consultantComponents[selected];

  return (
    <div>
      {/* Advanced Consultant Selector */}
      <div className="advanced-consultant-selector">
        <div className="selector-container">
          <div className="selector-header">
            <h3>Select Consultant</h3>
            <span className="selected-count">{Object.keys(consultantComponents).length} Available</span>
          </div>
          
          <div className="custom-select-wrapper">
            <button 
              ref={buttonRef}
              className={`custom-select-button ${isOpen ? 'open' : ''}`}
              onClick={() => setIsOpen(!isOpen)}
            >
              <span className="selected-name">{selected}</span>
              <span className="select-icon">⌄</span>
            </button>
            
            {isOpen && (
              <div 
                className="custom-dropdown"
                style={{top: `${dropdownTop}px`}}
              >
                {Object.keys(consultantComponents).map((name, idx) => (
                  <button
                    key={name}
                    className={`dropdown-item ${selected === name ? 'active' : ''}`}
                    onClick={() => {
                      setSelected(name);
                      setIsOpen(false);
                    }}
                    style={{
                      animationDelay: `${idx * 0.05}s`
                    }}
                  >
                    <span className="item-dot"></span>
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Render the selected consultant component */}
      <div className="consultant-view-container">
        <SelectedComponent data={data} />
      </div>
    </div>
  );
}
