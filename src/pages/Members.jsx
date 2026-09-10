import React, { useEffect, useState } from 'react'
import Navbar from '../components/NavBar'
import { supabase } from '../lib/supabaseClient'

export default function Members ({profile, onNavigate}){
    const [members, setMembers] = useState([])
    // first step in setfaculty
    const [faculty, setFaculty] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        async function loadPeople() {
            const [studentsResult, facultyResult] = await Promise.all([
                supabase.from('students').select('id, name, department, label').order('name'),
                // 2nd faculty
                supabase.from('faculty').select('id, name, department,label').order('name')
            ])

            if (studentsResult.error || facultyResult.error) {
                setErrorMessage(studentsResult.error?.message || facultyResult.error.message)
            } else {
                setMembers(studentsResult.data || [])
                // third step in setfaculty
                setFaculty(facultyResult.data || [])
            }

            setIsLoading(false)
        }

        loadPeople()
    }, [])

    return(
        <div className="app-shell container">
            <Navbar activePage="members" onNavigate={onNavigate} />

            <div className="dashboard-header">
                <div className="header-left">
                    <h1>Members</h1>
                    <p>Registered students and faculty members.</p>
                </div>
                <strong>{members.length + faculty.length} total</strong>
            </div>

            <div className="card">
                {isLoading && <p>Loading members...</p>}
                {errorMessage && <p role="alert">Unable to load members: {errorMessage}</p>}
                {!isLoading && !errorMessage && members.length === 0 && faculty.length === 0 && <p>No members registered yet.</p>}
                {!isLoading && !errorMessage && (members.length > 0 || faculty.length > 0) && (
                    <div className="table-scroll">
                        <table className="table">
                            <thead>
                                <tr><th>Type</th><th>ID / Member Number</th><th>Name</th><th>Department / Unit</th></tr>
                            </thead>
                            <tbody>
                                {members.map((member) => (
                                    <tr key={`student-${member.id}`}>
                                        <td>Student</td>
                                        <td>{member.id}</td>
                                        <td>{member.name}</td>
                                        <td>{member.department || 'No department'}</td>
                                    </tr>
                                ))}
                                {faculty.map((member) => (
                                    <tr key={`faculty-${member.id}`}>
                                        <td>Faculty</td>
                                        <td>{member.id}</td>
                                        <td>{member.name}</td>
                                        <td>{member.department || 'No department'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

