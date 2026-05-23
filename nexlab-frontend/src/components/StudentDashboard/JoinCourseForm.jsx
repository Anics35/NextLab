import { LoaderCircle } from 'lucide-react';

function JoinCourseForm({ inviteCode, setInviteCode, onSubmit, isLoading }) {
  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(inviteCode);
  };

  return (
    <form onSubmit={handleSubmit} style={styles.joinForm}>
      <input
        type="text"
        value={inviteCode}
        onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
        placeholder="Enter Course Invite Code"
        style={styles.input}
      />
      <button type="submit" disabled={isLoading} style={styles.joinButton}>
        {isLoading ? (
          <>
            <LoaderCircle size={16} style={{ marginRight: '6px' }} className="animate-spin" />
            Joining...
          </>
        ) : (
          'Join Course'
        )}
      </button>
    </form>
  );
}

const styles = {
  joinForm: {
    display: 'flex',
    gap: '10px',
    marginBottom: '18px'
  },
  input: {
    flex: 1,
    backgroundColor: '#101010',
    border: '1px solid #2f2f2f',
    color: '#fff',
    borderRadius: '10px',
    padding: '12px 14px',
    outline: 'none'
  },
  joinButton: {
    backgroundColor: '#ffa116',
    color: '#101010',
    border: 'none',
    borderRadius: '10px',
    padding: '0 16px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  }
};

export default JoinCourseForm;
