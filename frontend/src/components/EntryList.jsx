import { useState } from 'react';
import api from '../utils/api.js';
import styles from './EntryList.module.css';

const AMBIENCE_ICONS = {
  forest: '🌲', ocean: '🌊', mountain: '⛰️', desert: '🌵', meadow: '🌿',
};

const EMOTION_COLORS = {
  calm: '#4a7c6e', joyful: '#c4a030', anxious: '#8a4a4a', peaceful: '#5a7d8a',
  energized: '#7a8a3a', melancholic: '#6a5a7a', grateful: '#7a6a4a',
  reflective: '#5a6a7a', hopeful: '#6a8a6a', overwhelmed: '#8a5a4a',
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function EntryCard({ entry, onAnalyzed, showToast }) {
  const [expanded, setExpanded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async (e) => {
    e.stopPropagation();
    setAnalyzing(true);
    try {
      const updated = await api.analyzeEntry(entry.id);
      onAnalyzed(updated);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const emotionColor = entry.emotion ? (EMOTION_COLORS[entry.emotion] || '#6a7a6a') : null;

  return (
    <article
      className={`${styles.card} ${expanded ? styles.cardExpanded : ''}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className={styles.cardHeader}>
        <div className={styles.cardMeta}>
          <span className={styles.ambienceTag}>
            {AMBIENCE_ICONS[entry.ambience]} {entry.ambience}
          </span>
          <time className={styles.time}>{formatDate(entry.createdAt)}</time>
        </div>
        {entry.emotion && (
          <span
            className={styles.emotionBadge}
            style={{ '--em-color': emotionColor }}
          >
            {entry.emotion}
          </span>
        )}
      </div>

      <p className={`${styles.excerpt} ${expanded ? styles.excerptFull : ''}`}>
        {entry.text}
      </p>

      {expanded && entry.emotion && (
        <div className={styles.analysisBox} onClick={e => e.stopPropagation()}>
          {entry.summary && (
            <p className={styles.summary}>
              <span className={styles.summaryIcon}>◈</span>
              {entry.summary}
            </p>
          )}
          {entry.keywords?.length > 0 && (
            <div className={styles.keywords}>
              {entry.keywords.map((kw) => (
                <span key={kw} className={styles.keyword}>{kw}</span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={styles.cardFooter} onClick={e => e.stopPropagation()}>
        <button
          className={styles.expandBtn}
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? '↑ Less' : '↓ More'}
        </button>

        {!entry.emotion && (
          <button
            className={styles.analyzeBtn}
            onClick={handleAnalyze}
            disabled={analyzing}
          >
            {analyzing ? (
              <><span className={styles.spinner} />Analyzing...</>
            ) : (
              <><span>✦</span> Analyze</>
            )}
          </button>
        )}

        {entry.emotion && (
          <button
            className={styles.reanalyzeBtn}
            onClick={handleAnalyze}
            disabled={analyzing}
            title="Re-analyze"
          >
            {analyzing ? <span className={styles.spinner} /> : '↺'}
          </button>
        )}
      </div>
    </article>
  );
}

export default function EntryList({ entries, loading, onAnalyzed, showToast, onRefresh }) {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all'
    ? entries
    : entries.filter(e => e.ambience === filter);

  const AMBIENCES = ['all', 'forest', 'ocean', 'mountain', 'desert', 'meadow'];

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.loadingLeaf} aria-hidden="true">🌿</div>
        <p>Gathering your entries...</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>Your Entries</h2>
        <button className={styles.refreshBtn} onClick={onRefresh} title="Refresh">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M13 2v4H9M1 12V8h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2.5 5A5.5 5.5 0 0112 9M11.5 9a5.5 5.5 0 01-9.5-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className={styles.filterBar}>
        {AMBIENCES.map((a) => (
          <button
            key={a}
            className={`${styles.filterBtn} ${filter === a ? styles.filterActive : ''}`}
            onClick={() => setFilter(a)}
          >
            {a === 'all' ? 'All' : `${AMBIENCE_ICONS[a]} ${a}`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyIcon}>🌱</p>
          <p className={styles.emptyTitle}>No entries yet</p>
          <p className={styles.emptyText}>
            {filter === 'all'
              ? 'Begin your first nature journal entry.'
              : `No ${filter} entries found.`}
          </p>
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map((entry, i) => (
            <div key={entry.id} style={{ animationDelay: `${i * 0.05}s` }} className={styles.fadeItem}>
              <EntryCard entry={entry} onAnalyzed={onAnalyzed} showToast={showToast} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
