import React from 'react'
import ReactDOM from 'react-dom/client'
import ProfileRecommender from './ProfileRecommender.jsx'

// ---------------------------------------------------------------------------
// TO USE YOUR OWN COMPONENT:
// 1. Drop your real file in as  src/ProfileRecommender.jsx  (replace the
//    placeholder), OR keep your filename and change the import line above.
// 2. Make sure your component has a DEFAULT export:  export default function ...
// That's it — main.jsx already mounts whatever this import points to.
// ---------------------------------------------------------------------------

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ProfileRecommender />
  </React.StrictMode>,
)
