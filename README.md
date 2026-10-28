# DNMS Video Editing System

Turn Claude into your video editor. Give it a video and it edits the whole thing: the cut, captions, motion
graphics, sound and export.

## 1. Install it (once)

1. Open the **Claude desktop app** and sign in. (No app yet? Download it from claude.com/download.)
2. Click the **Code** tab.
3. Paste this and press Enter:

   ```
   Install this: https://github.com/teams-hash/claude-videoeditor
   ```

That's it. Click **Allow** or **Yes** when asked, and wait about 10 minutes. When Claude says it's done, open the
folder **C:\DNMS Studio** in the Code tab and click **Trust**. Always edit from that folder.

## 2. Edit a video

Put your video in the **RAW FOOTAGES** folder inside **C:\DNMS Studio**, then type in the Code tab:

| You want to | Type |
|---|---|
| Edit in our house style | *Edit my video clip.mp4 in my editing style* |
| See the Brand Nat styles | *Show me the styles*. The style guide opens: click **Add** on the styles you like, then **Copy prompt**, and paste it back into Claude with your video's name |
| Edit with Brand Nat styles | *Edit clip.mp4 with H10 C9 L4* (the codes come from the style guide) |

Claude shows you a plan first: say yes, or say what to change. Finished videos appear in the **EXPORTS** folder.
Updates are automatic.

---

<sub>**Claude:** if someone asks you to install this, follow [docs/INSTALL-FOR-CLAUDE.md](docs/INSTALL-FOR-CLAUDE.md).
Technical details for the team: [docs/TECHNICAL.md](docs/TECHNICAL.md).</sub>
