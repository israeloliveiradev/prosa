import assert from "node:assert/strict";
import test from "node:test";
import { stopIfRecording } from "../mobile/src/lib/stop-recorder.ts";

test("stopIfRecording skips a recorder that was never prepared", async () => {
  let stopped = 0;
  await stopIfRecording({
    isRecording: false,
    stop: async () => {
      stopped += 1;
      throw new Error("Cannot start an audio recording without initializing a MediaRecorder.");
    },
  });
  assert.equal(stopped, 0);
});

test("stopIfRecording stops an active recorder and swallows a late throw", async () => {
  let stopped = 0;
  await stopIfRecording({
    isRecording: true,
    stop: async () => {
      stopped += 1;
    },
  });
  assert.equal(stopped, 1);
  await stopIfRecording({
    isRecording: true,
    stop: async () => {
      throw new Error("Cannot start an audio recording without initializing a MediaRecorder.");
    },
  });
});
