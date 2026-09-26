/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

const WORDS = ["Build", "Run", "Improve"] as const;
const ROWS = [0, 1, 2, 3, 4, 5] as const;
const WORDS_PER_HALF = 12;

export function AuthTypeBands() {
  return (
    <div aria-hidden="true" className="auth-bands">
      {ROWS.map((row) => (
        <div
          key={row}
          className="auth-band"
          style={{
            opacity: row % 2 ? 0.9 : 0.45,
            animationDuration: `${70 + row * 12}s`,
            animationDirection: row % 2 ? "reverse" : "normal",
          }}
        >
          {/* Two identical halves: translating by -50% lands exactly on the second half. */}
          {Array.from({ length: WORDS_PER_HALF * 2 }, (_, index) => {
            const offset = (index % WORDS_PER_HALF) + row;
            return (
              <span key={index} style={{ fontWeight: offset % 2 ? 800 : 100 }}>
                {WORDS[offset % 3]}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
