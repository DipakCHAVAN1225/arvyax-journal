import { useState } from 'react';
import styles from './LoginPage.module.css';

const NATURE_QUOTES = [
  "In every walk with nature, one receives far more than he seeks.",
  "The clearest way into the universe is through a forest wilderness.",
  "Look deep into nature, and you will understand everything better.",
  "Nature always wears the colors of the spirit.",
];

export default function LoginPage({ onLogin }) {
  const [name, setName] = useState('');
  const [quote] = useState(() => NATURE_QUOTES[Math.floor(Math.random() * NATURE_QUOTES.length)]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim().length >= 2) {
      onLogin(name.trim().toLowerCase().replace(/\s+/g, '_'));
    }
  };

  return (
    <div className={styles.page}>
      {/* Animated background elements */}
      <div className={styles.bgLeaf} aria-hidden="true">
        <svg viewBox="0 0 200 300" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M100 10 C140 40, 180 80, 160 150 C140 220, 80 260, 100 290 C80 260, 20 220, 40 150 C20 80, 60 40, 100 10Z" fill="rgba(61,90,62,0.08)" />
          <path d="M100 10 L100 290" stroke="rgba(61,90,62,0.12)" strokeWidth="1"/>
          <path d="M100 60 C120 80, 150 100, 155 130" stroke="rgba(61,90,62,0.1)" strokeWidth="0.8"/>
          <path d="M100 60 C80 80, 50 100, 45 130" stroke="rgba(61,90,62,0.1)" strokeWidth="0.8"/>
          <path d="M100 110 C125 130, 148 155, 150 180" stroke="rgba(61,90,62,0.08)" strokeWidth="0.8"/>
          <path d="M100 110 C75 130, 52 155, 50 180" stroke="rgba(61,90,62,0.08)" strokeWidth="0.8"/>
        </svg>
      </div>
      <div className={styles.bgLeaf2} aria-hidden="true">
        <svg viewBox="0 0 200 300" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M100 10 C140 40, 180 80, 160 150 C140 220, 80 260, 100 290 C80 260, 20 220, 40 150 C20 80, 60 40, 100 10Z" fill="rgba(107,143,107,0.06)" />
        </svg>
      </div>

      <div className={styles.container}>
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}>
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="48" height="48">
              <circle cx="24" cy="24" r="22" stroke="#3d5a3e" strokeWidth="1.5" opacity="0.3"/>
              <path d="M24 6 C30 12, 38 16, 36 26 C34 36, 24 42, 24 42 C24 42, 14 36, 12 26 C10 16, 18 12, 24 6Z" fill="rgba(61,90,62,0.15)" stroke="#3d5a3e" strokeWidth="1"/>
              <path d="M24 6 L24 42" stroke="#3d5a3e" strokeWidth="0.8" opacity="0.4"/>
              <path d="M24 18 C28 22, 34 24, 34 28" stroke="#3d5a3e" strokeWidth="0.8" opacity="0.5"/>
              <path d="M24 18 C20 22, 14 24, 14 28" stroke="#3d5a3e" strokeWidth="0.8" opacity="0.5"/>
            </svg>
          </div>
          <h1 className={styles.logo}>ArvyaX</h1>
          <p className={styles.tagline}>Nature Journal</p>
        </div>

        <div className={styles.card}>
          <blockquote className={styles.quote}>
            <span className={styles.quoteMark}>"</span>
            {quote}
          </blockquote>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="name">
                What shall we call you?
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name..."
                className={styles.input}
                autoFocus
                minLength={2}
                maxLength={40}
              />
            </div>
            <button
              type="submit"
              className={styles.btn}
              disabled={name.trim().length < 2}
            >
              <span>Begin Your Journey</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </form>

          <p className={styles.hint}>
            Your journal is stored locally and linked to your name.
          </p>
        </div>

        <div className={styles.ambienceRow}>
          {['🌲', '🌊', '⛰️', '🌵', '🌿'].map((icon, i) => (
            <span
              key={i}
              className={styles.ambienceIcon}
              style={{ animationDelay: `${i * 0.15}s` }}
              aria-hidden="true"
            >
              {icon}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
