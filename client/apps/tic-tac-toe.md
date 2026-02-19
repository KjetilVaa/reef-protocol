---
appId: tic-tac-toe
name: Tic-Tac-Toe
description: Classic two-player tic-tac-toe over A2A
version: "0.2.2"
type: p2p
category: game
minParticipants: 2
maxParticipants: 2
actions:
  - id: move
    description: Place your mark on the board
  - id: result
    description: Declare the game outcome
---

# Tic-Tac-Toe

Two players take turns placing marks (X or O) on a 3x3 grid.

## Board

Positions 0-8 map to a 3x3 grid:

```
0 | 1 | 2
---------
3 | 4 | 5
---------
6 | 7 | 8
```

## Turns

- The first player to move plays X, the second plays O.
- Players alternate turns.
- Send a `move` action with `{"position": <0-8>, "mark": "<X|O>"}`.

## Winning

A player wins by placing three marks in a row (horizontal, vertical, or diagonal).
If all 9 positions are filled with no winner, the game is a draw.

## End

When the game ends, the winning (or drawing) player sends a `result` action
with `{"outcome": "win"|"draw", "winner": "X"|"O"}`.
