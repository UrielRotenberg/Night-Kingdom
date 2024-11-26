// import React from 'react';
// import InspectionSystem from './Components/InspectionSystem';
// import MobileController from './Components/MobileController';

// const App = () => {
//   const [isMobileView, setIsMobileView] = React.useState(false);

//   React.useEffect(() => {
//     const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
//     setIsMobileView(isMobile);
//   }, []);

//   return (
//     <div className="App">
//       {isMobileView ? (
//         <MobileController />
//       ) : (
//         <InspectionSystem />
//       )}
//     </div>
//   );
// };

// export default App;

import React from 'react';
import InspectionSystem from './Components/InspectionSystem';
import MobileController from './Components/MobileController';
import FlashlightController from './Components/FlashlightController';

const App = () => {
  const [isMobileView, setIsMobileView] = React.useState(false);
  const [useFlashlight, setUseFlashlight] = React.useState(false);

  React.useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setIsMobileView(isMobile);
  }, []);

  if (useFlashlight) {
    return <FlashlightController />;
  }

  return (
    <div className="App">
      {isMobileView ? (
        <>
          <button 
            onClick={() => setUseFlashlight(true)}
            className="absolute top-4 right-4 bg-blue-500 p-2 rounded text-white"
          >
            בדיקת פנס
          </button>
          <MobileController />
        </>
      ) : (
        <InspectionSystem />
      )}
    </div>
  );
};

export default App;