import styles from './Header.module.css';

const GREETINGS = ['Good morning', 'Good afternoon', 'Good evening'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return GREETINGS[0];
  if (h < 18) return GREETINGS[1];
  return GREETINGS[2];
}

export default function Header({ userId, onLogout, entryCount }) {
  const displayName = userId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.logoMark} aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
            <path d="M16 2 C20 7, 26 10, 24 17 C22 24, 16 28, 16 28 C16 28, 10 24, 8 17 C6 10, 12 7, 16 2Z"
              fill="rgba(61,90,62,0.15)" stroke="var(--moss)" strokeWidth="1"/>
            <line x1="16" y1="2" x2="16" y2="28" stroke="var(--moss)" strokeWidth="0.8" opacity="0.5"/>
          </svg>
        </div>
        <div>
          <p className={styles.greeting}>{getGreeting()},</p>
          <h2 className={styles.name}>{displayName}</h2>
        </div>
      </div>

      <div className={styles.right}>
        {entryCount > 0 && (
          <span className={styles.count}>
            {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
          </span>
        )}
        <button className={styles.logoutBtn} onClick={onLogout} title="Change user">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 2H2a1 1 0 00-1 1v8a1 1 0 001 1h3M9 10l3-3-3-3M13 7H5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Exit</span>
        </button>
      </div>
    </header>
  );
}
