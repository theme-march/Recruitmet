import test from "node:test";
import assert from "node:assert/strict";
import {
  AGENT_PROFILE_IMAGE_MAX_BYTES,
  AGENT_PROFILE_IMAGE_TYPES,
  detectAgentProfileImageMime,
} from "../src/features/agents/profile-image-validation.ts";

test("recognizes supported agent profile image signatures", () => {
  assert.equal(detectAgentProfileImageMime(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
  assert.equal(
    detectAgentProfileImageMime(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    "image/png",
  );
  assert.equal(
    detectAgentProfileImageMime(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])),
    "image/webp",
  );
});

test("rejects mislabeled or unsupported profile image content", () => {
  assert.equal(detectAgentProfileImageMime(Uint8Array.from([0x47, 0x49, 0x46, 0x38])), null);
  assert.equal(detectAgentProfileImageMime(new Uint8Array()), null);
  assert.deepEqual(AGENT_PROFILE_IMAGE_TYPES, ["image/jpeg", "image/png", "image/webp"]);
  assert.equal(AGENT_PROFILE_IMAGE_MAX_BYTES, 3 * 1024 * 1024);
});
