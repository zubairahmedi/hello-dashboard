import React, { useState } from 'react';
import './Consultant.css';
import findConsultant from './findConsultant';
import ConsultantDetail from './ConsultantDetail';
import ConsultantHeader from './ConsultantHeader';

export default function KeithTalty({ data }) {
  const [timePeriod, setTimePeriod] = useState('30d');
  
  // Find Keith's data in the array (robust matching)
  const consultant = findConsultant(data, 'Keith Talty');

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
