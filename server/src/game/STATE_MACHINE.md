# Authoritative round lifecycle

`EngineRound.phase` is the persisted source of truth. Actions are applied to a cloned state in `applyEngineAction`, then the complete state and associated ledger records are committed in one serializable transaction by `gameService`.

| Phase | Entry and allowed player action | Exit |
| --- | --- | --- |
| `round-funding` | Optional emergency loan for a player below the 50 chip ante. | Timer starts the round or finishes the match if nobody can enter. |
| `question-betting` | Only `actorId` may check, call, raise, go all-in, or fold. | Street closes into `secret-clue`; folding to one survivor settles into reveal. |
| `secret-clue` | Each eligible player requests their own question-specific hint. | The last hint request opens `guess-input`. At timeout, the server privately generates and persists any missing eligible hints before opening guesses. |
| `guess-input` | Each eligible player submits one non-negative integer guess. | All eligible guesses open `final-betting`; timeout opens the final betting street. |
| `final-betting` | Only `actorId` may make a betting decision. | Street closes into `round-reveal`. |
| `round-reveal` | Server settles the stored guesses against its private answer and commits payouts. | The next round begins or the match finishes. Reveal data is emitted only after this transaction. |
| `podium-finish` | No more round actions. | Final leaderboard is sent. |

Public `game:state` contains roster identity and server-derived progress flags. It does not contain balances, hints, guesses, or the answer. A player's chips, debt, hint, and own guess are sent only through `player:private`; reveal guesses, contributions, answer, and payouts are sent only in `game:reveal` after settlement.
