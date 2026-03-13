import { useState } from 'react';
import api from '../utils/api.js';
import styles from './JournalForm.module.css';

const AMBIENCES = [
  { id: 'forest', label: 'Forest', icon: '🌲', desc: 'Towering pines & rustling leaves' },
  { id: 'ocean', label: 'Ocean', icon: '🌊', desc: 'Tidal rhythms & salt air' },
  { id: 'mountain', label: 'Mountain', icon: '⛰️', desc: 'Stone silence & vast views' },
  { id: 'desert', label: 'Desert', icon: '🌵', desc: 'Warm sands & starlit skies' },
  { id: 'meadow', label: 'Meadow', icon: '🌿', desc: 'Wildflowers & open breeze' },
];

const PROMPTS = [
  "What sensations stood out most during your session?",
  "How did your body feel as you settled into the environment?",
  "What thoughts arose and then dissolved?",
  "Describe a single moment that felt particularly alive.",
  "What did you notice that you usually overlook?",
];

export default function JournalForm({ userId, onCreated, showToast }) {
  const [ambience, setAmbience] = useState('forest');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [prompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  const [charCount, setCharCount] = useState(0);

  const MAX = 5000;

  const handleTextChange = (e) => {
    setText(e.target.value);
    setCharCount(e.target.value.length);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || text.trim().length < 5) {
      showToast('Please write at least a few words.', 'error');
      return;
    }
    setLoading(true);
    try {
      const entry = await api.createEntry({ userId, ambience, text: text.trim() });
      setText('');
      setCharCount(0);
      onCreated(entry);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectedAmbience = AMBIENCES.find(a => a.id === ambience);

  return (
    <div className={styles.wrapper}>
      <div className={styles.titleRow}>
        <h2 className={styles.title}>Today's Reflection</h2>
        <p className={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Ambience Selector */}
        <div className={styles.section}>
          <label className={styles.sectionLabel}>Session Ambience</label>
          <div className={styles.ambienceGrid}>
            {AMBIENCES.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`${styles.ambienceCard} ${ambience === a.id ? styles.ambienceSelected : ''}`}
                onClick={() => setAmbience(a.id)}
                style={ambience === a.id ? { '--amb-color': `var(--${a.id})` } : {}}
              >
                <span className={styles.ambienceEmoji}>{a.icon}</span>
                <span className={styles.ambienceLabel}>{a.label}</span>
                <span className={styles.ambienceDesc}>{a.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Text area */}
        <div className={styles.section}>
          <label className={styles.sectionLabel} htmlFor="journal-text">
            Your Entry
          </label>
          <div className={styles.textareaWrap}>
            <p className={styles.promptHint}>{prompt}</p>
            <textarea
              id="journal-text"
              className={styles.textarea}
              value={text}
              onChange={handleTextChange}
              placeholder="Let your thoughts flow freely..."
              rows={8}
              maxLength={MAX}
            />
            <div className={styles.textFooter}>
              <span className={`${styles.charCount} ${charCount > MAX * 0.9 ? styles.charWarn : ''}`}>
                {charCount} / {MAX}
              </span>
              <span className={styles.ambiencePill}>
                {selectedAmbience.icon} {selectedAmbience.label}
              </span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={loading || text.trim().length < 5}
        >
          {loading ? (
            <>
              <span className={styles.spinner} aria-hidden="true" />
              Saving...
            </>
          ) : (
            <>
              <span>Save Entry</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v9M4 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
