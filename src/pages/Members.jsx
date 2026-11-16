import React, { useEffect, useMemo, useState } from 'react'
import NavBar from '../components/NavBar'
import { supabase } from '../lib/supabaseClient'

export default function Members({ profile, onNavigate }) {
  const [members, setMembers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  async function loadPeople() {
    setIsLoading(true)
    setErrorMessage('')
    const [studentsResult, facultyResult] = await Promise.all([
      supabase.from('students').select('id, name, department').order('name'),
      supabase.from('faculty').select('id, name, department').order('name')
    ])

    if (studentsResult.error || facultyResult.error) {
      setErrorMessage(studentsResult.error?.message || facultyResult.error.message)
    } else {
      setMembers([
        ...(studentsResult.data || []).map((member) => ({ ...member, type: 'Student' })),
        ...(facultyResult.data || []).map((member) => ({ ...member, type: 'Faculty' }))
      ].sort((left, right) => (left.name || '').localeCompare(right.name || '')))
    }
    setIsLoading(false)
  }

  useEffect(() => { loadPeople() }, [])

  const visibleMembers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return members.filter((member) => {
      const matchesType = typeFilter === 'all' || member.type.toLowerCase() === typeFilter
      const matchesQuery = !query || [member.id, member.name, member.department, member.type]
        .some((value) => String(value || '').toLowerCase().includes(query))
      return matchesType && matchesQuery
    })
  }, [members, search, typeFilter])

    return(
        <div className="app-shell container">
            <Navbar activePage="members" onNavigate={onNavigate} profile={profile} />

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
