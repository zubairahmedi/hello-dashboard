import React, { useState } from 'react';
import './Consultant.css';
import ConsultantDetail from './ConsultantDetail';
import ConsultantHeader from './ConsultantHeader';
import findConsultant from './findConsultant';

export default function LisaMagnan({ data }) {
  const [timePeriod, setTimePeriod] = useState('30d');
  
  // Find Lisa's data in the array (robust matching)
  const consultant = findConsultant(data, 'Lisa Magnan');

  if (!consultant) return <div>No data available</div>;

  return (
    <div className="consultant-container">
      {/* Header Compartment */}
      <ConsultantHeader 
        consultant={consultant}
        timePeriod={timePeriod}
        setTimePeriod={setTimePeriod}
        data={data}
      />

      {/* Detailed Charts and Analytics */}
      <ConsultantDetail consultant={consultant} allConsultants={data} />
    </div>
  );
}

