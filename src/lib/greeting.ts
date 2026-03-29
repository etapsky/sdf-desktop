// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

export function getGreeting(name?: string): { text: string; emoji: string } {
  const h = new Date().getHours();
  let text: string;
  let emoji: string;

  if (h >= 5 && h < 12) {
    text = "Good morning";
    emoji = "☀️";
  } else if (h >= 12 && h < 17) {
    text = "Good afternoon";
    emoji = "🌤";
  } else if (h >= 17 && h < 21) {
    text = "Good evening";
    emoji = "🌆";
  } else {
    text = "Good night";
    emoji = "🌙";
  }

  return { text: name ? `${text}, ${name}` : text, emoji };
}
