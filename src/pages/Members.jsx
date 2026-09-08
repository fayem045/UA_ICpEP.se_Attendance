import react from 'react'
import Navbar from '../components/NavBar'

export default function Members ({profile, onNavigate}){
    return(
        // start to create whatever bet content of page
        <div>
            {/*start turn on the navbar */}
            <Navbar activePage="members" onNavigate={onNavigate} />
            {/* end turn on */}
            <h2>Members</h2>
        </div>
        // end of content
    )
}

