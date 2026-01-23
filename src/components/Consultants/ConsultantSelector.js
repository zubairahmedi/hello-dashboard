import React, { useState } from 'react';
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

  // Dynamically pick the component to render
  const SelectedComponent = consultantComponents[selected];

  return (
    <div>
      {/* Compact Tab-based Consultant Selector */}
      <div className="consultant-tabs-container">
        {Object.keys(consultantComponents).map((name) => (
          <button
            key={name}
            className={`consultant-tab ${selected === name ? 'active' : ''}`}
            onClick={() => setSelected(name)}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Render the selected consultant component */}
      <div className="consultant-view-container">
        <SelectedComponent data={data} />
      </div>
    </div>
  );
}
