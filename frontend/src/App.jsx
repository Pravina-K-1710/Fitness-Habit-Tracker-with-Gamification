import React, { useMemo, useState } from 'react'

function StatCard({ value, label }) {
  return (
    <div className="stat-card">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

function FeaturePanel({ tag, title, description }) {
  return (
    <div className="panel-card">
      <span className="panel-tag">{tag}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}

function HabitCard({ habit, onToggle }) {
  return (
    <div className={`habit-card ${habit.done ? 'habit-done' : ''}`} onClick={() => onToggle(habit.id)}>
      <div>
        <h4>{habit.title}</h4>
        <p>{habit.description}</p>
      </div>
      <span className="habit-status">{habit.done ? 'Done' : 'Tap to track'}</span>
    </div>
  )
}

function App() {
  const [habits, setHabits] = useState([
    { id: 1, title: 'Morning walk', description: 'Move for 20 minutes to start the day.', done: true },
    { id: 2, title: 'Hydration reset', description: 'Drink 8 glasses and log your water.', done: false },
    { id: 3, title: 'Evening stretch', description: 'Finish with a calm stretch routine.', done: false },
    { id: 4, title: 'Recovery breath', description: 'Take 5 minutes to breathe and reset.', done: false },
  ])
  const [goal, setGoal] = useState('Move consistently for 21 days')
  const [newGoal, setNewGoal] = useState('')

  const completedCount = useMemo(() => habits.filter(habit => habit.done).length, [habits])
  const progress = Math.round((completedCount / habits.length) * 100)

  function toggleHabit(id) {
    setHabits(current => current.map(habit => habit.id === id ? { ...habit, done: !habit.done } : habit))
  }

  function saveGoal() {
    if (!newGoal.trim()) return
    setGoal(newGoal.trim())
    setNewGoal('')
  }

  return (
    <div className="app front">
      <header className="site-header">
        <div className="brand">
          <div className="brand-mark">11</div>
          <div>
            <div className="brand-name">Habit Studio</div>
            <div className="brand-subtitle">Fitness × routine</div>
          </div>
        </div>
        <nav className="site-nav">
          <a href="#hero">Home</a>
          <a href="#focus">Focus</a>
          <a href="#habits">Habits</a>
          <a href="#goal">Goal</a>
        </nav>
      </header>

      <main className="site-shell">
        <section className="hero-section" id="hero">
          <div className="hero-copy">
            <p className="eyebrow">FITNESS HABIT TRACKER</p>
            <h1>Build momentum with a calm, modern routine system.</h1>
            <p className="hero-text">A simple fitness page inspired by elegant habit studios. Track daily movement, recovery, and consistent routines without login.</p>
            <div className="hero-actions">
              <a className="button button-primary" href="#habits">View habits</a>
              <a className="button button-muted" href="#focus">Explore focus</a>
            </div>
          </div>
          <div className="hero-panel">
            <StatCard value="225+" label="Daily check-ins" />
            <StatCard value="36" label="Active programs" />
            <StatCard value="12" label="Focus themes" />
            <StatCard value="4+" label="Rhythm types" />
          </div>
        </section>

        <section className="section split-grid" id="focus">
          <div>
            <p className="section-eyebrow">Our approach</p>
            <h2>Fitness habits that feel calm, clear, and consistent.</h2>
            <p className="section-text">We offer a focused routine system for daily movement, restorative recovery, and sustainable energy. Everything is designed to be easy to start and easy to keep doing.</p>
          </div>
          <div className="feature-grid">
            <FeaturePanel tag="Move" title="Daily activation" description="A low-friction practice for strength, mobility, and energy." />
            <FeaturePanel tag="Recover" title="Sleep & restore" description="Track recovery routines that support better rest and resilience." />
            <FeaturePanel tag="Focus" title="Momentum" description="Build clarity with a daily ritual and small progress checks." />
            <FeaturePanel tag="Track" title="Simple tracking" description="A calm interface for habits, goals, and consistent progress." />
          </div>
        </section>

        <section className="section card-section" id="habits">
          <div className="section-intro">
            <p className="section-eyebrow">Daily habits</p>
            <h2>Tap each habit as you complete it.</h2>
            <p className="section-text">This demo tracks progress locally in the browser, no username or password required.</p>
          </div>
          <div className="dashboard-grid">
            <div className="card">
              <h3>Today's progress</h3>
              <div className="progress-meter">
                <div className="progress-circle">
                  <div className="progress-inner">{progress}%</div>
                </div>
                <p>{completedCount} of {habits.length} habits complete</p>
              </div>
            </div>

            <div className="card habit-list-card">
              <h3>Habit checklist</h3>
              {habits.map(habit => (
                <HabitCard key={habit.id} habit={habit} onToggle={toggleHabit} />
              ))}
            </div>
          </div>
        </section>

        <section className="section split-grid" id="goal">
          <div>
            <p className="section-eyebrow">Your goal</p>
            <h2>Define a fitness habit goal for today.</h2>
            <p className="section-text">Use a simple daily target to keep your routine grounded. Update it at any time.</p>
          </div>
          <div className="goal-card card">
            <h3>Current goal</h3>
            <p>{goal}</p>
            <div className="goal-input-row">
              <input value={newGoal} onChange={e => setNewGoal(e.target.value)} placeholder="Write a new goal" />
              <button className="button button-primary" onClick={saveGoal}>Save</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>Fitness habit tracker demo • No login required</span>
        <span>Built with Vite + React</span>
      </footer>
    </div>
  )
}

export default App
