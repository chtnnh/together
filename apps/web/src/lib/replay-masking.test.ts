import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const component = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("rrweb replay component masking", () => {
  it("marks Together's rendered private content with rrweb mask and block classes", () => {
    const chat = component("../components/emoji-chat.tsx");
    const room = component("../components/room-client.tsx");
    const participants = component("../components/participants-panel.tsx");
    const settings = component("../components/room-settings.tsx");
    const account = component("../components/account-settings-modal.tsx");
    const signIn = component("../components/sign-in-modal.tsx");
    const playlists = component("../components/playlists-modal.tsx");
    const importDialog = component("../components/import-playlist-dialog.tsx");
    const joinGate = component("../components/join-gate.tsx");
    const home = component("../app/home-client.tsx");
    const toast = component("../components/toast.tsx");
    const queue = component("../../../../packages/ui/src/components/queue-list.tsx");

    expect(chat).toMatch(/senderName[\s\S]{0,300}rr-mask/);
    expect(chat).toMatch(/rr-mask[\s\S]{0,300}renderMessageBody/);
    expect(chat).toMatch(/joinNotice[\s\S]{0,300}rr-mask/);
    expect(chat).toMatch(/data-testid="chat-input"[\s\S]{0,2000}rr-mask/);
    expect(participants).toMatch(/rr-mask[\s\S]{0,300}p\.displayName/);
    expect(room).toMatch(/rr-mask[\s\S]{0,300}\{roomTitle\}/);
    expect(room).toMatch(/rr-mask[\s\S]{0,300}\{title\}/);
    expect(room).toMatch(
      /if \(!joined\)[\s\S]{0,800}rr-mask[\s\S]{0,100}\{localRoomTitle \|\| slug\}/,
    );
    expect(room).toMatch(/if \(!joined\)[\s\S]{0,800}id="name"[\s\S]{0,700}rr-mask/);
    expect(room).toMatch(/thumbnailUrl[\s\S]{0,300}rr-block/);
    expect(queue).toMatch(/rr-mask[\s\S]{0,300}\{item\.title\}/);
    expect(queue).toMatch(/item\.thumbnailUrl[\s\S]{0,300}rr-block/);
    expect(settings).toMatch(/titleDraft[\s\S]{0,500}rr-mask/);
    expect(account).toMatch(/rr-mask[\s\S]{0,300}\{user\.email\}/);
    expect(account).toMatch(/type="email"[\s\S]{0,700}rr-mask/);
    expect(signIn).toMatch(/type="email"[\s\S]{0,700}rr-mask/);
    expect(playlists).toMatch(/rr-mask[\s\S]{0,250}\{p\.name\}/);
    expect(importDialog).toMatch(/id="import-url"[\s\S]{0,700}rr-mask/);
    expect(joinGate).toMatch(/type="password"[\s\S]{0,700}rr-block/);
    expect(home).toMatch(/id="create-name"[\s\S]{0,700}rr-mask/);
    expect(home).toMatch(/id="room-title"[\s\S]{0,700}rr-mask/);
    expect(home).toMatch(/id="room-password"[\s\S]{0,700}rr-block/);
    expect(home).toMatch(/id="join-password"[\s\S]{0,700}rr-block/);
    expect(home).toMatch(/ownedRooms\.map[\s\S]{0,900}<Link[\s\S]{0,400}rr-mask/);
    expect(home).toMatch(/ownedRooms\.map[\s\S]{0,1200}rr-mask[\s\S]{0,300}\{room\.title\}/);
    expect(home).toMatch(/ownedRooms\.map[\s\S]{0,1400}rr-mask[\s\S]{0,300}\{room\.slug\}/);
    expect(home).toMatch(/recentRooms\.map[\s\S]{0,900}<Link[\s\S]{0,400}rr-mask/);
    expect(home).toMatch(/recentRooms\.map[\s\S]{0,1200}rr-mask[\s\S]{0,300}\{room\.title\}/);
    expect(home).toMatch(/recentRooms\.map[\s\S]{0,1400}rr-mask[\s\S]{0,300}\{room\.slug\}/);
    expect(home).toMatch(/publicRooms\.map[\s\S]{0,900}<Link[\s\S]{0,400}rr-mask/);
    expect(home).toMatch(/publicRooms\.map[\s\S]{0,1200}rr-mask[\s\S]{0,300}\{room\.title\}/);
    expect(toast).toMatch(/rr-mask[\s\S]{0,300}\{t\.message\}/);
    expect(queue).not.toContain("data-queue-item-id");
    expect(queue).toMatch(/data-queue-item-index/);
    expect(room).toMatch(/id="youtube-player"[\s\S]{0,200}rr-block/);
    expect(room).toMatch(
      /const sidebar = \([\s\S]{0,1000}ref=\{addUrlInputRef\}[\s\S]{0,700}rr-mask/,
    );
  });
});
