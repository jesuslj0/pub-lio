import { useState } from "react";

interface VoteButtonProps {
  /** id de la foto (para conectar con Supabase más adelante) */
  id: string | number;
  /** número de votos inicial */
  votes: number;
}

export default function VoteButton({ id, votes }: VoteButtonProps) {
  const [count, setCount] = useState(votes);
  const [voted, setVoted] = useState(false);

  const handleVote = () => {
    if (voted) return;
    setVoted(true);
    setCount((c) => c + 1);
    // TODO: persistir el voto en Supabase usando `id`
    void id;
  };

  return (
    <div className="foto-vote">
      <button
        className="foto-vote-btn"
        onClick={handleVote}
        style={
          voted
            ? { background: "var(--accent2)", color: "#fff" }
            : undefined
        }
      >
        {voted ? "♥ Votado" : "♥ Votar"}
      </button>
      <span>{count} votos</span>
    </div>
  );
}
