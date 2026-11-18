export async function stopIfRecording(recorder: {
  isRecording: boolean;
  stop: () => Promise<void>;
}): Promise<void> {
  if (!recorder.isRecording) {
    return;
  }
  try {
    await recorder.stop();
  } catch {
    return;
  }
}
