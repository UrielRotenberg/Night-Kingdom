import React from 'react';
import InspectionSystem from './Components/InspectionSystem';
import PrisonReportPDF from './Components/PrisonReportPDF';

const App = () => {
  const [results, setResults] = React.useState(null);

  const handleResults = (newResults) => {
    setResults(newResults);
  };

  return (
    <div className="App">
      <InspectionSystem onResults={handleResults} />
      {results && <PrisonReportPDF results={results} />}
    </div>
  );
};

export default App;
