import react from 'react'
import Navbar from '../components/NavBar'

export default function Reports ({profile, onNavigate}){
    return(
        // start to create whatever bet content of page
        <div className="app-shell container">
            {/*start turn on the navbar */}
            <Navbar activePage="reports" onNavigate={onNavigate} />
            {/* end turn on */}
            <h1>Report Section is  Still under Development</h1>
        </div>
    )
}

