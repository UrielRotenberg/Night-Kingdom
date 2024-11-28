import React from 'react';
import InspectionSystem from './Components/InspectionSystem';
import MobileController from './Components/MobileController';


const App = () => {
  const [isMobileView, setIsMobileView] = React.useState(false);
  const [useFlashlight, setUseFlashlight] = React.useState(false);

  React.useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setIsMobileView(isMobile);
  }, []);


  return (
    <div className="App">
      {isMobileView ? (
        <>
   
          <MobileController />
        </>
      ) : (
        <InspectionSystem />
      )}
    </div>
  );
};

export default App;