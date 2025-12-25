import React, { useState } from 'react';
import './Consultant.css';
import findConsultant from './findConsultant';
import ConsultantDetail from './ConsultantDetail';
import ConsultantHeader from './ConsultantHeader';

export default function AustinTouey({ data }) {
  const [timePeriod, setTimePeriod] = useState('30d');
  
  // Find Austin's data in the array
  // ⚠️ Airtable has "Austin  Touey" (with DOUBLE SPACE) - ID: recMDMeNXATgpSTaK
  // There's also a duplicate "Auston" record (ID: recfKlixZE0P7ERkK) but we want the main one
  const consultant = findConsultant(data, 'Austin  Touey'); // Double space is intentional!

  if (!consultant) return <div>No data available for Austin Touey</div>;

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
