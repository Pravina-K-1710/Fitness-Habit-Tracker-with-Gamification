import React, { useState, useEffect } from 'react'
import { request, saveToken, clearToken } from './api'

function Login({onAuth}){
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')

  async function register(){
    try{
      // If password is empty, default to username (matches backend fallback)
      const passwordToSend = pass || user
      const data = await request('/register', 'POST', { username: user, password: passwordToSend })
      saveToken(data.access_token)
      onAuth()
    }catch(e){
      alert('Register failed: ' + e.message)
    }
  }

  async function login(){
    // OAuth2 password form expects form-encoded data
    const form = new URLSearchParams()
    form.append('username', user)
    form.append('password', pass)
    const res = await fetch('http://127.0.0.1:8000/login', {
      method: 'POST',
      body: form,
    })
    if (!res.ok) {
      const txt = await res.text()
      alert('Login failed: ' + (txt || res.statusText))
      return
    }
    const data = await res.json()
    saveToken(data.access_token)
    onAuth()
  }

  return (
    <div className="card">
      <h3>Login / Register</h3>
      <input value={user} onChange={e=>setUser(e.target.value)} placeholder="username" />
      <input value={pass} onChange={e=>setPass(e.target.value)} placeholder="password" type="password" />
      <div style={{display:'flex',gap:8}}>
        <button onClick={login}>Login</button>
        <button onClick={register}>Register</button>
      </div>
    </div>
  )
}

function XPBar({xp_in_level}){
  const pct = Math.min(100, Math.round((xp_in_level/100)*100))
  return (
    <div className="xpbar">
      <div className="xp-fill" style={{width:`${pct}%`}} />
      <div className="xp-text">{xp_in_level} / 100 XP</div>
    </div>
  )
}

function ProgressCircle({value}){
  const pct = Math.min(100, Math.round((value/100)*100))
  const dash = 2*Math.PI*40
  const offset = dash - (dash * pct) / 100
  return (
    <div className="progress-circle" title={`${value} / 100 XP`}>
      <svg width="100" height="100" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="g1" x1="0%" x2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="40" stroke="#eef2ff" strokeWidth="12" fill="none" />
        <circle cx="50" cy="50" r="40" stroke="url(#g1)" strokeWidth="12" fill="none"
          strokeDasharray={`${dash}`} strokeDashoffset={`${offset}`} strokeLinecap="round" transform="rotate(-90 50 50)" />
        <text x="50" y="55" textAnchor="middle" fontWeight={700} fontSize={14} fill="#0f172a">{pct}%</text>
      </svg>
    </div>
  )
}

function Mascot(){
  return (
    <div className="mascot">
      <div className="mascot-face">:)</div>
      <div className="mascot-wag" />
    </div>
  )
}

function Leaderboard({onSelect}){
  const [rows, setRows] = useState([])
  useEffect(()=>{ request('/leaderboard').then(setRows).catch(()=>{}) }, [])
  return (
    <div className="card">
      <h3>Leaderboard</h3>
      <ol>
        {rows.map(r=> <li key={r.username}>{r.username} — {r.xp} XP</li>)}
      </ol>
    </div>
  )
}

export default function App(){
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  async function loadProfile(){
    try{
      const p = await request('/user/me')
      setProfile(p)
    }catch(err){
      setProfile(null)
    }
  }

  const [goalInput, setGoalInput] = useState('')

  async function saveGoal(){
    try{
      const res = await request('/habits/goal', 'POST', { goal: goalInput })
      setProfile(prev=> ({...prev, daily_goal: res.daily_goal}))
      setGoalInput('')
      alert('Daily goal saved')
    }catch(e){
      alert('Error saving goal: '+e.message)
    }
  }

  useEffect(()=>{ loadProfile() }, [])

  function onAuth(){
    loadProfile()
    setUser(true)
  }

  async function complete(){
    try{
      const res = await request('/habits/complete', 'POST')
      alert(`+${res.gained} XP — Level ${res.level}`)
      loadProfile()
    }catch(e){
      alert('Error: ' + e.message)
    }
  }

  async function logout(){
    clearToken()
    setProfile(null)
    setUser(null)
  }

  return (
    <div className="app">
      <header>
        <h1>Fitness Habit Tracker</h1>
        {profile && <div className="user">{profile.username} — Level {profile.level} <button onClick={logout}>Logout</button></div>}
      </header>

      <main>
        {!profile ? <Login onAuth={onAuth} /> : (
          <>
            <div className="grid">
              <div className="card">
                <h2>Dashboard</h2>
                <div style={{display:'flex',alignItems:'center',gap:16}}>
                  <ProgressCircle value={profile.xp_in_level} />
                  <div>
                    <Mascot />
                    <p className="level-text">Level {profile.level}</p>
                    <XPBar xp_in_level={profile.xp_in_level} />
                  </div>
                </div>
                <p>Streak: {profile.streak} days</p>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={complete}>Complete Daily Goal</button>
                </div>
                <div className="badges">
                  {profile.achievements.map(a=> <span key={a} className="badge">{a}</span>)}
                </div>
                <div style={{marginTop:12}}>
                  <h4>Set Today's Goal</h4>
                  <input placeholder="e.g., Walk 30 minutes" value={goalInput} onChange={e=>setGoalInput(e.target.value)} />
                  <div style={{marginTop:8}}>
                    <button onClick={saveGoal}>Save Goal</button>
                  </div>
                  {profile.daily_goal && <p style={{marginTop:8}}>Current goal: <strong>{profile.daily_goal}</strong></p>}
                </div>
                <div className="recent-activity">
                  <h4>Recent Activity</h4>
                  <ul>
                    {profile.last_completed_date ? <li>Last completed: {profile.last_completed_date}</li> : <li>No completions yet</li>}
                    {profile.achievements.length===0 ? null : profile.achievements.slice(-3).map(a=> <li key={a}>Unlocked: {a}</li>)}
                  </ul>
                </div>
              </div>
              <Leaderboard />
            </div>
            <div className="card">
              <h3>Weekly AI Summary</h3>
              <WeeklySummary refresh={loadProfile} />
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function WeeklySummary(){
  const [text, setText] = useState('')
  useEffect(()=>{ request('/summary/weekly').then(r=>setText(r.summary)).catch(()=>setText('')) }, [])
  return <div>{text}</div>
}
