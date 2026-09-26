export interface DuelDrill {
  prompt: string;
  options: [string, string, string, string];
  answer: number;
}

export function duelPoints(combo: number): number {
  return 10 * combo;
}

export function shuffleDrill(drill: { prompt: string; options: string[]; answer: number }): DuelDrill {
  const correct = drill.options[drill.answer] ?? "";
  const options = [...drill.options];
  for (let index = options.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = options[index] ?? "";
    options[index] = options[swapIndex] ?? "";
    options[swapIndex] = current;
  }
  const answer = Math.max(0, options.indexOf(correct));
  return {
    prompt: drill.prompt,
    options: [options[0] ?? "", options[1] ?? "", options[2] ?? "", options[3] ?? ""],
    answer,
  };
}
