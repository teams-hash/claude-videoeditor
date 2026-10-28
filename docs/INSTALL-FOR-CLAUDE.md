# Installing the studio (instructions for Claude)

Someone gave you this repository's link and asked you to install it. They may not be technical: do every step
yourself, keep your messages to them short and plain, and don't show them commands unless something needs their
action. Follow these steps exactly.

1. **Git.** Run `git --version`. If it's missing on Windows, run
   `winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements`, then call
   it as `"C:\Program Files\Git\cmd\git.exe"` for the rest of this install (PATH updates only reach new windows). If
   `winget` is missing too, ask them to install Git from git-scm.com and tell you when it's done.
2. **Clone to a short path** (long paths break the Python setup on Windows):
   - Windows: `git clone https://github.com/teams-hash/claude-videoeditor.git "C:\DNMS Studio"`
   - macOS / Linux: `git clone https://github.com/teams-hash/claude-videoeditor.git ~/"DNMS Studio"`

   If that folder already holds a clone of this repo, run `git -C <folder> pull --ff-only` instead. If it holds
   anything else, ask them before touching it.
3. **Run setup as a background command** and wait for it to finish (5–15 minutes, longer than a normal command
   timeout):
   - Windows, from PowerShell: `& "C:\DNMS Studio\install.bat"`
   - Windows, from Git Bash: `cd "/c/DNMS Studio" && cmd.exe //c install.bat`
   - macOS / Linux: `cd ~/"DNMS Studio" && ./install.sh`

   Before it starts, tell them: *"This takes about 10 minutes. Windows may ask for permission a few times while it
   installs Node.js, Python and FFmpeg. Click Yes."* It's done when it prints `Studio ready`. If it prints FAIL
   lines, do what each line says (or see [INSTALL.md](INSTALL.md)) and run setup again. Finished steps are skipped.
   `npm run check` in the folder verifies the result.
4. **Don't edit any files in the clone, and don't start an edit from this session.** The studio's skills, commands,
   hooks and rules load only in a session opened in that folder, and this session wasn't.
5. **Finish with this message**, using the folder you cloned to:

   > Your video editor is installed. One last step: in the Claude app's **Code** tab, open the folder
   > **C:\DNMS Studio** and click **Trust**. (Editing only works in that folder.) Then put a video in its
   > **RAW FOOTAGES** folder and type: *Edit my video your-clip.mp4 in my editing style*. To see the Brand Nat
   > styles, type: *show me the styles*.
