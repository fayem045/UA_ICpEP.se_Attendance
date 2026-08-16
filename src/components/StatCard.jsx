import React from 'react'

export default function StatCard({ icon, value, label, trend }){
  return (
    <div className="stat-card">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <div style={{width:44,height:44,display:'grid',placeItems:'center',borderRadius:10,background:'linear-gradient(180deg, rgba(255,255,255,0.02), transparent)',border:'1px solid rgba(255,255,255,0.03)'}}>{icon}</div>
          <div>
            <div className="value">{value}</div>
            <div className="label">{label}</div>
          </div>
        </div>
        <div className="trend">{trend}</div>
      </div>
    </div>
  )
}
